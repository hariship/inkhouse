import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
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

    const supabase = createServerClient()
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 503 }
      )
    }

    // Get counts in parallel
    const [
      { count: totalUsers },
      { count: totalWriters },
      { count: totalReaders },
      { count: totalPosts },
      { count: totalViews },
      { data: topAuthorsData },
    ] = await Promise.all([
      supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active'),
      supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .in('role', ['writer', 'admin', 'super_admin']),
      supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .eq('role', 'reader'),
      supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'published'),
      supabase
        .from('page_views')
        .select('*', { count: 'exact', head: true }),
      // Get top authors by post count
      supabase
        .from('posts')
        .select(`
          id,
          author_id,
          author:users!posts_author_id_fkey(id, username, display_name, avatar_url)
        `)
        .eq('status', 'published'),
    ])

    // Calculate top authors
    const authorCounts: Record<string, { author: unknown; count: number }> = {}
    topAuthorsData?.forEach((post) => {
      const authorId = post.author_id
      if (!authorCounts[authorId]) {
        authorCounts[authorId] = { author: post.author, count: 0 }
      }
      authorCounts[authorId].count++
    })

    // Build top 10 authors and collect all their post IDs from data we already have
    const top10Entries = Object.entries(authorCounts)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 10)

    // Build a map of author → post IDs from topAuthorsData (already fetched)
    const authorPostIds: Record<string, number[]> = {}
    topAuthorsData?.forEach((post) => {
      const authorId = post.author_id
      if (!authorPostIds[authorId]) {
        authorPostIds[authorId] = []
      }
      authorPostIds[authorId].push(post.id)
    })

    // Collect all post IDs from top 10 authors into a single array
    const allTopAuthorPostIds = top10Entries.flatMap(
      ([authorId]) => authorPostIds[authorId] || []
    )

    // Single query: get view counts for all top authors' posts at once
    const viewCountsByAuthor: Record<string, number> = {}
    if (allTopAuthorPostIds.length > 0) {
      const { data: viewRows } = await supabase
        .from('page_views')
        .select('post_id')
        .in('post_id', allTopAuthorPostIds)

      // Group view counts by author
      const postToAuthor: Record<number, string> = {}
      for (const [authorId, postIds] of Object.entries(authorPostIds)) {
        for (const postId of postIds) {
          postToAuthor[postId] = authorId
        }
      }
      viewRows?.forEach((row) => {
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
      user_growth: [], // Could add time-series data later
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
