import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users, sessions, passwordResetTokens } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { hashPassword } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json()

    if (!token || !password) {
      return NextResponse.json(
        { success: false, error: 'Token and password are required' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    const [resetToken] = await db
      .select({
        id: passwordResetTokens.id,
        user_id: passwordResetTokens.user_id,
        expires_at: passwordResetTokens.expires_at,
        used_at: passwordResetTokens.used_at,
      })
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token))
      .limit(1)

    if (!resetToken) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired reset link' },
        { status: 400 }
      )
    }

    if (resetToken.used_at) {
      return NextResponse.json(
        { success: false, error: 'This reset link has already been used' },
        { status: 400 }
      )
    }

    if (new Date(resetToken.expires_at) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'This reset link has expired' },
        { status: 400 }
      )
    }

    const passwordHash = await hashPassword(password)

    await db
      .update(users)
      .set({ password_hash: passwordHash })
      .where(eq(users.id, resetToken.user_id))

    await db
      .update(passwordResetTokens)
      .set({ used_at: new Date() })
      .where(eq(passwordResetTokens.id, resetToken.id))

    await db
      .delete(sessions)
      .where(eq(sessions.user_id, resetToken.user_id))

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully',
    })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    )
  }
}
