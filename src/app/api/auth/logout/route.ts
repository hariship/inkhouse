import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { sessions } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { verifyRefreshToken, clearAuthCookies } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const refreshToken = cookieStore.get('refresh_token')?.value

    if (refreshToken) {
      const payload = verifyRefreshToken(refreshToken)

      if (payload) {
        try {
          await db.delete(sessions).where(eq(sessions.refresh_token, refreshToken))
        } catch (e) {
          console.error('Session deletion error:', e)
        }
      }
    }

    await clearAuthCookies()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Logout error:', error)
    await clearAuthCookies()
    return NextResponse.json({ success: true })
  }
}
