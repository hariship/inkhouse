import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users, membershipRequests } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { getAuthUser } from '@/lib/auth'

// GET - Check if current user has a pending membership request
export async function GET() {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const [user] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, authUser.userId))
      .limit(1)

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }

    const [request] = await db
      .select({
        id: membershipRequests.id,
        status: membershipRequests.status,
        created_at: membershipRequests.created_at,
      })
      .from(membershipRequests)
      .where(eq(membershipRequests.email, user.email))
      .orderBy(desc(membershipRequests.created_at))
      .limit(1)

    return NextResponse.json({
      success: true,
      data: request || null,
    })
  } catch (error) {
    console.error('Check request status error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
