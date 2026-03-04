import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { postReads } from '@/lib/db/schema'
import { eq, and, inArray, desc } from 'drizzle-orm'
import { getAuthUser } from '@/lib/auth'

// GET - Get read status for a post (or multiple posts)
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const postId = searchParams.get('postId')
    const postIds = searchParams.get('postIds')

    if (postId) {
      const [data] = await db
        .select({ id: postReads.id, read_at: postReads.read_at })
        .from(postReads)
        .where(and(eq(postReads.user_id, authUser.userId), eq(postReads.post_id, parseInt(postId))))
        .limit(1)

      return NextResponse.json({
        success: true,
        data: {
          isRead: !!data,
          readAt: data?.read_at || null,
        },
      })
    }

    if (postIds) {
      const ids = postIds.split(',').map((id) => parseInt(id.trim()))
      const data = await db
        .select({ post_id: postReads.post_id, read_at: postReads.read_at })
        .from(postReads)
        .where(and(eq(postReads.user_id, authUser.userId), inArray(postReads.post_id, ids)))

      const readMap: Record<number, string> = {}
      data.forEach((item) => {
        readMap[item.post_id] = item.read_at?.toISOString() || ''
      })

      return NextResponse.json({
        success: true,
        data: readMap,
      })
    }

    // Return all read posts for user
    const data = await db
      .select({ post_id: postReads.post_id, read_at: postReads.read_at })
      .from(postReads)
      .where(eq(postReads.user_id, authUser.userId))
      .orderBy(desc(postReads.read_at))

    return NextResponse.json({
      success: true,
      data: data || [],
    })
  } catch (error) {
    console.error('Get read status error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Mark post as read
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { post_id } = await request.json()

    if (!post_id) {
      return NextResponse.json(
        { success: false, error: 'Post ID is required' },
        { status: 400 }
      )
    }

    await db
      .insert(postReads)
      .values({
        user_id: authUser.userId,
        post_id: post_id,
        read_at: new Date(),
      })
      .onConflictDoNothing()

    return NextResponse.json({
      success: true,
      message: 'Post marked as read',
    })
  } catch (error) {
    console.error('Mark as read error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Mark post as unread
export async function DELETE(request: NextRequest) {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const postId = searchParams.get('postId')

    if (!postId) {
      return NextResponse.json(
        { success: false, error: 'Post ID is required' },
        { status: 400 }
      )
    }

    await db
      .delete(postReads)
      .where(and(eq(postReads.user_id, authUser.userId), eq(postReads.post_id, parseInt(postId))))

    return NextResponse.json({
      success: true,
      message: 'Post marked as unread',
    })
  } catch (error) {
    console.error('Mark as unread error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
