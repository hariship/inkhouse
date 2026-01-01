import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST - Toggle vote (add if not voted, remove if already voted)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Only writers can vote
    if (!['writer', 'admin', 'super_admin'].includes(authUser.role)) {
      return NextResponse.json({ success: false, error: 'Only writers can vote' }, { status: 403 })
    }

    const supabase = createServerClient()
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 503 })
    }

    // Check if suggestion exists and is open
    const { data: suggestion, error: fetchError } = await supabase
      .from('suggestions')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !suggestion) {
      return NextResponse.json({ success: false, error: 'Suggestion not found' }, { status: 404 })
    }

    if (suggestion.status !== 'open') {
      return NextResponse.json({ success: false, error: 'Cannot vote on closed suggestions' }, { status: 400 })
    }

    // Check if user has already voted
    const { data: existingVote } = await supabase
      .from('suggestion_votes')
      .select('id')
      .eq('suggestion_id', id)
      .eq('user_id', authUser.userId)
      .single()

    let hasVoted: boolean
    let newVoteCount: number

    if (existingVote) {
      // Remove vote
      const { error: deleteError } = await supabase
        .from('suggestion_votes')
        .delete()
        .eq('id', existingVote.id)

      if (deleteError) {
        console.error('Remove vote error:', deleteError)
        return NextResponse.json({ success: false, error: 'Failed to remove vote' }, { status: 500 })
      }

      // Decrement vote count
      newVoteCount = Math.max(0, suggestion.vote_count - 1)
      hasVoted = false
    } else {
      // Add vote
      const { error: insertError } = await supabase
        .from('suggestion_votes')
        .insert({
          suggestion_id: id,
          user_id: authUser.userId
        })

      if (insertError) {
        console.error('Add vote error:', insertError)
        return NextResponse.json({ success: false, error: 'Failed to add vote' }, { status: 500 })
      }

      // Increment vote count
      newVoteCount = suggestion.vote_count + 1
      hasVoted = true
    }

    // Update vote count on suggestion
    const { error: updateError } = await supabase
      .from('suggestions')
      .update({ vote_count: newVoteCount, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (updateError) {
      console.error('Update vote count error:', updateError)
    }

    // Get total writer count for threshold info
    const { count: writerCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .in('role', ['writer', 'admin', 'super_admin'])
      .eq('status', 'active')

    const threshold = Math.ceil((writerCount || 0) / 2)
    const thresholdReached = newVoteCount >= threshold

    // TODO: When GitHub integration is added, auto-create issue here if threshold reached
    // if (thresholdReached && !suggestion.github_issue_url) { ... }

    return NextResponse.json({
      success: true,
      data: {
        vote_count: newVoteCount,
        has_voted: hasVoted,
        threshold,
        threshold_reached: thresholdReached
      }
    })
  } catch (error) {
    console.error('Vote error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
