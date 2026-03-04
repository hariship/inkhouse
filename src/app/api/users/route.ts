import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { ne, desc, count } from 'drizzle-orm'
import { getAuthUser, isAdmin } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser()
    if (!authUser || !isAdmin(authUser)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10')))
    const offset = (page - 1) * limit

    const [{ total }] = await db
      .select({ total: count() })
      .from(users)
      .where(ne(users.status, 'deleted'))

    const result = await db
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
        display_name: users.display_name,
        bio: users.bio,
        avatar_url: users.avatar_url,
        role: users.role,
        status: users.status,
        created_at: users.created_at,
        last_login_at: users.last_login_at,
      })
      .from(users)
      .where(ne(users.status, 'deleted'))
      .orderBy(desc(users.created_at))
      .limit(limit)
      .offset(offset)

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        page,
        limit,
        total: total || 0,
        totalPages: Math.ceil((total || 0) / limit),
      },
    })
  } catch (error) {
    console.error('Fetch users error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
