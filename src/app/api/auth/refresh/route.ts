import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { sessions, users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import {
  verifyRefreshToken,
  generateAccessToken,
  generateRefreshToken,
  setAuthCookies,
  clearAuthCookies,
} from '@/lib/auth'
import { JWTPayload } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const refreshToken = cookieStore.get('refresh_token')?.value

    if (!refreshToken) {
      return NextResponse.json(
        { success: false, error: 'No refresh token' },
        { status: 401 }
      )
    }

    const payload = verifyRefreshToken(refreshToken)

    if (!payload) {
      await clearAuthCookies()
      return NextResponse.json(
        { success: false, error: 'Invalid refresh token' },
        { status: 401 }
      )
    }

    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.refresh_token, refreshToken))
      .limit(1)

    if (!session) {
      await clearAuthCookies()
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 401 }
      )
    }

    if (new Date(session.expires_at) < new Date()) {
      await db.delete(sessions).where(eq(sessions.id, session.id))
      await clearAuthCookies()
      return NextResponse.json(
        { success: false, error: 'Session expired' },
        { status: 401 }
      )
    }

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
        role: users.role,
        status: users.status,
      })
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1)

    if (!user || user.status !== 'active') {
      await db.delete(sessions).where(eq(sessions.id, session.id))
      await clearAuthCookies()
      return NextResponse.json(
        { success: false, error: 'User not found or inactive' },
        { status: 401 }
      )
    }

    const newPayload: JWTPayload = {
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role as JWTPayload['role'],
    }

    const newAccessToken = generateAccessToken(newPayload)
    const newRefreshToken = generateRefreshToken(newPayload)

    await db
      .update(sessions)
      .set({
        refresh_token: newRefreshToken,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      })
      .where(eq(sessions.id, session.id))

    await setAuthCookies(newAccessToken, newRefreshToken)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Token refresh error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
