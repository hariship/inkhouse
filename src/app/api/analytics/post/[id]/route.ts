import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { posts, pageViews, postReads, readingListItems, bookmarks, comments, critiques } from '@/lib/db/schema'
import { eq, and, count } from 'drizzle-orm'
import { getAuthUser } from '@/lib/auth'
import { PostAnalytics } from '@/types'

// GET - Get detailed analytics for a specific post
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { id } = await params
    const postId = parseInt(id, 10)

    if (isNaN(postId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid post ID' },
        { status: 400 }
      )
    }

    const [post] = await db
      .select({ id: posts.id, title: posts.title, normalized_title: posts.normalized_title, author_id: posts.author_id })
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1)

    if (!post) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      )
    }

    if (post.author_id !== authUser.userId && !['admin', 'super_admin'].includes(authUser.role)) {
      return NextResponse.json(
        { success: false, error: 'Not authorized' },
        { status: 403 }
      )
    }

    const [
      [{ total: views }],
      [{ total: reads }],
      [{ total: boxAdditions }],
      [{ total: bookmarkCount }],
      [{ total: commentCount }],
      [{ total: critiqueCount }],
    ] = await Promise.all([
      db.select({ total: count() }).from(pageViews).where(eq(pageViews.post_id, postId)),
      db.select({ total: count() }).from(postReads).where(eq(postReads.post_id, postId)),
      db.select({ total: count() }).from(readingListItems).where(eq(readingListItems.post_id, postId)),
      db.select({ total: count() }).from(bookmarks).where(eq(bookmarks.post_id, postId)),
      db.select({ total: count() }).from(comments).where(and(eq(comments.post_id, postId), eq(comments.status, 'approved'))),
      db.select({ total: count() }).from(critiques).where(and(eq(critiques.post_id, postId), eq(critiques.status, 'active'))),
    ])

    const analytics: PostAnalytics = {
      post_id: post.id,
      title: post.title,
      normalized_title: post.normalized_title,
      views: views || 0,
      reads: reads || 0,
      box_additions: boxAdditions || 0,
      bookmarks: bookmarkCount || 0,
      comments: commentCount || 0,
      critiques: critiqueCount || 0,
    }

    return NextResponse.json({ success: true, data: analytics })
  } catch (error) {
    console.error('Post analytics error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
