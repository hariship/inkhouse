import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users, sessions, userPreferences } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import {
  hashPassword,
  generateAccessToken,
  generateRefreshToken,
  setAuthCookies,
} from '@/lib/auth'
import { checkIpRateLimit, getClientIp, getRateLimitHeaders } from '@/lib/rate-limit'
import { sendNewReaderNotification } from '@/lib/email'
import { JWTPayload } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request)
    const rateLimit = checkIpRateLimit(clientIp, 'signup')

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many signup attempts. Please try again later.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      )
    }

    const { email, username, password, display_name } = await request.json()

    if (!email || !username || !password || !display_name) {
      return NextResponse.json(
        { success: false, error: 'All fields are required' },
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

    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/
    if (!usernameRegex.test(username)) {
      return NextResponse.json(
        { success: false, error: 'Username must be 3-20 characters, alphanumeric and underscores only' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    const [existingEmail] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1)

    if (existingEmail) {
      return NextResponse.json(
        { success: false, error: 'Email is already registered' },
        { status: 400 }
      )
    }

    const [existingUsername] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, username.toLowerCase()))
      .limit(1)

    if (existingUsername) {
      return NextResponse.json(
        { success: false, error: 'Username is already taken' },
        { status: 400 }
      )
    }

    const passwordHash = await hashPassword(password)

    const [user] = await db
      .insert(users)
      .values({
        email: email.toLowerCase(),
        username: username.toLowerCase(),
        display_name: display_name.trim(),
        password_hash: passwordHash,
        role: 'reader',
        status: 'active',
      })
      .returning()

    await db.insert(userPreferences).values({
      user_id: user.id,
      view_mode: 'grid',
      default_sort: 'date',
    })

    sendNewReaderNotification({
      name: user.display_name,
      username: user.username,
      email: user.email,
    }).catch((err) => console.error('Failed to send new reader notification:', err))

    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role as JWTPayload['role'],
    }

    const accessToken = generateAccessToken(payload)
    const refreshToken = generateRefreshToken(payload)

    await db.insert(sessions).values({
      user_id: user.id,
      refresh_token: refreshToken,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      user_agent: request.headers.get('user-agent') || '',
      ip_address: request.headers.get('x-forwarded-for') || '',
    })

    await setAuthCookies(accessToken, refreshToken)

    const { password_hash: _, ...safeUser } = user

    return NextResponse.json({
      success: true,
      user: safeUser,
    })
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
