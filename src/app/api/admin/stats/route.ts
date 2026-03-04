import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users, posts, membershipRequests, subscribers } from '@/lib/db/schema'
import { eq, count } from 'drizzle-orm'
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

    // Get counts in parallel
    const [
      [{ total: totalUsers }],
      [{ total: totalPosts }],
      [{ total: pendingRequests }],
      [{ total: subscriberCount }],
    ] = await Promise.all([
      db.select({ total: count() }).from(users).where(eq(users.status, 'active')),
      db.select({ total: count() }).from(posts),
      db.select({ total: count() }).from(membershipRequests).where(eq(membershipRequests.status, 'pending')),
      db.select({ total: count() }).from(subscribers).where(eq(subscribers.status, 'active')),
    ])

    return NextResponse.json({
      success: true,
      data: {
        totalUsers: totalUsers || 0,
        totalPosts: totalPosts || 0,
        pendingRequests: pendingRequests || 0,
        subscribers: subscriberCount || 0,
      },
    })
  } catch (error) {
    console.error('Fetch stats error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
