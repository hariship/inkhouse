import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getApiUserFromRequest } from '@/lib/api-auth'
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rate-limit'
import { PublicApiResponse, PublicApiPost } from '@/types'

function apiError(
  code: string,
  message: string,
  status: number,
  headers?: Record<string, string>
): NextResponse<PublicApiResponse> {
  return NextResponse.json(
    { success: false, error: { code, message } },
    { status, headers }
  )
}

// GET - List user's posts
export async function GET(request: NextRequest) {
  try {
    // Validate API key
    const auth = await getApiUserFromRequest(request)
    if (auth.error) {
      return apiError('UNAUTHORIZED', auth.error, 401)
    }

    // Check rate limit
    const rateLimit = await checkRateLimit(auth.keyId!)
    if (!rateLimit.allowed) {
      return apiError(
        'RATE_LIMITED',
        'Rate limit exceeded. Try again later.',
        429,
        getRateLimitHeaders(rateLimit)
      )
    }

    const supabase = createServerClient()
    if (!supabase) {
      return apiError('SERVICE_UNAVAILABLE', 'Database not configured', 503)
    }

    // Parse query params
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10')))
    const status = searchParams.get('status')
    const offset = (page - 1) * limit

    // Build query
    let query = supabase
      .from('posts')
      .select('id, title, normalized_title, description, content, category, image_url, status, featured, allow_comments, pub_date, updated_at', { count: 'exact' })
      .eq('author_id', auth.userId)
      .order('updated_at', { ascending: false })

    if (status && ['draft', 'published', 'archived'].includes(status)) {
      query = query.eq('status', status)
    }

    const { data: posts, error, count } = await query.range(offset, offset + limit - 1)

    if (error) {
      console.error('Fetch posts error:', error)
      return apiError('INTERNAL_ERROR', 'Failed to fetch posts', 500)
    }

    // Transform to public API format
    const apiPosts: PublicApiPost[] = (posts || []).map((post) => ({
      id: post.id,
      title: post.title,
      slug: post.normalized_title,
      description: post.description,
      content: post.content,
      category: post.category,
      image_url: post.image_url,
      status: post.status,
      featured: post.featured,
      allow_comments: post.allow_comments,
      pub_date: post.pub_date,
      created_at: post.pub_date || post.updated_at,
      updated_at: post.updated_at,
    }))

    const response: PublicApiResponse<PublicApiPost[]> = {
      success: true,
      data: apiPosts,
      meta: {
        page,
        limit,
        total: count || 0,
        rate_limit: {
          limit: rateLimit.limit,
          remaining: rateLimit.remaining,
          reset: rateLimit.reset.toISOString(),
        },
      },
    }

    return NextResponse.json(response, {
      headers: getRateLimitHeaders(rateLimit),
    })
  } catch (error) {
    console.error('API v1 posts GET error:', error)
    return apiError('INTERNAL_ERROR', 'Internal server error', 500)
  }
}

// POST - Create new post
export async function POST(request: NextRequest) {
  try {
    // Validate API key
    const auth = await getApiUserFromRequest(request)
    if (auth.error) {
      return apiError('UNAUTHORIZED', auth.error, 401)
    }

    // Check rate limit
    const rateLimit = await checkRateLimit(auth.keyId!)
    if (!rateLimit.allowed) {
      return apiError(
        'RATE_LIMITED',
        'Rate limit exceeded. Try again later.',
        429,
        getRateLimitHeaders(rateLimit)
      )
    }

    const supabase = createServerClient()
    if (!supabase) {
      return apiError('SERVICE_UNAVAILABLE', 'Database not configured', 503)
    }

    const body = await request.json()
    const { title, content, description, category, image_url, status, featured, allow_comments } = body

    // Validation
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return apiError('VALIDATION_ERROR', 'Title is required', 400)
    }

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return apiError('VALIDATION_ERROR', 'Content is required', 400)
    }

    if (title.length > 200) {
      return apiError('VALIDATION_ERROR', 'Title must be 200 characters or less', 400)
    }

    const postStatus = status || 'draft'
    if (!['draft', 'published'].includes(postStatus)) {
      return apiError('VALIDATION_ERROR', 'Status must be draft or published', 400)
    }

    // Generate normalized title
    const normalizedTitle = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 100)

    // Check if normalized title exists
    const { data: existing } = await supabase
      .from('posts')
      .select('id')
      .eq('normalized_title', normalizedTitle)
      .single()

    const finalNormalizedTitle = existing
      ? `${normalizedTitle}-${Date.now()}`
      : normalizedTitle

    // Create post
    const { data: post, error } = await supabase
      .from('posts')
      .insert({
        title: title.trim(),
        normalized_title: finalNormalizedTitle,
        description: description || null,
        content,
        category: category || null,
        image_url: image_url || null,
        author_id: auth.userId,
        status: postStatus,
        featured: featured || false,
        allow_comments: allow_comments !== false,
        pub_date: postStatus === 'published' ? new Date().toISOString() : null,
      })
      .select('id, title, normalized_title, description, content, category, image_url, status, featured, allow_comments, pub_date, updated_at')
      .single()

    if (error) {
      console.error('Create post error:', error)
      return apiError('INTERNAL_ERROR', 'Failed to create post', 500)
    }

    const apiPost: PublicApiPost = {
      id: post.id,
      title: post.title,
      slug: post.normalized_title,
      description: post.description,
      content: post.content,
      category: post.category,
      image_url: post.image_url,
      status: post.status,
      featured: post.featured,
      allow_comments: post.allow_comments,
      pub_date: post.pub_date,
      created_at: post.pub_date || post.updated_at,
      updated_at: post.updated_at,
    }

    const response: PublicApiResponse<PublicApiPost> = {
      success: true,
      data: apiPost,
      meta: {
        rate_limit: {
          limit: rateLimit.limit,
          remaining: rateLimit.remaining,
          reset: rateLimit.reset.toISOString(),
        },
      },
    }

    return NextResponse.json(response, {
      status: 201,
      headers: getRateLimitHeaders(rateLimit),
    })
  } catch (error) {
    console.error('API v1 posts POST error:', error)
    return apiError('INTERNAL_ERROR', 'Internal server error', 500)
  }
}
