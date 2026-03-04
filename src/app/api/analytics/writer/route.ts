import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { posts, pageViews, postReads, readingListItems, bookmarks, comments, critiques } from '@/lib/db/schema'
import { eq, and, count } from 'drizzle-orm'
import { getAuthUser } from '@/lib/auth'
import { PostAnalytics, WriterAnalytics } from '@/types'

// GET - Get analytics for the authenticated writer
export async function GET() {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get all published posts by this author
    const authorPosts = await db
      .select({
        id: posts.id,
        title: posts.title,
        normalized_title: posts.normalized_title,
      })
      .from(posts)
      .where(and(eq(posts.author_id, authUser.userId), eq(posts.status, 'published')))
      .orderBy(posts.pub_date)

    if (authorPosts.length === 0) {
      const emptyAnalytics: WriterAnalytics = {
        total_posts: 0,
        total_views: 0,
        total_reads: 0,
        total_box_additions: 0,
        total_bookmarks: 0,
        total_comments: 0,
        total_critiques: 0,
        posts: [],
      }
      return NextResponse.json({ success: true, data: emptyAnalytics })
    }

    // Helper to get count for a single post from a table
    const getPostCount = async (
      table: typeof pageViews | typeof postReads | typeof readingListItems | typeof bookmarks | typeof comments | typeof critiques,
      postId: number,
      extraFilter?: { column: typeof comments.status | typeof critiques.status; value: string }
    ): Promise<number> => {
      const conditions = [eq(table.post_id, postId)]
      if (extraFilter) {
        conditions.push(eq(extraFilter.column, extraFilter.value))
      }
      const [result] = await db
        .select({ total: count() })
        .from(table)
        .where(and(...conditions))
      return result?.total || 0
    }

    // Fetch per-post counts in parallel (6 counts per post, all posts in parallel)
    const postAnalyticsPromises = authorPosts.map(async (post) => {
      const [views, reads, box_additions, bookmarkCount, commentCount, critiqueCount] = await Promise.all([
        getPostCount(pageViews, post.id),
        getPostCount(postReads, post.id),
        getPostCount(readingListItems, post.id),
        getPostCount(bookmarks, post.id),
        getPostCount(comments, post.id, { column: comments.status, value: 'approved' }),
        getPostCount(critiques, post.id, { column: critiques.status, value: 'active' }),
      ])

      return {
        post_id: post.id,
        title: post.title,
        normalized_title: post.normalized_title,
        views,
        reads,
        box_additions,
        bookmarks: bookmarkCount,
        comments: commentCount,
        critiques: critiqueCount,
      }
    })

    const postAnalytics: PostAnalytics[] = await Promise.all(postAnalyticsPromises)

    const analytics: WriterAnalytics = {
      total_posts: authorPosts.length,
      total_views: postAnalytics.reduce((sum, p) => sum + p.views, 0),
      total_reads: postAnalytics.reduce((sum, p) => sum + p.reads, 0),
      total_box_additions: postAnalytics.reduce((sum, p) => sum + p.box_additions, 0),
      total_bookmarks: postAnalytics.reduce((sum, p) => sum + p.bookmarks, 0),
      total_comments: postAnalytics.reduce((sum, p) => sum + p.comments, 0),
      total_critiques: postAnalytics.reduce((sum, p) => sum + p.critiques, 0),
      posts: postAnalytics,
    }

    return NextResponse.json({ success: true, data: analytics })
  } catch (error) {
    console.error('Writer analytics error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
