import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@/lib/supabase'
import { verifyAccessToken, verifyRefreshToken, generateAccessToken, setAuthCookies } from '@/lib/auth'
import { JWTPayload } from '@/types'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value
    const refreshToken = cookieStore.get('refresh_token')?.value

    let payload: JWTPayload | null = null

    // Try to verify access token first
    if (accessToken) {
      payload = verifyAccessToken(accessToken)
    }

    // If access token is invalid, try to refresh using refresh token
    if (!payload && refreshToken) {
      payload = verifyRefreshToken(refreshToken)

      if (payload) {
        // Generate new access token
        const newAccessToken = generateAccessToken(payload)
        await setAuthCookies(newAccessToken, refreshToken)
      }
    }

    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Fetch full user data from database
    const supabase = createServerClient()

    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 503 }
      )
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, username, display_name, bio, avatar_url, website_url, social_links, role, status, created_at, updated_at, last_login_at')
      .eq('id', payload.userId)
      .single()

    if (error || !user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    if (user.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'Account is suspended or deleted' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      user,
    })
  } catch (error) {
    console.error('Auth check error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
