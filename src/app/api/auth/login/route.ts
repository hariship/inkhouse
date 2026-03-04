import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users, sessions } from '@/lib/db/schema'
import { eq, or } from 'drizzle-orm'
import {
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  setAuthCookies,
} from '@/lib/auth'
import { checkIpRateLimit, getClientIp, getRateLimitHeaders } from '@/lib/rate-limit'
import { logLoginSuccess, logLoginFailed } from '@/lib/audit'
import { JWTPayload } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request)
    const rateLimit = checkIpRateLimit(clientIp, 'login')

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many login attempts. Please try again later.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      )
    }

    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const [user] = await db
      .select()
      .from(users)
      .where(or(eq(users.email, email), eq(users.username, email)))
      .limit(1)

    if (!user) {
      await logLoginFailed(email, 'user_not_found', request)
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    if (user.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'Account is suspended or deleted' },
        { status: 403 }
      )
    }

    const isValid = await verifyPassword(password, user.password_hash!)
    if (!isValid) {
      await logLoginFailed(email, 'invalid_password', request, user.id)
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role as JWTPayload['role'],
    }

    const accessToken = generateAccessToken(payload)
    const refreshToken = generateRefreshToken(payload)

    try {
      await db.insert(sessions).values({
        user_id: user.id,
        refresh_token: refreshToken,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        user_agent: request.headers.get('user-agent') || '',
        ip_address: request.headers.get('x-forwarded-for') || '',
      })
    } catch (sessionError) {
      console.error('Session creation error:', sessionError)
    }

    await db
      .update(users)
      .set({ last_login_at: new Date() })
      .where(eq(users.id, user.id))

    await setAuthCookies(accessToken, refreshToken)
    await logLoginSuccess(user.id, user.email, request)

    const { password_hash: _, ...safeUser } = user

    return NextResponse.json({
      success: true,
      user: safeUser,
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
