import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@/lib/supabase'
import { verifyRefreshToken, clearAuthCookies } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const refreshToken = cookieStore.get('refresh_token')?.value

    if (refreshToken) {
      // Verify and get user info from refresh token
      const payload = verifyRefreshToken(refreshToken)

      if (payload) {
        // Delete session from database
        const supabase = createServerClient()
        if (supabase) {
          await supabase
            .from('sessions')
            .delete()
            .eq('refresh_token', refreshToken)
        }
      }
    }

    // Clear cookies
    await clearAuthCookies()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Logout error:', error)
    // Still clear cookies even if there's an error
    await clearAuthCookies()
    return NextResponse.json({ success: true })
  }
}
