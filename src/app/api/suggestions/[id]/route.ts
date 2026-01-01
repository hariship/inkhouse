import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getAuthUser, isSuperAdmin } from '@/lib/auth'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET - Get single suggestion
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const supabase = createServerClient()
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 503 })
    }

    const { data: suggestion, error } = await supabase
      .from('suggestions')
      .select(`
        *,
        author:users!suggestions_author_id_fkey(id, username, display_name, avatar_url)
      `)
      .eq('id', id)
      .single()

    if (error || !suggestion) {
      return NextResponse.json({ success: false, error: 'Suggestion not found' }, { status: 404 })
    }

    // Check if current user has voted
    const authUser = await getAuthUser()
    let hasVoted = false
    if (authUser) {
      const { data: vote } = await supabase
        .from('suggestion_votes')
        .select('id')
        .eq('suggestion_id', id)
        .eq('user_id', authUser.userId)
        .single()
      hasVoted = !!vote
    }

    return NextResponse.json({
      success: true,
      data: { ...suggestion, has_voted: hasVoted }
    })
  } catch (error) {
    console.error('Fetch suggestion error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Update suggestion (author or admin only)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServerClient()
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 503 })
    }

    // Get the suggestion first
    const { data: existing, error: fetchError } = await supabase
      .from('suggestions')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ success: false, error: 'Suggestion not found' }, { status: 404 })
    }

    // Check if user is admin
    const { data: fullUser } = await supabase
      .from('users')
      .select('role, email')
      .eq('id', authUser.userId)
      .single()

    const isAdmin = isSuperAdmin(fullUser) || fullUser?.role === 'admin'
    const isAuthor = existing.author_id === authUser.userId

    if (!isAuthor && !isAdmin) {
      return NextResponse.json({ success: false, error: 'Not authorized to update this suggestion' }, { status: 403 })
    }

    const body = await request.json()
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

    // Authors can update title and description (if no votes yet or within 24h)
    if (isAuthor && (body.title || body.description !== undefined)) {
      const hoursSinceCreation = (Date.now() - new Date(existing.created_at).getTime()) / (1000 * 60 * 60)
      if (existing.vote_count > 0 && hoursSinceCreation > 24) {
        return NextResponse.json({
          success: false,
          error: 'Cannot edit suggestion after receiving votes (or after 24 hours)'
        }, { status: 403 })
      }
      if (body.title) updates.title = body.title.trim()
      if (body.description !== undefined) updates.description = body.description?.trim() || null
    }

    // Admins can update status
    if (isAdmin && body.status) {
      if (!['open', 'shipped', 'closed'].includes(body.status)) {
        return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 })
      }
      updates.status = body.status
    }

    const { data: suggestion, error } = await supabase
      .from('suggestions')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        author:users!suggestions_author_id_fkey(id, username, display_name, avatar_url)
      `)
      .single()

    if (error) {
      console.error('Update suggestion error:', error)
      return NextResponse.json({ success: false, error: 'Failed to update suggestion' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: suggestion })
  } catch (error) {
    console.error('Update suggestion error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete suggestion (author or admin only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServerClient()
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 503 })
    }

    // Get the suggestion first
    const { data: existing, error: fetchError } = await supabase
      .from('suggestions')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ success: false, error: 'Suggestion not found' }, { status: 404 })
    }

    // Check if user is admin
    const { data: fullUser } = await supabase
      .from('users')
      .select('role, email')
      .eq('id', authUser.userId)
      .single()

    const isAdmin = isSuperAdmin(fullUser) || fullUser?.role === 'admin'
    const isAuthor = existing.author_id === authUser.userId

    if (!isAuthor && !isAdmin) {
      return NextResponse.json({ success: false, error: 'Not authorized to delete this suggestion' }, { status: 403 })
    }

    // Authors can only delete if no votes yet
    if (isAuthor && !isAdmin && existing.vote_count > 0) {
      return NextResponse.json({
        success: false,
        error: 'Cannot delete suggestion after receiving votes'
      }, { status: 403 })
    }

    const { error } = await supabase
      .from('suggestions')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Delete suggestion error:', error)
      return NextResponse.json({ success: false, error: 'Failed to delete suggestion' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Suggestion deleted' })
  } catch (error) {
    console.error('Delete suggestion error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
