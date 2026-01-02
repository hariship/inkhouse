import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { sendNewCritiqueNotification } from '@/lib/email'

// GET - Get critiques for a post (only visible to post author)
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
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

    const supabase = createServerClient()
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 503 }
      )
    }

    // Get the post and verify user is the author
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('id, author_id, title')
      .eq('id', postId)
      .single()

    if (postError || !post) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      )
    }

    // Only post author can view critiques
    if (post.author_id !== authUser.userId) {
      return NextResponse.json(
        { success: false, error: 'Only the post author can view critiques' },
        { status: 403 }
      )
    }

    // Fetch critiques with author info
    const { data: critiques, error } = await supabase
      .from('critiques')
      .select(`
        *,
        author:users!critiques_author_id_fkey(id, username, display_name, avatar_url)
      `)
      .eq('post_id', postId)
      .eq('status', 'active')
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Fetch critiques error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch critiques' },
        { status: 500 }
      )
    }

    // Organize into threads
    const rootCritiques = critiques?.filter((c) => !c.parent_id) || []
    const replies = critiques?.filter((c) => c.parent_id) || []

    const threaded = rootCritiques.map((critique) => ({
      ...critique,
      replies: replies.filter((r) => r.parent_id === critique.id),
    }))

    return NextResponse.json({
      success: true,
      data: threaded,
    })
  } catch (error) {
    console.error('Fetch critiques error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create a critique (writers only, cannot critique own posts)
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Only writers/admins can leave critiques
    if (!['writer', 'admin', 'super_admin'].includes(authUser.role)) {
      return NextResponse.json(
        { success: false, error: 'Only writers can leave critiques' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { post_id, content, parent_id } = body

    if (!post_id || !content) {
      return NextResponse.json(
        { success: false, error: 'Post ID and content are required' },
        { status: 400 }
      )
    }

    if (content.trim().length < 10) {
      return NextResponse.json(
        { success: false, error: 'Critique must be at least 10 characters' },
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

    // Get post and author info
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select(`
        id,
        title,
        normalized_title,
        author_id,
        author:users!posts_author_id_fkey(id, email, display_name)
      `)
      .eq('id', post_id)
      .eq('status', 'published')
      .single()

    if (postError || !post) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      )
    }

    // Cannot critique your own post
    if (post.author_id === authUser.userId) {
      return NextResponse.json(
        { success: false, error: 'You cannot critique your own post' },
        { status: 403 }
      )
    }

    // Get critiquer's name for notification
    const { data: critiquer } = await supabase
      .from('users')
      .select('display_name')
      .eq('id', authUser.userId)
      .single()

    // If replying, verify parent critique exists and belongs to this post
    if (parent_id) {
      const { data: parentCritique } = await supabase
        .from('critiques')
        .select('id, post_id')
        .eq('id', parent_id)
        .eq('status', 'active')
        .single()

      if (!parentCritique || parentCritique.post_id !== post_id) {
        return NextResponse.json(
          { success: false, error: 'Invalid parent critique' },
          { status: 400 }
        )
      }
    }

    // Create the critique
    const { data: critique, error } = await supabase
      .from('critiques')
      .insert({
        post_id,
        author_id: authUser.userId,
        content: content.trim(),
        parent_id: parent_id || null,
        status: 'active',
      })
      .select(`
        *,
        author:users!critiques_author_id_fkey(id, username, display_name, avatar_url)
      `)
      .single()

    if (error) {
      console.error('Create critique error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to create critique' },
        { status: 500 }
      )
    }

    // Send email notification to post author (non-blocking)
    // Only notify for new critiques, not replies
    if (!parent_id && post.author) {
      // Supabase joins may return array or object depending on relation type
      const authorData = Array.isArray(post.author) ? post.author[0] : post.author
      if (authorData?.email) {
        sendNewCritiqueNotification({
          to: authorData.email,
          authorName: authorData.display_name,
          postTitle: post.title,
          postSlug: post.normalized_title,
          critiquerName: critiquer?.display_name || authUser.username,
        }).catch((err) => console.error('Failed to send critique notification:', err))
      }
    }

    return NextResponse.json({
      success: true,
      data: critique,
    })
  } catch (error) {
    console.error('Create critique error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
