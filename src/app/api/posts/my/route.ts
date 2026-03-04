import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { posts, users } from '@/lib/db/schema'
import { eq, and, or, isNull, desc } from 'drizzle-orm'
import { getAuthUser, isSuperAdmin } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'post'

    if (type === 'desk') {
      const [fullUser] = await db
        .select({ role: users.role, email: users.email })
        .from(users)
        .where(eq(users.id, authUser.userId))
        .limit(1)

      if (!isSuperAdmin(fullUser)) {
        return NextResponse.json(
          { success: false, error: 'Only super admin can access desk posts' },
          { status: 403 }
        )
      }
    }

    let result
    if (type === 'desk') {
      result = await db
        .select()
        .from(posts)
        .where(eq(posts.type, 'desk'))
        .orderBy(desc(posts.updated_at))
    } else {
      result = await db
        .select()
        .from(posts)
        .where(
          and(
            eq(posts.author_id, authUser.userId),
            or(eq(posts.type, 'post'), isNull(posts.type))
          )
        )
        .orderBy(desc(posts.updated_at))
    }

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('Fetch my posts error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
