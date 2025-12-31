import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'

// GET - Get user preferences
export async function GET() {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = createServerClient()

    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 503 }
      )
    }

    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', authUser.userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "no rows returned" which is fine
      console.error('Get preferences error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to get preferences' },
        { status: 500 }
      )
    }

    // Return defaults if no preferences exist
    return NextResponse.json({
      success: true,
      data: data || {
        user_id: authUser.userId,
        view_mode: 'grid',
        default_sort: 'date',
        default_filter: 'unread',
      },
    })
  } catch (error) {
    console.error('Get preferences error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH - Update user preferences
export async function PATCH(request: NextRequest) {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { view_mode, default_sort, default_filter } = body

    // Validate input
    if (view_mode && !['grid', 'list'].includes(view_mode)) {
      return NextResponse.json(
        { success: false, error: 'Invalid view mode' },
        { status: 400 }
      )
    }

    if (default_sort && !['date', 'category'].includes(default_sort)) {
      return NextResponse.json(
        { success: false, error: 'Invalid sort option' },
        { status: 400 }
      )
    }

    if (default_filter && !['all', 'unread', 'read', 'saved'].includes(default_filter)) {
      return NextResponse.json(
        { success: false, error: 'Invalid filter option' },
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

    // Build update object
    const updateData: Record<string, unknown> = {}
    if (view_mode) updateData.view_mode = view_mode
    if (default_sort) updateData.default_sort = default_sort
    if (default_filter) updateData.default_filter = default_filter

    // Upsert preferences
    const { data, error } = await supabase
      .from('user_preferences')
      .upsert(
        {
          user_id: authUser.userId,
          ...updateData,
        },
        {
          onConflict: 'user_id',
        }
      )
      .select()
      .single()

    if (error) {
      console.error('Update preferences error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to update preferences' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error) {
    console.error('Update preferences error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
