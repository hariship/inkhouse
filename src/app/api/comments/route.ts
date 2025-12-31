import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'

// GET - Get comments for a post
export async function GET(request: NextRequest) {
  try {
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

    const { data: comments, error } = await supabase
      .from('comments')
      .select(`
        *,
        author:users!comments_author_id_fkey(id, username, display_name, avatar_url)
      `)
      .eq('post_id', postId)
      .eq('status', 'approved')
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Fetch comments error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch comments' },
        { status: 500 }
      )
    }

    // Organize into threads
    const rootComments = comments?.filter((c) => !c.parent_id) || []
    const replies = comments?.filter((c) => c.parent_id) || []

    const threaded = rootComments.map((comment) => ({
      ...comment,
      replies: replies.filter((r) => r.parent_id === comment.id),
    }))

    return NextResponse.json({
      success: true,
      data: threaded,
    })
  } catch (error) {
    console.error('Fetch comments error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Add a comment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { post_id, content, author_name, author_email, parent_id } = body

    if (!post_id || !content || !author_name) {
      return NextResponse.json(
        { success: false, error: 'Post ID, content, and author name are required' },
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

    // Check if post exists and allows comments
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('id, allow_comments')
      .eq('id', post_id)
      .eq('status', 'published')
      .single()

    if (postError || !post) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      )
    }

    if (!post.allow_comments) {
      return NextResponse.json(
        { success: false, error: 'Comments are disabled for this post' },
        { status: 403 }
      )
    }

    // Check if user is authenticated
    const authUser = await getAuthUser()

    // For authenticated users, get their display name
    let finalAuthorName = author_name
    if (authUser) {
      const { data: user } = await supabase
        .from('users')
        .select('display_name')
        .eq('id', authUser.userId)
        .single()
      finalAuthorName = user?.display_name || author_name
    }

    const { data: comment, error } = await supabase
      .from('comments')
      .insert({
        post_id,
        content,
        author_name: finalAuthorName,
        author_email: authUser ? null : author_email,
        author_id: authUser?.userId || null,
        parent_id: parent_id || null,
        status: 'approved', // Auto-approve for now
      })
      .select()
      .single()

    if (error) {
      console.error('Create comment error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to create comment' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: comment,
    })
  } catch (error) {
    console.error('Create comment error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
