import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'

// GET - Get user's current draft
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

    const { data: draft, error } = await supabase
      .from('user_drafts')
      .select('*')
      .eq('user_id', authUser.userId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Fetch draft error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch draft' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: draft || null,
    })
  } catch (error) {
    console.error('Fetch draft error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Save/update user's draft
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { title, description, content, category, image_url, featured, allow_comments } = body

    const supabase = createServerClient()
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 503 }
      )
    }

    // Upsert draft (insert or update based on user_id)
    const { data: draft, error } = await supabase
      .from('user_drafts')
      .upsert({
        user_id: authUser.userId,
        title: title || '',
        description: description || '',
        content: content || '',
        category: category || '',
        image_url: image_url || '',
        featured: featured || false,
        allow_comments: allow_comments !== false,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      })
      .select()
      .single()

    if (error) {
      console.error('Save draft error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to save draft' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: draft,
    })
  } catch (error) {
    console.error('Save draft error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Clear user's draft (after successful publish)
export async function DELETE() {
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

    const { error } = await supabase
      .from('user_drafts')
      .delete()
      .eq('user_id', authUser.userId)

    if (error) {
      console.error('Delete draft error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to delete draft' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Draft deleted',
    })
  } catch (error) {
    console.error('Delete draft error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
