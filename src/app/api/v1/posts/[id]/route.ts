import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { posts } from '@/lib/db/schema'
import { eq, and, ne } from 'drizzle-orm'
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

function toApiPost(post: Record<string, unknown>): PublicApiPost {
  return {
    id: post.id as number,
    title: post.title as string,
    slug: post.normalized_title as string,
    description: post.description as string | undefined,
    content: post.content as string,
    category: post.category as string | undefined,
    image_url: post.image_url as string | undefined,
    status: post.status as 'draft' | 'published' | 'archived',
    featured: post.featured as boolean,
    allow_comments: post.allow_comments as boolean,
    pub_date: post.pub_date instanceof Date ? post.pub_date.toISOString() : post.pub_date as string | undefined,
    created_at: (post.pub_date instanceof Date ? post.pub_date.toISOString() : post.pub_date || (post.updated_at instanceof Date ? post.updated_at.toISOString() : post.updated_at)) as string,
    updated_at: post.updated_at instanceof Date ? post.updated_at.toISOString() : post.updated_at as string,
  }
}

// GET - Get single post
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getApiUserFromRequest(request)
    if (auth.error) {
      return apiError('UNAUTHORIZED', auth.error, 401)
    }

    const rateLimit = await checkRateLimit(auth.keyId!)
    if (!rateLimit.allowed) {
      return apiError('RATE_LIMITED', 'Rate limit exceeded', 429, getRateLimitHeaders(rateLimit))
    }

    const { id } = await params
    const postId = parseInt(id)
    if (isNaN(postId)) {
      return apiError('VALIDATION_ERROR', 'Invalid post ID', 400)
    }

    const [post] = await db
      .select()
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1)

    if (!post) {
      return apiError('NOT_FOUND', 'Post not found', 404)
    }

    if (post.author_id !== auth.userId) {
      return apiError('FORBIDDEN', 'You do not have access to this post', 403)
    }

    const response: PublicApiResponse<PublicApiPost> = {
      success: true,
      data: toApiPost(post as unknown as Record<string, unknown>),
      meta: {
        rate_limit: {
          limit: rateLimit.limit,
          remaining: rateLimit.remaining,
          reset: rateLimit.reset.toISOString(),
        },
      },
    }

    return NextResponse.json(response, { headers: getRateLimitHeaders(rateLimit) })
  } catch (error) {
    console.error('API v1 posts GET error:', error)
    return apiError('INTERNAL_ERROR', 'Internal server error', 500)
  }
}

// PATCH - Update post
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getApiUserFromRequest(request)
    if (auth.error) {
      return apiError('UNAUTHORIZED', auth.error, 401)
    }

    const rateLimit = await checkRateLimit(auth.keyId!)
    if (!rateLimit.allowed) {
      return apiError('RATE_LIMITED', 'Rate limit exceeded', 429, getRateLimitHeaders(rateLimit))
    }

    const { id } = await params
    const postId = parseInt(id)
    if (isNaN(postId)) {
      return apiError('VALIDATION_ERROR', 'Invalid post ID', 400)
    }

    // Check ownership
    const [existingPost] = await db
      .select({ id: posts.id, author_id: posts.author_id, status: posts.status, normalized_title: posts.normalized_title })
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1)

    if (!existingPost) {
      return apiError('NOT_FOUND', 'Post not found', 404)
    }

    if (existingPost.author_id !== auth.userId) {
      return apiError('FORBIDDEN', 'You do not have access to this post', 403)
    }

    const body = await request.json()
    const { title, content, description, category, image_url, status, featured, allow_comments } = body

    // Build update object
    const updateData: Record<string, unknown> = {}

    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim().length === 0) {
        return apiError('VALIDATION_ERROR', 'Title cannot be empty', 400)
      }
      if (title.length > 200) {
        return apiError('VALIDATION_ERROR', 'Title must be 200 characters or less', 400)
      }
      updateData.title = title.trim()

      // Update normalized title if title changed
      const normalizedTitle = title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 100)

      const [existing] = await db
        .select({ id: posts.id })
        .from(posts)
        .where(and(eq(posts.normalized_title, normalizedTitle), ne(posts.id, postId)))
        .limit(1)

      updateData.normalized_title = existing
        ? `${normalizedTitle}-${Date.now()}`
        : normalizedTitle
    }

    if (content !== undefined) {
      if (typeof content !== 'string' || content.trim().length === 0) {
        return apiError('VALIDATION_ERROR', 'Content cannot be empty', 400)
      }
      updateData.content = content
    }

    if (description !== undefined) updateData.description = description || null
    if (category !== undefined) updateData.category = category || null
    if (image_url !== undefined) updateData.image_url = image_url || null
    if (featured !== undefined) updateData.featured = Boolean(featured)
    if (allow_comments !== undefined) updateData.allow_comments = Boolean(allow_comments)

    if (status !== undefined) {
      if (!['draft', 'published', 'archived'].includes(status)) {
        return apiError('VALIDATION_ERROR', 'Status must be draft, published, or archived', 400)
      }
      updateData.status = status

      // Set pub_date when first published
      if (status === 'published' && existingPost.status !== 'published') {
        updateData.pub_date = new Date()
      }
    }

    if (Object.keys(updateData).length === 0) {
      return apiError('VALIDATION_ERROR', 'No fields to update', 400)
    }

    const [post] = await db
      .update(posts)
      .set(updateData)
      .where(eq(posts.id, postId))
      .returning()

    const response: PublicApiResponse<PublicApiPost> = {
      success: true,
      data: toApiPost(post as unknown as Record<string, unknown>),
      meta: {
        rate_limit: {
          limit: rateLimit.limit,
          remaining: rateLimit.remaining,
          reset: rateLimit.reset.toISOString(),
        },
      },
    }

    return NextResponse.json(response, { headers: getRateLimitHeaders(rateLimit) })
  } catch (error) {
    console.error('API v1 posts PATCH error:', error)
    return apiError('INTERNAL_ERROR', 'Internal server error', 500)
  }
}

// DELETE - Delete post
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getApiUserFromRequest(request)
    if (auth.error) {
      return apiError('UNAUTHORIZED', auth.error, 401)
    }

    const rateLimit = await checkRateLimit(auth.keyId!)
    if (!rateLimit.allowed) {
      return apiError('RATE_LIMITED', 'Rate limit exceeded', 429, getRateLimitHeaders(rateLimit))
    }

    const { id } = await params
    const postId = parseInt(id)
    if (isNaN(postId)) {
      return apiError('VALIDATION_ERROR', 'Invalid post ID', 400)
    }

    // Check ownership
    const [existingPost] = await db
      .select({ id: posts.id, author_id: posts.author_id })
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1)

    if (!existingPost) {
      return apiError('NOT_FOUND', 'Post not found', 404)
    }

    if (existingPost.author_id !== auth.userId) {
      return apiError('FORBIDDEN', 'You do not have access to this post', 403)
    }

    await db
      .delete(posts)
      .where(eq(posts.id, postId))

    const response: PublicApiResponse = {
      success: true,
      meta: {
        rate_limit: {
          limit: rateLimit.limit,
          remaining: rateLimit.remaining,
          reset: rateLimit.reset.toISOString(),
        },
      },
    }

    return NextResponse.json(response, { headers: getRateLimitHeaders(rateLimit) })
  } catch (error) {
    console.error('API v1 posts DELETE error:', error)
    return apiError('INTERNAL_ERROR', 'Internal server error', 500)
  }
}
