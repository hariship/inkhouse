import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { posts } from '@/lib/db/schema'
import { eq, and, count } from 'drizzle-orm'
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

    // Parse query params
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10')))
    const statusFilter = searchParams.get('status')
    const offset = (page - 1) * limit

    // Build conditions
    const conditions = [eq(posts.author_id, auth.userId!)]
    if (statusFilter && ['draft', 'published', 'archived'].includes(statusFilter)) {
      conditions.push(eq(posts.status, statusFilter))
    }

    const whereClause = and(...conditions)

    // Get count and data in parallel
    const [[{ total }], postRows] = await Promise.all([
      db.select({ total: count() }).from(posts).where(whereClause),
      db.select({
        id: posts.id,
        title: posts.title,
        normalized_title: posts.normalized_title,
        description: posts.description,
        content: posts.content,
        category: posts.category,
        image_url: posts.image_url,
        status: posts.status,
        featured: posts.featured,
        allow_comments: posts.allow_comments,
        pub_date: posts.pub_date,
        updated_at: posts.updated_at,
      })
        .from(posts)
        .where(whereClause)
        .orderBy(posts.updated_at)
        .offset(offset)
        .limit(limit),
    ])

    // Transform to public API format
    const apiPosts: PublicApiPost[] = postRows.map((post) => ({
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
      pub_date: post.pub_date?.toISOString(),
      created_at: post.pub_date?.toISOString() || post.updated_at?.toISOString(),
      updated_at: post.updated_at?.toISOString(),
    }))

    const response: PublicApiResponse<PublicApiPost[]> = {
      success: true,
      data: apiPosts,
      meta: {
        page,
        limit,
        total: total || 0,
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
    const [existing] = await db
      .select({ id: posts.id })
      .from(posts)
      .where(eq(posts.normalized_title, normalizedTitle))
      .limit(1)

    const finalNormalizedTitle = existing
      ? `${normalizedTitle}-${Date.now()}`
      : normalizedTitle

    // Create post
    const [post] = await db
      .insert(posts)
      .values({
        title: title.trim(),
        normalized_title: finalNormalizedTitle,
        description: description || null,
        content,
        category: category || null,
        image_url: image_url || null,
        author_id: auth.userId!,
        status: postStatus,
        featured: featured || false,
        allow_comments: allow_comments !== false,
        pub_date: postStatus === 'published' ? new Date() : null,
      })
      .returning()

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
      pub_date: post.pub_date?.toISOString(),
      created_at: post.pub_date?.toISOString() || post.updated_at?.toISOString(),
      updated_at: post.updated_at?.toISOString(),
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
