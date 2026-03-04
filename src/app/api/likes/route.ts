import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { likes } from '@/lib/db/schema'
import { eq, and, count } from 'drizzle-orm'
import { getAuthUser } from '@/lib/auth'
import crypto from 'crypto'

// POST - Toggle like on a post
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { post_id } = body

    if (!post_id) {
      return NextResponse.json(
        { success: false, error: 'Post ID is required' },
        { status: 400 }
      )
    }

    const authUser = await getAuthUser()

    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    const ipHash = crypto.createHash('md5').update(ip).digest('hex')

    // Check existing like
    const conditions = [eq(likes.post_id, post_id)]
    if (authUser) {
      conditions.push(eq(likes.user_id, authUser.userId))
    } else {
      conditions.push(eq(likes.ip_hash, ipHash))
    }

    const [existingLike] = await db
      .select({ id: likes.id })
      .from(likes)
      .where(and(...conditions))
      .limit(1)

    if (existingLike) {
      // Unlike
      await db.delete(likes).where(eq(likes.id, existingLike.id))

      const [{ total }] = await db
        .select({ total: count() })
        .from(likes)
        .where(eq(likes.post_id, post_id))

      return NextResponse.json({
        success: true,
        liked: false,
        count: total || 0,
      })
    } else {
      // Like
      await db.insert(likes).values({
        post_id,
        user_id: authUser?.userId || null,
        ip_hash: authUser ? null : ipHash,
      })

      const [{ total }] = await db
        .select({ total: count() })
        .from(likes)
        .where(eq(likes.post_id, post_id))

      return NextResponse.json({
        success: true,
        liked: true,
        count: total || 0,
      })
    }
  } catch (error) {
    console.error('Like error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET - Get like status and count
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const postId = searchParams.get('postId')

    if (!postId) {
      return NextResponse.json(
        { success: false, error: 'Post ID is required' },
        { status: 400 }
      )
    }

    const authUser = await getAuthUser()

    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    const ipHash = crypto.createHash('md5').update(ip).digest('hex')

    const [{ total }] = await db
      .select({ total: count() })
      .from(likes)
      .where(eq(likes.post_id, parseInt(postId)))

    // Check if user liked
    const conditions = [eq(likes.post_id, parseInt(postId))]
    if (authUser) {
      conditions.push(eq(likes.user_id, authUser.userId))
    } else {
      conditions.push(eq(likes.ip_hash, ipHash))
    }

    const [existingLike] = await db
      .select({ id: likes.id })
      .from(likes)
      .where(and(...conditions))
      .limit(1)

    return NextResponse.json({
      success: true,
      liked: !!existingLike,
      count: total || 0,
    })
  } catch (error) {
    console.error('Get like error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
