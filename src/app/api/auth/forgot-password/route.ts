import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users, passwordResetTokens } from '@/lib/db/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { sendPasswordResetEmail } from '@/lib/email'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      )
    }

    const successResponse = NextResponse.json({
      success: true,
      message: 'If an account exists with this email, a reset link has been sent.',
    })

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        display_name: users.display_name,
        status: users.status,
      })
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1)

    if (!user || user.status !== 'active') {
      return successResponse
    }

    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

    await db
      .delete(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.user_id, user.id),
          isNull(passwordResetTokens.used_at)
        )
      )

    await db.insert(passwordResetTokens).values({
      user_id: user.id,
      token,
      expires_at: expiresAt,
    })

    await sendPasswordResetEmail({
      to: user.email,
      name: user.display_name,
      resetToken: token,
    })

    return successResponse
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    )
  }
}
