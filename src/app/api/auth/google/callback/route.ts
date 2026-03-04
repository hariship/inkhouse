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
import { logLoginSuccess } from '@/lib/audit'
import { JWTPayload } from '@/types'
import crypto from 'crypto'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const GOOGLE_REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/google/callback`
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

interface GoogleTokenResponse {
  access_token: string
  id_token: string
  expires_in: number
  token_type: string
  scope: string
  refresh_token?: string
}

interface GoogleUserInfo {
  id: string
  email: string
  verified_email: boolean
  name: string
  given_name?: string
  family_name?: string
  picture?: string
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

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    console.error('Google OAuth error:', error)
    return NextResponse.redirect(`${APP_URL}/login?error=google_auth_failed`)
  }

  if (!code || !state) {
    return NextResponse.redirect(`${APP_URL}/login?error=missing_params`)
  }

  const storedState = request.cookies.get('google_oauth_state')?.value
  if (!storedState || storedState !== state) {
    return NextResponse.redirect(`${APP_URL}/login?error=invalid_state`)
  }

  let stateData: { token: string; source: string; timestamp: number }
  try {
    stateData = JSON.parse(Buffer.from(state, 'base64url').toString())
  } catch {
    return NextResponse.redirect(`${APP_URL}/login?error=invalid_state`)
  }

  if (Date.now() - stateData.timestamp > 10 * 60 * 1000) {
    return NextResponse.redirect(`${APP_URL}/login?error=state_expired`)
  }

  const source = stateData.source

  let tokens: GoogleTokenResponse
  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID!,
        client_secret: GOOGLE_CLIENT_SECRET!,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', await tokenResponse.text())
      return NextResponse.redirect(`${APP_URL}/login?error=token_exchange_failed`)
    }

    tokens = await tokenResponse.json()
  } catch (err) {
    console.error('Token exchange error:', err)
    return NextResponse.redirect(`${APP_URL}/login?error=token_exchange_failed`)
  }

  let googleUser: GoogleUserInfo
  try {
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })

    if (!userResponse.ok) {
      console.error('User info fetch failed:', await userResponse.text())
      return NextResponse.redirect(`${APP_URL}/login?error=user_info_failed`)
    }

    googleUser = await userResponse.json()
  } catch (err) {
    console.error('User info error:', err)
    return NextResponse.redirect(`${APP_URL}/login?error=user_info_failed`)
  }

  if (!googleUser.verified_email) {
    return NextResponse.redirect(`${APP_URL}/login?error=email_not_verified`)
  }

  // Check if user exists by google_id
  const [existingByGoogleId] = await db
    .select()
    .from(users)
    .where(eq(users.google_id, googleUser.id))
    .limit(1)

  if (existingByGoogleId) {
    return await loginUser(existingByGoogleId, request)
  }

  // Check if user exists by email
  const [existingByEmail] = await db
    .select()
    .from(users)
    .where(eq(users.email, googleUser.email.toLowerCase()))
    .limit(1)

  if (existingByEmail) {
    await db
      .update(users)
      .set({
        google_id: googleUser.id,
        auth_provider: existingByEmail.password_hash ? 'both' : 'google',
        avatar_url: existingByEmail.avatar_url || googleUser.picture,
      })
      .where(eq(users.id, existingByEmail.id))

    return await loginUser(existingByEmail, request)
  }

  // User doesn't exist - handle based on source
  if (source === 'signup') {
    const username = await generateUniqueUsername(googleUser.email)

    const [newUser] = await db
      .insert(users)
      .values({
        email: googleUser.email.toLowerCase(),
        username,
        display_name: googleUser.name,
        avatar_url: googleUser.picture,
        google_id: googleUser.id,
        auth_provider: 'google',
        role: 'reader',
        status: 'active',
      })
      .returning()

    if (!newUser) {
      return NextResponse.redirect(`${APP_URL}/signup?error=account_creation_failed`)
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

    return await loginUser(newUser, request, '/?welcome=true')
  }

  if (source === 'join') {
    const [existingRequest] = await db
      .select({ id: membershipRequests.id, status: membershipRequests.status })
      .from(membershipRequests)
      .where(eq(membershipRequests.email, googleUser.email.toLowerCase()))
      .limit(1)

    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        return NextResponse.redirect(`${APP_URL}/join?message=request_pending`)
      }
      if (existingRequest.status === 'rejected') {
        return NextResponse.redirect(`${APP_URL}/join?message=request_rejected`)
      }
    }

    const username = googleUser.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20)

    await db.insert(membershipRequests).values({
      email: googleUser.email.toLowerCase(),
      name: googleUser.name,
      username,
      writing_sample: '(Signed up via Google - no writing sample provided)',
      google_id: googleUser.id,
      google_avatar_url: googleUser.picture,
      status: 'pending',
    })

    sendNewRequestNotification({
      name: googleUser.name,
      username,
      email: googleUser.email,
      writingSample: '(Signed up via Google)',
    }).catch(err => console.error('Failed to send notification:', err))

    return NextResponse.redirect(`${APP_URL}/join?success=true`)
  }

  // source === 'login' but no account exists
  const tempData = {
    googleId: googleUser.id,
    email: googleUser.email,
    name: googleUser.name,
    picture: googleUser.picture,
    timestamp: Date.now(),
  }
  const tempToken = Buffer.from(JSON.stringify(tempData)).toString('base64url')

  const response = NextResponse.redirect(`${APP_URL}/auth/google/choose-role?token=${tempToken}`)
  response.cookies.delete('google_oauth_state')

  return response
}

async function loginUser(
  user: { id: string; email: string; username: string; role: string },
  request: NextRequest,
  redirectPath = '/?welcome=true'
) {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    username: user.username,
    role: user.role as JWTPayload['role'],
  }

  const accessToken = generateAccessToken(payload)
  const refreshToken = generateRefreshToken(payload)

  await db.insert(sessions).values({
    user_id: user.id,
    refresh_token: refreshToken,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    user_agent: request.headers.get('user-agent') || '',
    ip_address: request.headers.get('x-forwarded-for') || '',
  })

  await db
    .update(users)
    .set({ last_login_at: new Date() })
    .where(eq(users.id, user.id))

  await logLoginSuccess(user.id, user.email, request)

  await setAuthCookies(accessToken, refreshToken)

  const response = NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}${redirectPath}`)
  response.cookies.delete('google_oauth_state')

  return response
}
