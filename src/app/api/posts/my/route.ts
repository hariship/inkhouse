import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getAuthUser, isSuperAdmin } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'post'

    const supabase = createServerClient()

    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 503 }
      )
    }

    // For desk posts, verify super admin
    if (type === 'desk') {
      const { data: fullUser } = await supabase
        .from('users')
        .select('role, email')
        .eq('id', authUser.userId)
        .single()

      if (!isSuperAdmin(fullUser)) {
        return NextResponse.json(
          { success: false, error: 'Only super admin can access desk posts' },
          { status: 403 }
        )
      }
    }

    let query = supabase
      .from('posts')
      .select('*')
      .order('updated_at', { ascending: false })

    // Regular posts: filter by author, desk posts: all (super admin only)
    if (type === 'post') {
      query = query.eq('author_id', authUser.userId)
    }

    // Try with type filter, fall back without it if column doesn't exist
    let posts
    let error

    if (type === 'desk') {
      // For desk posts, must have type column
      const result = await query.eq('type', 'desk')
      posts = result.data
      error = result.error
    } else {
      // For regular posts, try type filter first
      const result = await query.or('type.eq.post,type.is.null')
      posts = result.data
      error = result.error

      // If error (column doesn't exist), retry without type filter
      if (error) {
        const fallback = await supabase
          .from('posts')
          .select('*')
          .eq('author_id', authUser.userId)
          .order('updated_at', { ascending: false })
        posts = fallback.data
        error = fallback.error
      }
    }

    if (error) {
      console.error('Fetch my posts error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch posts' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: posts,
    })
  } catch (error) {
    console.error('Fetch my posts error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
