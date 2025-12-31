import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// GET - List published desk posts (public)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
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

    const { data: posts, error, count } = await supabase
      .from('posts')
      .select(`
        *,
        author:users!posts_author_id_fkey(id, username, display_name, avatar_url, bio)
      `, { count: 'exact' })
      .eq('status', 'published')
      .eq('type', 'desk')
      .order('pub_date', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Fetch desk posts error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch desk posts' },
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

    // Cache public desk posts list for 60 seconds on Vercel edge
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
    return response
  } catch (error) {
    console.error('Fetch desk posts error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
