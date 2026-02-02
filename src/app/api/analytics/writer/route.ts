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

    // Try RPC for server-side counting (single query instead of 6)
    let postAnalytics: PostAnalytics[]
    let analytics: WriterAnalytics

    const { data: rpcData, error: rpcError } = await supabase
      .rpc('get_writer_post_stats', { author_uuid: authUser.userId })

    if (!rpcError && rpcData) {
      // RPC succeeded — build analytics from server-side counts
      const statsMap: Record<number, {
        views: number; reads: number; box_additions: number;
        bookmarks: number; comments: number; critiques: number
      }> = {}
      for (const row of rpcData as Array<{
        post_id: number; views: number; reads: number;
        box_additions: number; bookmarks: number; comments: number; critiques: number
      }>) {
        statsMap[row.post_id] = row
      }

      postAnalytics = posts.map((post) => {
        const s = statsMap[post.id]
        return {
          post_id: post.id,
          title: post.title,
          normalized_title: post.normalized_title,
          views: s?.views || 0,
          reads: s?.reads || 0,
          box_additions: s?.box_additions || 0,
          bookmarks: s?.bookmarks || 0,
          comments: s?.comments || 0,
          critiques: s?.critiques || 0,
        }
      })

      analytics = {
        total_posts: posts.length,
        total_views: postAnalytics.reduce((sum, p) => sum + p.views, 0),
        total_reads: postAnalytics.reduce((sum, p) => sum + p.reads, 0),
        total_box_additions: postAnalytics.reduce((sum, p) => sum + p.box_additions, 0),
        total_bookmarks: postAnalytics.reduce((sum, p) => sum + p.bookmarks, 0),
        total_comments: postAnalytics.reduce((sum, p) => sum + p.comments, 0),
        total_critiques: postAnalytics.reduce((sum, p) => sum + p.critiques, 0),
        posts: postAnalytics,
      }
    } else {
      // Fallback: fetch counts via individual queries (for backwards compat before RPC is deployed)
      const [
        { data: viewsData },
        { data: readsData },
        { data: boxData },
        { data: bookmarksData },
        { data: commentsData },
        { data: critiquesData },
      ] = await Promise.all([
        supabase.from('page_views').select('post_id').in('post_id', postIds),
        supabase.from('post_reads').select('post_id').in('post_id', postIds),
        supabase.from('reading_list_items').select('post_id').in('post_id', postIds),
        supabase.from('bookmarks').select('post_id').in('post_id', postIds),
        supabase.from('comments').select('post_id').in('post_id', postIds).eq('status', 'approved'),
        supabase.from('critiques').select('post_id').in('post_id', postIds).eq('status', 'active'),
      ])

      const countByPost = (data: { post_id: number }[] | null, postId: number) =>
        data?.filter((d) => d.post_id === postId).length || 0

      postAnalytics = posts.map((post) => ({
        post_id: post.id,
        title: post.title,
        normalized_title: post.normalized_title,
        views: countByPost(viewsData, post.id),
        reads: countByPost(readsData, post.id),
        box_additions: countByPost(boxData, post.id),
        bookmarks: countByPost(bookmarksData, post.id),
        comments: countByPost(commentsData, post.id),
        critiques: countByPost(critiquesData, post.id),
      }))

      analytics = {
        total_posts: posts.length,
        total_views: viewsData?.length || 0,
        total_reads: readsData?.length || 0,
        total_box_additions: boxData?.length || 0,
        total_bookmarks: bookmarksData?.length || 0,
        total_comments: commentsData?.length || 0,
        total_critiques: critiquesData?.length || 0,
        posts: postAnalytics,
      }
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
