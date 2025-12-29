import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params
    const supabase = createServerClient()

    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 503 }
      )
    }

    // Get author
    const { data: author, error: authorError } = await supabase
      .from('users')
      .select('id, username, display_name, bio, avatar_url, website_url, social_links, created_at')
      .eq('username', username)
      .eq('status', 'active')
      .single()

    if (authorError || !author) {
      return NextResponse.json(
        { success: false, error: 'Author not found' },
        { status: 404 }
      )
    }

    // Get author's published posts
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('*')
      .eq('author_id', author.id)
      .eq('status', 'published')
      .order('pub_date', { ascending: false })

    if (postsError) {
      console.error('Fetch posts error:', postsError)
    }

    return NextResponse.json({
      success: true,
      data: {
        author,
        posts: posts || [],
      },
    })
  } catch (error) {
    console.error('Fetch author error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
