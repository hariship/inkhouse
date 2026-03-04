import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { bookmarks, posts, users } from '@/lib/db/schema'
import { eq, and, inArray, desc } from 'drizzle-orm'
import { getAuthUser } from '@/lib/auth'

// GET - Get user's bookmarks
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
        .select({ id: bookmarks.id, created_at: bookmarks.created_at })
        .from(bookmarks)
        .where(and(eq(bookmarks.user_id, authUser.userId), eq(bookmarks.post_id, parseInt(postId))))
        .limit(1)

      return NextResponse.json({
        success: true,
        data: {
          isBookmarked: !!data,
          createdAt: data?.created_at || null,
        },
      })
    }

    if (postIds) {
      const ids = postIds.split(',').map((id) => parseInt(id.trim()))
      const data = await db
        .select({ post_id: bookmarks.post_id, created_at: bookmarks.created_at })
        .from(bookmarks)
        .where(and(eq(bookmarks.user_id, authUser.userId), inArray(bookmarks.post_id, ids)))

      const bookmarkMap: Record<number, string> = {}
      data.forEach((item) => {
        bookmarkMap[item.post_id] = item.created_at?.toISOString() || ''
      })

      return NextResponse.json({
        success: true,
        data: bookmarkMap,
      })
    }

    // Return all bookmarked posts with post details
    const data = await db
      .select({
        id: bookmarks.id,
        post_id: bookmarks.post_id,
        created_at: bookmarks.created_at,
        post: {
          id: posts.id,
          title: posts.title,
          normalized_title: posts.normalized_title,
          description: posts.description,
          image_url: posts.image_url,
          category: posts.category,
          pub_date: posts.pub_date,
          author_id: posts.author_id,
        },
      })
      .from(bookmarks)
      .leftJoin(posts, eq(bookmarks.post_id, posts.id))
      .where(eq(bookmarks.user_id, authUser.userId))
      .orderBy(desc(bookmarks.created_at))

    return NextResponse.json({
      success: true,
      data: data || [],
    })
  } catch (error) {
    console.error('Get bookmarks error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Add bookmark
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
      .insert(bookmarks)
      .values({
        user_id: authUser.userId,
        post_id: post_id,
      })
      .onConflictDoNothing()

    return NextResponse.json({
      success: true,
      message: 'Bookmark added',
    })
  } catch (error) {
    console.error('Add bookmark error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Remove bookmark
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
      .delete(bookmarks)
      .where(and(eq(bookmarks.user_id, authUser.userId), eq(bookmarks.post_id, parseInt(postId))))

    return NextResponse.json({
      success: true,
      message: 'Bookmark removed',
    })
  } catch (error) {
    console.error('Remove bookmark error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
