import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'

// GET - Get user's reading lists
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

    // Get lists with item count
    const { data: lists, error } = await supabase
      .from('reading_lists')
      .select(`
        *,
        items:reading_list_items(count)
      `)
      .eq('user_id', authUser.userId)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Get reading lists error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to get reading lists' },
        { status: 500 }
      )
    }

    // Transform to include item_count
    const listsWithCount = lists?.map((list) => ({
      ...list,
      item_count: list.items?.[0]?.count || 0,
      items: undefined,
    }))

    return NextResponse.json({
      success: true,
      data: listsWithCount || [],
    })
  } catch (error) {
    console.error('Get reading lists error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create new reading list
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { name, description } = await request.json()

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
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

    const { data: list, error } = await supabase
      .from('reading_lists')
      .insert({
        user_id: authUser.userId,
        name: name.trim(),
        description: description?.trim() || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Create reading list error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to create reading list' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { ...list, item_count: 0 },
    })
  } catch (error) {
    console.error('Create reading list error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
