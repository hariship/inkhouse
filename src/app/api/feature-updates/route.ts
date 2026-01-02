import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'

// GET - List all feature updates
export async function GET() {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
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

    const { data: updates, error } = await supabase
      .from('feature_updates')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Fetch feature updates error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch updates' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: updates || [],
    })
  } catch (error) {
    console.error('Feature updates error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create feature update (super_admin only)
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Only super_admin can create updates
    if (authUser.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'Only super admin can create feature updates' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { title, description, category } = body

    if (!title?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Title is required' },
        { status: 400 }
      )
    }

    if (!category || !['new', 'improved', 'fixed'].includes(category)) {
      return NextResponse.json(
        { success: false, error: 'Valid category is required (new, improved, fixed)' },
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

    const { data: update, error } = await supabase
      .from('feature_updates')
      .insert({
        title: title.trim(),
        description: description?.trim() || null,
        category,
        created_by: authUser.userId,
      })
      .select()
      .single()

    if (error) {
      console.error('Create feature update error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to create update' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: update,
    })
  } catch (error) {
    console.error('Create feature update error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
