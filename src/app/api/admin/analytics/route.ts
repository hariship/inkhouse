import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users, posts, pageViews } from '@/lib/db/schema'
import { eq, and, count, inArray } from 'drizzle-orm'
import { getAuthUser, isAdmin } from '@/lib/auth'
import { AdminAnalytics } from '@/types'

// GET - Get platform-wide analytics (admin only)
export async function GET() {
  try {
    const authUser = await getAuthUser()
    if (!authUser || !isAdmin(authUser)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Get counts in parallel
    const [
      [{ total: totalUsers }],
      [{ total: totalWriters }],
      [{ total: totalReaders }],
      [{ total: totalPosts }],
      [{ total: totalViews }],
      publishedPosts,
    ] = await Promise.all([
      db.select({ total: count() }).from(users).where(eq(users.status, 'active')),
      db.select({ total: count() }).from(users).where(and(eq(users.status, 'active'), inArray(users.role, ['writer', 'admin', 'super_admin']))),
      db.select({ total: count() }).from(users).where(and(eq(users.status, 'active'), eq(users.role, 'reader'))),
      db.select({ total: count() }).from(posts).where(eq(posts.status, 'published')),
      db.select({ total: count() }).from(pageViews),
      // Get published posts with author info
      db.select({
        id: posts.id,
        author_id: posts.author_id,
        author: {
          id: users.id,
          username: users.username,
          display_name: users.display_name,
          avatar_url: users.avatar_url,
        },
      })
        .from(posts)
        .leftJoin(users, eq(posts.author_id, users.id))
        .where(eq(posts.status, 'published')),
    ])

    // Calculate top authors
    const authorCounts: Record<string, { author: unknown; count: number }> = {}
    publishedPosts.forEach((post) => {
      const authorId = post.author_id
      if (!authorCounts[authorId]) {
        authorCounts[authorId] = { author: post.author, count: 0 }
      }
      authorCounts[authorId].count++
    })

    // Build top 10 authors and collect all their post IDs
    const top10Entries = Object.entries(authorCounts)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 10)

    // Build a map of author → post IDs
    const authorPostIds: Record<string, number[]> = {}
    publishedPosts.forEach((post) => {
      const authorId = post.author_id
      if (!authorPostIds[authorId]) {
        authorPostIds[authorId] = []
      }
      authorPostIds[authorId].push(post.id)
    })

    // Collect all post IDs from top 10 authors
    const allTopAuthorPostIds = top10Entries.flatMap(
      ([authorId]) => authorPostIds[authorId] || []
    )

    // Single query: get view counts for all top authors' posts at once
    const viewCountsByAuthor: Record<string, number> = {}
    if (allTopAuthorPostIds.length > 0) {
      const viewRows = await db
        .select({ post_id: pageViews.post_id })
        .from(pageViews)
        .where(inArray(pageViews.post_id, allTopAuthorPostIds))

      // Group view counts by author
      const postToAuthor: Record<number, string> = {}
      for (const [authorId, postIds] of Object.entries(authorPostIds)) {
        for (const postId of postIds) {
          postToAuthor[postId] = authorId
        }
      }
      viewRows.forEach((row) => {
        const aid = postToAuthor[row.post_id]
        if (aid) {
          viewCountsByAuthor[aid] = (viewCountsByAuthor[aid] || 0) + 1
        }
      })
    }

    const topAuthors = top10Entries.map(([authorId, data]) => ({
      author: data.author,
      post_count: data.count,
      total_views: viewCountsByAuthor[authorId] || 0,
    }))

    const analytics: AdminAnalytics = {
      total_users: totalUsers || 0,
      total_writers: totalWriters || 0,
      total_readers: totalReaders || 0,
      total_posts: totalPosts || 0,
      total_views: totalViews || 0,
      user_growth: [],
      content_growth: [],
      top_authors: topAuthors as AdminAnalytics['top_authors'],
    }

    return NextResponse.json({ success: true, data: analytics })
  } catch (error) {
    console.error('Admin analytics error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
