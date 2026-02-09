import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
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

    const supabase = createServerClient()
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 503 }
      )
    }

    // Get all published posts by this author
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('id, title, normalized_title')
      .eq('author_id', authUser.userId)
      .eq('status', 'published')
      .order('pub_date', { ascending: false })

    if (postsError) {
      console.error('Fetch posts error:', postsError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch posts' },
        { status: 500 }
      )
    }

    if (!posts || posts.length === 0) {
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

    const postIds = posts.map((p) => p.id)

    // Helper to get count for a single post from a table
    const getCount = async (
      table: 'page_views' | 'post_reads' | 'reading_list_items' | 'bookmarks' | 'comments' | 'critiques',
      postId: number,
      extraFilter?: { column: string; value: string }
    ): Promise<number> => {
      let query = supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId)

      if (extraFilter) {
        query = query.eq(extraFilter.column, extraFilter.value)
      }

      const { count } = await query
      return count || 0
    }

    // Fetch per-post counts in parallel (6 counts per post, all posts in parallel)
    const postAnalyticsPromises = posts.map(async (post) => {
      const [views, reads, box_additions, bookmarks, comments, critiques] = await Promise.all([
        getCount('page_views', post.id),
        getCount('post_reads', post.id),
        getCount('reading_list_items', post.id),
        getCount('bookmarks', post.id),
        getCount('comments', post.id, { column: 'status', value: 'approved' }),
        getCount('critiques', post.id, { column: 'status', value: 'active' }),
      ])

      return {
        post_id: post.id,
        title: post.title,
        normalized_title: post.normalized_title,
        views,
        reads,
        box_additions,
        bookmarks,
        comments,
        critiques,
      }
    })

    const postAnalytics: PostAnalytics[] = await Promise.all(postAnalyticsPromises)

    const analytics: WriterAnalytics = {
      total_posts: posts.length,
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
