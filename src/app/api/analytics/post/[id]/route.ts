import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
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

    const supabase = createServerClient()
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 503 }
      )
    }

    // Get the post
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('id, title, normalized_title, author_id')
      .eq('id', postId)
      .single()

    if (postError || !post) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      )
    }

    // Only post author or admin can view analytics
    if (post.author_id !== authUser.userId && !['admin', 'super_admin'].includes(authUser.role)) {
      return NextResponse.json(
        { success: false, error: 'Not authorized' },
        { status: 403 }
      )
    }

    // Fetch all metrics in parallel
    const [
      { count: views },
      { count: reads },
      { count: boxAdditions },
      { count: bookmarks },
      { count: comments },
      { count: critiques },
    ] = await Promise.all([
      supabase
        .from('page_views')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId),
      supabase
        .from('post_reads')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId),
      supabase
        .from('reading_list_items')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId),
      supabase
        .from('bookmarks')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId),
      supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId)
        .eq('status', 'approved'),
      supabase
        .from('critiques')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId)
        .eq('status', 'active'),
    ])

    const analytics: PostAnalytics = {
      post_id: post.id,
      title: post.title,
      normalized_title: post.normalized_title,
      views: views || 0,
      reads: reads || 0,
      box_additions: boxAdditions || 0,
      bookmarks: bookmarks || 0,
      comments: comments || 0,
      critiques: critiques || 0,
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
