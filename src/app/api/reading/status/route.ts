import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'

// GET - Get read status for a post (or multiple posts)
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
    const postIds = searchParams.get('postIds') // comma-separated for bulk

    const supabase = createServerClient()

    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 503 }
      )
    }

    if (postId) {
      // Single post status
      const { data } = await supabase
        .from('post_reads')
        .select('id, read_at')
        .eq('user_id', authUser.userId)
        .eq('post_id', parseInt(postId))
        .single()

      return NextResponse.json({
        success: true,
        data: {
          isRead: !!data,
          readAt: data?.read_at || null,
        },
      })
    }

    if (postIds) {
      // Bulk status check
      const ids = postIds.split(',').map((id) => parseInt(id.trim()))
      const { data } = await supabase
        .from('post_reads')
        .select('post_id, read_at')
        .eq('user_id', authUser.userId)
        .in('post_id', ids)

      const readMap: Record<number, string> = {}
      data?.forEach((item) => {
        readMap[item.post_id] = item.read_at
      })

      return NextResponse.json({
        success: true,
        data: readMap,
      })
    }

    // Return all read posts for user
    const { data } = await supabase
      .from('post_reads')
      .select('post_id, read_at')
      .eq('user_id', authUser.userId)
      .order('read_at', { ascending: false })

    return NextResponse.json({
      success: true,
      data: data || [],
    })
  } catch (error) {
    console.error('Get read status error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Mark post as read
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
      .from('post_reads')
      .upsert(
        {
          user_id: authUser.userId,
          post_id: post_id,
          read_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,post_id',
        }
      )

    if (error) {
      console.error('Mark as read error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to mark as read' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Post marked as read',
    })
  } catch (error) {
    console.error('Mark as read error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Mark post as unread
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
      .from('post_reads')
      .delete()
      .eq('user_id', authUser.userId)
      .eq('post_id', parseInt(postId))

    if (error) {
      console.error('Mark as unread error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to mark as unread' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Post marked as unread',
    })
  } catch (error) {
    console.error('Mark as unread error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
