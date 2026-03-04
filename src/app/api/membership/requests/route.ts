import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { membershipRequests } from '@/lib/db/schema'
import { eq, desc, count } from 'drizzle-orm'
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
    const status = searchParams.get('status') || 'pending'
    const countOnly = searchParams.get('count_only') === 'true'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    const [{ total }] = await db
      .select({ total: count() })
      .from(membershipRequests)
      .where(eq(membershipRequests.status, status))

    if (countOnly) {
      return NextResponse.json({
        success: true,
        count: total || 0,
      })
    }

    const requests = await db
      .select()
      .from(membershipRequests)
      .where(eq(membershipRequests.status, status))
      .orderBy(desc(membershipRequests.created_at))
      .limit(limit)
      .offset(offset)

    return NextResponse.json({
      success: true,
      data: requests,
      pagination: {
        page,
        limit,
        total: total || 0,
        totalPages: Math.ceil((total || 0) / limit),
      },
    })
  } catch (error) {
    console.error('Fetch requests error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
