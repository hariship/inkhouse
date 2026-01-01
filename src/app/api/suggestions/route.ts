import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'

// GET - List all suggestions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'open'
    const sort = searchParams.get('sort') || 'votes' // 'votes' or 'recent'
    const filter = searchParams.get('filter') // 'mine' for user's own suggestions

    const supabase = createServerClient()
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 503 })
    }

    // Get current user if authenticated (for has_voted field)
    const authUser = await getAuthUser()

    // Build query
    let query = supabase
      .from('suggestions')
      .select(`
        *,
        author:users!suggestions_author_id_fkey(id, username, display_name, avatar_url)
      `)

    // Filter by status
    if (status === 'all') {
      // Show all except closed (for admins)
    } else if (status === 'shipped') {
      query = query.eq('status', 'shipped')
    } else {
      query = query.eq('status', 'open')
    }

    // Filter by author if 'mine'
    if (filter === 'mine' && authUser) {
      query = query.eq('author_id', authUser.userId)
    }

    // Sort
    if (sort === 'recent') {
      query = query.order('created_at', { ascending: false })
    } else {
      query = query.order('vote_count', { ascending: false }).order('created_at', { ascending: false })
    }

    const { data: suggestions, error } = await query

    if (error) {
      console.error('Fetch suggestions error:', error)
      return NextResponse.json({ success: false, error: 'Failed to fetch suggestions' }, { status: 500 })
    }

    // Get total writer count for threshold calculation
    const { count: writerCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .in('role', ['writer', 'admin', 'super_admin'])
      .eq('status', 'active')

    // Get user's votes if authenticated
    let userVotes: Set<string> = new Set()
    if (authUser) {
      const { data: votes } = await supabase
        .from('suggestion_votes')
        .select('suggestion_id')
        .eq('user_id', authUser.userId)

      if (votes) {
        userVotes = new Set(votes.map(v => v.suggestion_id))
      }
    }

    // Add has_voted field to each suggestion
    const suggestionsWithVotes = suggestions?.map(s => ({
      ...s,
      has_voted: userVotes.has(s.id)
    })) || []

    return NextResponse.json({
      success: true,
      data: suggestionsWithVotes,
      meta: {
        total_writers: writerCount || 0,
        threshold: Math.ceil((writerCount || 0) / 2)
      }
    })
  } catch (error) {
    console.error('Fetch suggestions error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create new suggestion
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Only writers can create suggestions
    if (!['writer', 'admin', 'super_admin'].includes(authUser.role)) {
      return NextResponse.json({ success: false, error: 'Only writers can submit suggestions' }, { status: 403 })
    }

    const body = await request.json()
    const { title, description } = body

    if (!title?.trim()) {
      return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 })
    }

    if (title.length > 200) {
      return NextResponse.json({ success: false, error: 'Title must be 200 characters or less' }, { status: 400 })
    }

    const supabase = createServerClient()
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 503 })
    }

    const { data: suggestion, error } = await supabase
      .from('suggestions')
      .insert({
        title: title.trim(),
        description: description?.trim() || null,
        author_id: authUser.userId,
        status: 'open',
        vote_count: 0
      })
      .select(`
        *,
        author:users!suggestions_author_id_fkey(id, username, display_name, avatar_url)
      `)
      .single()

    if (error) {
      console.error('Create suggestion error:', error)
      return NextResponse.json({ success: false, error: 'Failed to create suggestion' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: { ...suggestion, has_voted: false }
    })
  } catch (error) {
    console.error('Create suggestion error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
