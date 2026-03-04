import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { suggestions, users, suggestionVotes } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { getAuthUser, isSuperAdmin } from '@/lib/auth'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET - Get single suggestion
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const [suggestion] = await db
      .select({
        id: suggestions.id,
        title: suggestions.title,
        description: suggestions.description,
        author_id: suggestions.author_id,
        status: suggestions.status,
        vote_count: suggestions.vote_count,
        github_issue_url: suggestions.github_issue_url,
        created_at: suggestions.created_at,
        updated_at: suggestions.updated_at,
        author: {
          id: users.id,
          username: users.username,
          display_name: users.display_name,
          avatar_url: users.avatar_url,
        },
      })
      .from(suggestions)
      .leftJoin(users, eq(suggestions.author_id, users.id))
      .where(eq(suggestions.id, id))
      .limit(1)

    if (!suggestion) {
      return NextResponse.json({ success: false, error: 'Suggestion not found' }, { status: 404 })
    }

    const authUser = await getAuthUser()
    let hasVoted = false
    if (authUser) {
      const [vote] = await db
        .select({ id: suggestionVotes.id })
        .from(suggestionVotes)
        .where(and(eq(suggestionVotes.suggestion_id, id), eq(suggestionVotes.user_id, authUser.userId)))
        .limit(1)
      hasVoted = !!vote
    }

    return NextResponse.json({
      success: true,
      data: { ...suggestion, has_voted: hasVoted },
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

    const [existing] = await db
      .select()
      .from(suggestions)
      .where(eq(suggestions.id, id))
      .limit(1)

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Suggestion not found' }, { status: 404 })
    }

    const [fullUser] = await db
      .select({ role: users.role, email: users.email })
      .from(users)
      .where(eq(users.id, authUser.userId))
      .limit(1)

    const isAdminUser = isSuperAdmin(fullUser) || fullUser?.role === 'admin'
    const isAuthor = existing.author_id === authUser.userId

    if (!isAuthor && !isAdminUser) {
      return NextResponse.json({ success: false, error: 'Not authorized to update this suggestion' }, { status: 403 })
    }

    const body = await request.json()
    const updates: Record<string, unknown> = { updated_at: new Date() }

    if (isAuthor && (body.title || body.description !== undefined)) {
      const hoursSinceCreation = (Date.now() - new Date(existing.created_at!).getTime()) / (1000 * 60 * 60)
      if ((existing.vote_count ?? 0) > 0 && hoursSinceCreation > 24) {
        return NextResponse.json({
          success: false,
          error: 'Cannot edit suggestion after receiving votes (or after 24 hours)',
        }, { status: 403 })
      }
      if (body.title) updates.title = body.title.trim()
      if (body.description !== undefined) updates.description = body.description?.trim() || null
    }

    if (isAdminUser && body.status) {
      if (!['open', 'shipped', 'closed'].includes(body.status)) {
        return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 })
      }
      updates.status = body.status
    }

    const [suggestion] = await db
      .update(suggestions)
      .set(updates)
      .where(eq(suggestions.id, id))
      .returning()

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

    const [existing] = await db
      .select()
      .from(suggestions)
      .where(eq(suggestions.id, id))
      .limit(1)

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Suggestion not found' }, { status: 404 })
    }

    const [fullUser] = await db
      .select({ role: users.role, email: users.email })
      .from(users)
      .where(eq(users.id, authUser.userId))
      .limit(1)

    const isAdminUser = isSuperAdmin(fullUser) || fullUser?.role === 'admin'
    const isAuthor = existing.author_id === authUser.userId

    if (!isAuthor && !isAdminUser) {
      return NextResponse.json({ success: false, error: 'Not authorized to delete this suggestion' }, { status: 403 })
    }

    if (isAuthor && !isAdminUser && (existing.vote_count ?? 0) > 0) {
      return NextResponse.json({
        success: false,
        error: 'Cannot delete suggestion after receiving votes',
      }, { status: 403 })
    }

    await db.delete(suggestions).where(eq(suggestions.id, id))

    return NextResponse.json({ success: true, message: 'Suggestion deleted' })
  } catch (error) {
    console.error('Delete suggestion error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
