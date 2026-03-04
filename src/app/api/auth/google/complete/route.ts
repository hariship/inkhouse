import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users, sessions, membershipRequests, userPreferences } from '@/lib/db/schema'
import { eq, or } from 'drizzle-orm'
import {
  generateAccessToken,
  generateRefreshToken,
  setAuthCookies,
} from '@/lib/auth'
import { sendNewReaderNotification, sendNewRequestNotification } from '@/lib/email'
import { JWTPayload } from '@/types'
import crypto from 'crypto'

interface GoogleUserData {
  googleId: string
  email: string
  name: string
  picture?: string
  timestamp: number
}

async function generateUniqueUsername(email: string): Promise<string> {
  const baseUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '')
  let username = baseUsername.slice(0, 20)
  let suffix = 0

  while (true) {
    const candidateUsername = suffix === 0 ? username : `${username.slice(0, 17)}${suffix}`
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, candidateUsername))
      .limit(1)

    if (!existing) {
      return candidateUsername
    }
    suffix++
    if (suffix > 999) {
      return `${username.slice(0, 12)}${crypto.randomBytes(4).toString('hex')}`
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { token, wantsToWrite } = await request.json()

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Missing token' },
        { status: 400 }
      )
    }

    let userData: GoogleUserData
    try {
      userData = JSON.parse(Buffer.from(token, 'base64url').toString())
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 400 }
      )
    }

    if (Date.now() - userData.timestamp > 10 * 60 * 1000) {
      return NextResponse.json(
        { success: false, error: 'Token expired' },
        { status: 400 }
      )
    }

    // Double-check user doesn't already exist
    const [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(
        or(
          eq(users.email, userData.email.toLowerCase()),
          eq(users.google_id, userData.googleId)
        )
      )
      .limit(1)

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Account already exists. Please sign in instead.' },
        { status: 400 }
      )
    }

    const username = await generateUniqueUsername(userData.email)

    const [newUser] = await db
      .insert(users)
      .values({
        email: userData.email.toLowerCase(),
        username,
        display_name: userData.name,
        avatar_url: userData.picture,
        google_id: userData.googleId,
        auth_provider: 'google',
        role: 'reader',
        status: 'active',
      })
      .returning()

    if (!newUser) {
      return NextResponse.json(
        { success: false, error: 'Failed to create account' },
        { status: 500 }
      )
    }

    await db.insert(userPreferences).values({
      user_id: newUser.id,
      view_mode: 'grid',
      default_sort: 'date',
    })

    sendNewReaderNotification({
      name: newUser.display_name,
      username: newUser.username,
      email: newUser.email,
    }).catch(err => console.error('Failed to send notification:', err))

    let writerRequestSubmitted = false

    if (wantsToWrite) {
      try {
        await db.insert(membershipRequests).values({
          email: userData.email.toLowerCase(),
          name: userData.name,
          username,
          writing_sample: '(Signed up via Google - requesting writer access)',
          google_id: userData.googleId,
          google_avatar_url: userData.picture,
          status: 'pending',
        })

        writerRequestSubmitted = true

        sendNewRequestNotification({
          name: userData.name,
          username,
          email: userData.email,
          writingSample: '(Signed up via Google - requesting writer access)',
        }).catch(err => console.error('Failed to send notification:', err))
      } catch (e) {
        console.error('Membership request error:', e)
      }
    }

    const payload: JWTPayload = {
      userId: newUser.id,
      email: newUser.email,
      username: newUser.username,
      role: newUser.role as JWTPayload['role'],
    }

    const accessToken = generateAccessToken(payload)
    const refreshToken = generateRefreshToken(payload)

    await db.insert(sessions).values({
      user_id: newUser.id,
      refresh_token: refreshToken,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      user_agent: request.headers.get('user-agent') || '',
      ip_address: request.headers.get('x-forwarded-for') || '',
    })

    await setAuthCookies(accessToken, refreshToken)

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        username: newUser.username,
        display_name: newUser.display_name,
        role: newUser.role,
      },
      writerRequestSubmitted,
    })
  } catch (error) {
    console.error('Complete registration error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
