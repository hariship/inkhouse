import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users, membershipRequests } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { sendNewRequestNotification } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, name, username, bio, writing_sample, portfolio_url } = body

    if (!email || !name || !username || !writing_sample) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      )
    }

    const usernameRegex = /^[a-zA-Z0-9_]+$/
    if (!usernameRegex.test(username)) {
      return NextResponse.json(
        { success: false, error: 'Username can only contain letters, numbers, and underscores' },
        { status: 400 }
      )
    }

    // Check if email already exists in users
    const [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'This email is already registered' },
        { status: 400 }
      )
    }

    const [existingRequest] = await db
      .select({ id: membershipRequests.id, status: membershipRequests.status })
      .from(membershipRequests)
      .where(eq(membershipRequests.email, email))
      .limit(1)

    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        return NextResponse.json(
          { success: false, error: 'A request with this email is already pending' },
          { status: 400 }
        )
      }
    }

    const [existingUsername] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, username.toLowerCase()))
      .limit(1)

    if (existingUsername) {
      return NextResponse.json(
        { success: false, error: 'This username is already taken' },
        { status: 400 }
      )
    }

    await db.insert(membershipRequests).values({
      email: email.toLowerCase(),
      name,
      username: username.toLowerCase(),
      bio: bio || null,
      writing_sample,
      portfolio_url: portfolio_url || null,
      status: 'pending',
    })

    await sendNewRequestNotification({
      name,
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      writingSample: writing_sample,
    })

    return NextResponse.json({
      success: true,
      message: 'Membership request submitted successfully',
    })
  } catch (error) {
    console.error('Membership request error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
