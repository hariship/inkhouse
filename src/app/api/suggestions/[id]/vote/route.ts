import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { suggestions, suggestionVotes, users } from '@/lib/db/schema'
import { eq, and, inArray, count } from 'drizzle-orm'
import { getAuthUser } from '@/lib/auth'

interface RouteParams {
  params: Promise<{ id: string }>
}

// POST - Toggle vote
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    if (!['writer', 'admin', 'super_admin'].includes(authUser.role)) {
      return NextResponse.json({ success: false, error: 'Only writers can vote' }, { status: 403 })
    }

    const [suggestion] = await db
      .select()
      .from(suggestions)
      .where(eq(suggestions.id, id))
      .limit(1)

    if (!suggestion) {
      return NextResponse.json({ success: false, error: 'Suggestion not found' }, { status: 404 })
    }

    if (suggestion.status !== 'open') {
      return NextResponse.json({ success: false, error: 'Cannot vote on closed suggestions' }, { status: 400 })
    }

    const [existingVote] = await db
      .select({ id: suggestionVotes.id })
      .from(suggestionVotes)
      .where(and(eq(suggestionVotes.suggestion_id, id), eq(suggestionVotes.user_id, authUser.userId)))
      .limit(1)

    let hasVoted: boolean
    let newVoteCount: number

    if (existingVote) {
      await db.delete(suggestionVotes).where(eq(suggestionVotes.id, existingVote.id))
      newVoteCount = Math.max(0, (suggestion.vote_count ?? 0) - 1)
      hasVoted = false
    } else {
      await db.insert(suggestionVotes).values({
        suggestion_id: id,
        user_id: authUser.userId,
      })
      newVoteCount = (suggestion.vote_count ?? 0) + 1
      hasVoted = true
    }

    await db
      .update(suggestions)
      .set({ vote_count: newVoteCount, updated_at: new Date() })
      .where(eq(suggestions.id, id))

    const [{ total: writerCount }] = await db
      .select({ total: count() })
      .from(users)
      .where(
        and(
          inArray(users.role, ['writer', 'admin', 'super_admin']),
          eq(users.status, 'active')
        )
      )

    const threshold = Math.ceil((writerCount || 0) / 2)
    const thresholdReached = newVoteCount >= threshold

    return NextResponse.json({
      success: true,
      data: {
        vote_count: newVoteCount,
        has_voted: hasVoted,
        threshold,
        threshold_reached: thresholdReached,
      },
    })
  } catch (error) {
    console.error('Vote error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
