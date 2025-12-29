import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'

// GET - List published posts (public)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const category = searchParams.get('category')
    const author = searchParams.get('author')
    const search = searchParams.get('search')
    const offset = (page - 1) * limit

    const supabase = createServerClient()

    if (!supabase) {
      return NextResponse.json({
        success: true,
        data: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
        message: 'Database not configured'
      })
    }

    let query = supabase
      .from('posts')
      .select(`
        *,
        author:users!posts_author_id_fkey(id, username, display_name, avatar_url, bio)
      `, { count: 'exact' })
      .eq('status', 'published')
      .order('pub_date', { ascending: false })

    if (category) {
      query = query.eq('category', category)
    }

    if (author) {
      query = query.eq('author_id', author)
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
    }

    const { data: posts, error, count } = await query.range(offset, offset + limit - 1)

    if (error) {
      console.error('Fetch posts error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch posts' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: posts,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error('Fetch posts error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create new post (authenticated)
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { title, description, content, category, image_url, status, featured, allow_comments } = body

    if (!title || !content) {
      return NextResponse.json(
        { success: false, error: 'Title and content are required' },
        { status: 400 }
      )
    }

    // Generate normalized title
    const normalizedTitle = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 100)

    const supabase = createServerClient()

    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 503 }
      )
    }

    // Check if normalized title already exists
    const { data: existing } = await supabase
      .from('posts')
      .select('id')
      .eq('normalized_title', normalizedTitle)
      .single()

    const finalNormalizedTitle = existing
      ? `${normalizedTitle}-${Date.now()}`
      : normalizedTitle

    const { data: post, error } = await supabase
      .from('posts')
      .insert({
        title,
        normalized_title: finalNormalizedTitle,
        description: description || null,
        content,
        category: category || null,
        image_url: image_url || null,
        author_id: authUser.userId,
        status: status || 'draft',
        featured: featured || false,
        allow_comments: allow_comments !== false,
        pub_date: status === 'published' ? new Date().toISOString() : null,
      })
      .select()
      .single()

    if (error) {
      console.error('Create post error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to create post' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: post,
    })
  } catch (error) {
    console.error('Create post error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
