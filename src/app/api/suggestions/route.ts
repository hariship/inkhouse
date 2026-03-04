import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { suggestions, users, suggestionVotes } from '@/lib/db/schema'
import { eq, and, desc, inArray, count } from 'drizzle-orm'
import { getAuthUser } from '@/lib/auth'

// GET - List all suggestions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'open'
    const sort = searchParams.get('sort') || 'votes'
    const filter = searchParams.get('filter')

    const authUser = await getAuthUser()

    // Build conditions
    const conditions = []
    if (status !== 'all') {
      conditions.push(eq(suggestions.status, status === 'shipped' ? 'shipped' : 'open'))
    }
    if (filter === 'mine' && authUser) {
      conditions.push(eq(suggestions.author_id, authUser.userId))
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const result = await db
      .select({
        id: suggestions.id,
        title: suggestions.title,
        description: suggestions.description,
        author_id: suggestions.author_id,
        status: suggestions.status,
        vote_count: suggestions.vote_count,
        github_issue_url: suggestions.github_issue_url,
        github_issue_created_at: suggestions.github_issue_created_at,
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
      .where(whereClause)
      .orderBy(
        sort === 'recent'
          ? desc(suggestions.created_at)
          : desc(suggestions.vote_count)
      )

    // Get total writer count
    const [{ total: writerCount }] = await db
      .select({ total: count() })
      .from(users)
      .where(
        and(
          inArray(users.role, ['writer', 'admin', 'super_admin']),
          eq(users.status, 'active')
        )
      )

    // Get user's votes if authenticated
    let userVotes: Set<string> = new Set()
    if (authUser) {
      const votes = await db
        .select({ suggestion_id: suggestionVotes.suggestion_id })
        .from(suggestionVotes)
        .where(eq(suggestionVotes.user_id, authUser.userId))

      userVotes = new Set(votes.map(v => v.suggestion_id))
    }

    const suggestionsWithVotes = result.map(s => ({
      ...s,
      has_voted: userVotes.has(s.id),
    }))

    return NextResponse.json({
      success: true,
      data: suggestionsWithVotes,
      meta: {
        total_writers: writerCount || 0,
        threshold: Math.ceil((writerCount || 0) / 2),
      },
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

    const [suggestion] = await db
      .insert(suggestions)
      .values({
        title: title.trim(),
        description: description?.trim() || null,
        author_id: authUser.userId,
        status: 'open',
        vote_count: 0,
      })
      .returning()

    return NextResponse.json({
      success: true,
      data: { ...suggestion, has_voted: false },
    })
  } catch (error) {
    console.error('Create suggestion error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
