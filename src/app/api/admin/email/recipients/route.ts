import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { subscribers, users } from '@/lib/db/schema'
import { eq, and, count, inArray } from 'drizzle-orm'
import { getAuthUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    if (authUser.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'newsletter'

    let total = 0

    if (type === 'newsletter') {
      const [result] = await db
        .select({ total: count() })
        .from(subscribers)
        .where(eq(subscribers.status, 'active'))
      total = result?.total || 0
    } else if (type === 'announcement') {
      const [result] = await db
        .select({ total: count() })
        .from(users)
        .where(eq(users.status, 'active'))
      total = result?.total || 0
    } else if (type === 'writers') {
      const [result] = await db
        .select({ total: count() })
        .from(users)
        .where(and(eq(users.status, 'active'), inArray(users.role, ['writer', 'admin', 'super_admin'])))
      total = result?.total || 0
    } else if (type === 'readers') {
      const [result] = await db
        .select({ total: count() })
        .from(users)
        .where(and(eq(users.status, 'active'), eq(users.role, 'reader')))
      total = result?.total || 0
    }

    return NextResponse.json({
      success: true,
      data: { type, count: total },
    })
  } catch (error) {
    console.error('Get recipients error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
