import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users, membershipRequests } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { getAuthUser } from '@/lib/auth'
import { sendNewRequestNotification } from '@/lib/email'

// POST - Reader requests to become a writer
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, authUser.userId))
      .limit(1)

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }

    if (user.role !== 'reader') {
      return NextResponse.json({ success: false, error: 'Already a writer' }, { status: 400 })
    }

    const [existingRequest] = await db
      .select({ id: membershipRequests.id, status: membershipRequests.status })
      .from(membershipRequests)
      .where(and(eq(membershipRequests.email, user.email), eq(membershipRequests.status, 'pending')))
      .limit(1)

    if (existingRequest) {
      return NextResponse.json({
        success: false,
        error: 'You already have a pending request',
      }, { status: 400 })
    }

    const body = await request.json()
    const { writing_sample, portfolio_url } = body

    if (!writing_sample?.trim()) {
      return NextResponse.json({
        success: false,
        error: 'Please tell us why you want to become a writer',
      }, { status: 400 })
    }

    const [membershipRequest] = await db
      .insert(membershipRequests)
      .values({
        email: user.email,
        name: user.display_name,
        username: user.username,
        bio: user.bio || null,
        writing_sample: writing_sample.trim(),
        portfolio_url: portfolio_url?.trim() || null,
        status: 'pending',
        google_id: user.google_id || null,
        google_avatar_url: user.avatar_url || null,
      })
      .returning()

    sendNewRequestNotification({
      name: user.display_name,
      email: user.email,
      username: user.username,
      writingSample: writing_sample.trim(),
    }).catch(err => console.error('Failed to send notification:', err))

    return NextResponse.json({
      success: true,
      data: membershipRequest,
      message: 'Request submitted successfully',
    })
  } catch (error) {
    console.error('Upgrade request error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
