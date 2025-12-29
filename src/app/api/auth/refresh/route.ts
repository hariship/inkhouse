import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@/lib/supabase'
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

    // Verify refresh token
    const payload = verifyRefreshToken(refreshToken)

    if (!payload) {
      await clearAuthCookies()
      return NextResponse.json(
        { success: false, error: 'Invalid refresh token' },
        { status: 401 }
      )
    }

    const supabase = createServerClient()

    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 503 }
      )
    }

    // Check if session exists in database
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('refresh_token', refreshToken)
      .single()

    if (sessionError || !session) {
      await clearAuthCookies()
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 401 }
      )
    }

    // Check if session is expired
    if (new Date(session.expires_at) < new Date()) {
      await supabase.from('sessions').delete().eq('id', session.id)
      await clearAuthCookies()
      return NextResponse.json(
        { success: false, error: 'Session expired' },
        { status: 401 }
      )
    }

    // Fetch user to ensure they're still active
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, username, role, status')
      .eq('id', payload.userId)
      .single()

    if (userError || !user || user.status !== 'active') {
      await supabase.from('sessions').delete().eq('id', session.id)
      await clearAuthCookies()
      return NextResponse.json(
        { success: false, error: 'User not found or inactive' },
        { status: 401 }
      )
    }

    // Generate new tokens
    const newPayload: JWTPayload = {
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    }

    const newAccessToken = generateAccessToken(newPayload)
    const newRefreshToken = generateRefreshToken(newPayload)

    // Update session with new refresh token
    await supabase
      .from('sessions')
      .update({
        refresh_token: newRefreshToken,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq('id', session.id)

    // Set new cookies
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
