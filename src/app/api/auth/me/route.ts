import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { verifyAccessToken, verifyRefreshToken, generateAccessToken, setAuthCookies } from '@/lib/auth'
import { JWTPayload } from '@/types'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('access_token')?.value
    const refreshToken = cookieStore.get('refresh_token')?.value

    let payload: JWTPayload | null = null

    if (accessToken) {
      payload = verifyAccessToken(accessToken)
    }

    if (!payload && refreshToken) {
      payload = verifyRefreshToken(refreshToken)

      if (payload) {
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

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        username: users.username,
        display_name: users.display_name,
        bio: users.bio,
        avatar_url: users.avatar_url,
        website_url: users.website_url,
        social_links: users.social_links,
        role: users.role,
        status: users.status,
        created_at: users.created_at,
        updated_at: users.updated_at,
        last_login_at: users.last_login_at,
      })
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1)

    if (!user) {
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
