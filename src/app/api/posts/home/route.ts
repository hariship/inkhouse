import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'

// GET - Get posts for homepage with user's preferences and read statuses applied
// This combines auth check, preferences, posts, and read statuses in ONE call
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10')))
    const category = searchParams.get('category')
    const search = searchParams.get('search')?.trim()
    const offset = (page - 1) * limit

    const supabase = createServerClient()

    if (!supabase) {
      return NextResponse.json({
        success: true,
        data: {
          posts: [],
          preferences: null,
          readStatuses: {},
          isAuthenticated: false,
        },
        pagination: { page, limit, total: 0, totalPages: 0 },
      })
    }

    // Check auth from cookie
    const authUser = await getAuthUser()
    const isAuthenticated = !!authUser

    // Get user preferences if authenticated
    let preferences = null
    let readStatuses: Record<number, string> = {}
    let defaultFilter = 'all'

    if (isAuthenticated && authUser) {
      // Fetch preferences
      const { data: prefsData } = await supabase
        .from('user_preferences')
        .select('view_mode, default_sort, default_filter')
        .eq('user_id', authUser.userId)
        .single()

      preferences = prefsData || {
        view_mode: 'grid',
        default_sort: 'date',
        default_filter: 'unread',
      }
      defaultFilter = preferences.default_filter || 'unread'

      // Fetch ALL read post IDs for this user (for filtering)
      const { data: readData } = await supabase
        .from('post_reads')
        .select('post_id, read_at')
        .eq('user_id', authUser.userId)

      if (readData) {
        readData.forEach((item) => {
          readStatuses[item.post_id] = item.read_at
        })
      }
    }

    // Build base query for posts
    let query = supabase
      .from('posts')
      .select(`
        *,
        author:users!posts_author_id_fkey(id, username, display_name, avatar_url, bio)
      `, { count: 'exact' })
      .eq('status', 'published')
      .or('type.eq.post,type.is.null')
      .order('pub_date', { ascending: false })

    if (category) {
      query = query.eq('category', category)
    }

    if (search) {
      const { data: matchingAuthors } = await supabase
        .from('users')
        .select('id')
        .or(`display_name.ilike.%${search}%,username.ilike.%${search}%`)

      const authorIds = matchingAuthors?.map(a => a.id) || []
      let searchFilter = `title.ilike.%${search}%,description.ilike.%${search}%,category.ilike.%${search}%`

      if (authorIds.length > 0) {
        const authorFilters = authorIds.map(id => `author_id.eq.${id}`).join(',')
        searchFilter += `,${authorFilters}`
      }

      query = query.or(searchFilter)
    }

    // For server-side filtering, we need to:
    // 1. If filter is 'all' - just paginate normally
    // 2. If filter is 'read' or 'unread' - we need to filter by read status

    // For read/unread filters, we'll fetch more posts and filter in memory
    // This is simpler than complex SQL joins for now
    let posts = []
    let totalCount = 0

    if (isAuthenticated && defaultFilter !== 'all') {
      // Fetch all posts (up to a reasonable limit) for filtering
      const { data: allPosts, count } = await query.range(0, 99) // Get up to 100 posts

      if (allPosts) {
        // Filter based on read status
        const filteredPosts = allPosts.filter(post => {
          const isRead = !!readStatuses[post.id]
          if (defaultFilter === 'unread') return !isRead
          if (defaultFilter === 'read') return isRead
          return true
        })

        totalCount = filteredPosts.length
        posts = filteredPosts.slice(offset, offset + limit)
      }
    } else {
      // No filter or not authenticated - just paginate normally
      const { data, count, error } = await query.range(offset, offset + limit - 1)

      if (error) {
        // Fallback without type filter
        const fallback = await supabase
          .from('posts')
          .select(`
            *,
            author:users!posts_author_id_fkey(id, username, display_name, avatar_url, bio)
          `, { count: 'exact' })
          .eq('status', 'published')
          .order('pub_date', { ascending: false })
          .range(offset, offset + limit - 1)

        posts = fallback.data || []
        totalCount = fallback.count || 0
      } else {
        posts = data || []
        totalCount = count || 0
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        posts,
        preferences,
        readStatuses,
        isAuthenticated,
      },
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    })
  } catch (error) {
    console.error('Fetch home posts error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
