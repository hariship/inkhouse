import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'

// GET - Get user's bookmarks
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
    const postId = searchParams.get('postId')
    const postIds = searchParams.get('postIds') // comma-separated for bulk check

    const supabase = createServerClient()

    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 503 }
      )
    }

    if (postId) {
      // Check single post bookmark status
      const { data } = await supabase
        .from('bookmarks')
        .select('id, created_at')
        .eq('user_id', authUser.userId)
        .eq('post_id', parseInt(postId))
        .single()

      return NextResponse.json({
        success: true,
        data: {
          isBookmarked: !!data,
          createdAt: data?.created_at || null,
        },
      })
    }

    if (postIds) {
      // Bulk bookmark status check
      const ids = postIds.split(',').map((id) => parseInt(id.trim()))
      const { data } = await supabase
        .from('bookmarks')
        .select('post_id, created_at')
        .eq('user_id', authUser.userId)
        .in('post_id', ids)

      const bookmarkMap: Record<number, string> = {}
      data?.forEach((item) => {
        bookmarkMap[item.post_id] = item.created_at
      })

      return NextResponse.json({
        success: true,
        data: bookmarkMap,
      })
    }

    // Return all bookmarked posts with post details
    const { data, error } = await supabase
      .from('bookmarks')
      .select(`
        id,
        post_id,
        created_at,
        post:posts!bookmarks_post_id_fkey(
          id,
          title,
          normalized_title,
          description,
          image_url,
          category,
          pub_date,
          author:users!posts_author_id_fkey(id, username, display_name, avatar_url)
        )
      `)
      .eq('user_id', authUser.userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Get bookmarks error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to get bookmarks' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data || [],
    })
  } catch (error) {
    console.error('Get bookmarks error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Add bookmark
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { post_id } = await request.json()

    if (!post_id) {
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

    // Upsert to handle duplicates gracefully
    const { error } = await supabase
      .from('bookmarks')
      .upsert(
        {
          user_id: authUser.userId,
          post_id: post_id,
        },
        {
          onConflict: 'user_id,post_id',
        }
      )

    if (error) {
      console.error('Add bookmark error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to add bookmark' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Bookmark added',
    })
  } catch (error) {
    console.error('Add bookmark error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Remove bookmark
export async function DELETE(request: NextRequest) {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
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

    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('user_id', authUser.userId)
      .eq('post_id', parseInt(postId))

    if (error) {
      console.error('Remove bookmark error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to remove bookmark' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Bookmark removed',
    })
  } catch (error) {
    console.error('Remove bookmark error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
