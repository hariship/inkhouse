import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getAuthUser, isSuperAdmin } from '@/lib/auth'
import { sendNewPostNotification } from '@/lib/email'

// GET - List published posts (public)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10'))) // Max 50 per page
    const category = searchParams.get('category')
    const author = searchParams.get('author')
    const search = searchParams.get('search')?.trim()
    const type = searchParams.get('type') || 'post' // Default to 'post', exclude 'desk'
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
      // First, find authors matching the search term
      const { data: matchingAuthors } = await supabase
        .from('users')
        .select('id')
        .or(`display_name.ilike.%${search}%,username.ilike.%${search}%`)

      const authorIds = matchingAuthors?.map(a => a.id) || []

      // Build search filter: title, description, category, or matching authors
      let searchFilter = `title.ilike.%${search}%,description.ilike.%${search}%,category.ilike.%${search}%`

      if (authorIds.length > 0) {
        const authorFilters = authorIds.map(id => `author_id.eq.${id}`).join(',')
        searchFilter += `,${authorFilters}`
      }

      query = query.or(searchFilter)
    }

    // Apply type filter with fallback for missing column
    let posts, error, count
    if (type === 'desk') {
      const result = await query.eq('type', 'desk').range(offset, offset + limit - 1)
      posts = result.data
      error = result.error
      count = result.count
    } else {
      // Try with type filter first
      const result = await query.or('type.eq.post,type.is.null').range(offset, offset + limit - 1)
      posts = result.data
      error = result.error
      count = result.count

      // If error (column doesn't exist), retry without type filter
      if (error) {
        const fallback = await supabase
          .from('posts')
          .select(`
            *,
            author:users!posts_author_id_fkey(id, username, display_name, avatar_url, bio)
          `, { count: 'exact' })
          .eq('status', 'published')
          .order('pub_date', { ascending: false })
          .range(offset, offset + limit - 1)
        posts = fallback.data
        error = fallback.error
        count = fallback.count
      }
    }

    if (error) {
      console.error('Fetch posts error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch posts' },
        { status: 500 }
      )
    }

    const response = NextResponse.json({
      success: true,
      data: posts,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })

    // Cache public posts list for 60 seconds on Vercel edge
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
    return response
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
    const { title, description, content, category, image_url, status, featured, allow_comments, type } = body

    if (!title || !content) {
      return NextResponse.json(
        { success: false, error: 'Title and content are required' },
        { status: 400 }
      )
    }

    // Only super_admin can create desk posts
    const postType = type || 'post'
    if (postType === 'desk') {
      const supabaseForUser = createServerClient()
      if (supabaseForUser) {
        const { data: fullUser } = await supabaseForUser
          .from('users')
          .select('role, email')
          .eq('id', authUser.userId)
          .single()

        if (!isSuperAdmin(fullUser)) {
          return NextResponse.json(
            { success: false, error: 'Only super admin can create desk posts' },
            { status: 403 }
          )
        }
      }
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
        type: postType,
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

    // Send notification if post is published
    if (status === 'published') {
      const { data: author } = await supabase
        .from('users')
        .select('display_name, username')
        .eq('id', authUser.userId)
        .single()

      if (author) {
        sendNewPostNotification({
          postTitle: title,
          postSlug: post.normalized_title,
          authorName: author.display_name,
          authorUsername: author.username,
        }).catch(err => console.error('Failed to send post notification:', err))
      }
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
