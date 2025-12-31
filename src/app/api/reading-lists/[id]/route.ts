import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'

// GET - Get a single reading list with items
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params

    const supabase = createServerClient()

    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 503 }
      )
    }

    // Get list with items and post details
    const { data: list, error } = await supabase
      .from('reading_lists')
      .select(`
        *,
        items:reading_list_items(
          id,
          post_id,
          added_at,
          post:posts!reading_list_items_post_id_fkey(
            id,
            title,
            normalized_title,
            description,
            image_url,
            category,
            pub_date,
            author:users!posts_author_id_fkey(id, username, display_name, avatar_url)
          )
        )
      `)
      .eq('id', id)
      .eq('user_id', authUser.userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Reading list not found' },
          { status: 404 }
        )
      }
      console.error('Get reading list error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to get reading list' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        ...list,
        item_count: list.items?.length || 0,
      },
    })
  } catch (error) {
    console.error('Get reading list error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH - Update reading list
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { name, description } = body

    const supabase = createServerClient()

    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 503 }
      )
    }

    // Build update object
    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name.trim()
    if (description !== undefined) updateData.description = description?.trim() || null

    const { data: list, error } = await supabase
      .from('reading_lists')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', authUser.userId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Reading list not found' },
          { status: 404 }
        )
      }
      console.error('Update reading list error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to update reading list' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: list,
    })
  } catch (error) {
    console.error('Update reading list error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete reading list
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params

    const supabase = createServerClient()

    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 503 }
      )
    }

    const { error } = await supabase
      .from('reading_lists')
      .delete()
      .eq('id', id)
      .eq('user_id', authUser.userId)

    if (error) {
      console.error('Delete reading list error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to delete reading list' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Reading list deleted',
    })
  } catch (error) {
    console.error('Delete reading list error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
