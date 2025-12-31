import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'

// POST - Add post to reading list
export async function POST(
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

    const { id: listId } = await params
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

    // Verify list belongs to user
    const { data: list } = await supabase
      .from('reading_lists')
      .select('id')
      .eq('id', listId)
      .eq('user_id', authUser.userId)
      .single()

    if (!list) {
      return NextResponse.json(
        { success: false, error: 'Reading list not found' },
        { status: 404 }
      )
    }

    // Add item (upsert to handle duplicates)
    const { error } = await supabase
      .from('reading_list_items')
      .upsert(
        {
          list_id: listId,
          post_id: post_id,
        },
        {
          onConflict: 'list_id,post_id',
        }
      )

    if (error) {
      console.error('Add to reading list error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to add to reading list' },
        { status: 500 }
      )
    }

    // Update list's updated_at
    await supabase
      .from('reading_lists')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', listId)

    return NextResponse.json({
      success: true,
      message: 'Added to reading list',
    })
  } catch (error) {
    console.error('Add to reading list error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Remove post from reading list
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

    const { id: listId } = await params
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

    // Verify list belongs to user
    const { data: list } = await supabase
      .from('reading_lists')
      .select('id')
      .eq('id', listId)
      .eq('user_id', authUser.userId)
      .single()

    if (!list) {
      return NextResponse.json(
        { success: false, error: 'Reading list not found' },
        { status: 404 }
      )
    }

    // Remove item
    const { error } = await supabase
      .from('reading_list_items')
      .delete()
      .eq('list_id', listId)
      .eq('post_id', parseInt(postId))

    if (error) {
      console.error('Remove from reading list error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to remove from reading list' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Removed from reading list',
    })
  } catch (error) {
    console.error('Remove from reading list error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
