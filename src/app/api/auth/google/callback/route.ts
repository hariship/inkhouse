import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
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

// Generate unique username from email prefix
async function generateUniqueUsername(email: string, supabase: ReturnType<typeof createServerClient>): Promise<string> {
  const baseUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '')
  let username = baseUsername.slice(0, 20) // Max 20 chars
  let suffix = 0

  while (true) {
    const candidateUsername = suffix === 0 ? username : `${username.slice(0, 17)}${suffix}`
    const { data: existing } = await supabase!
      .from('users')
      .select('id')
      .eq('username', candidateUsername)
      .single()

    if (!existing) {
      return candidateUsername
    }
    suffix++
    if (suffix > 999) {
      // Fallback to random suffix
      return `${username.slice(0, 12)}${crypto.randomBytes(4).toString('hex')}`
    }
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  // Handle Google OAuth errors
  if (error) {
    console.error('Google OAuth error:', error)
    return NextResponse.redirect(`${APP_URL}/login?error=google_auth_failed`)
  }

  if (!code || !state) {
    return NextResponse.redirect(`${APP_URL}/login?error=missing_params`)
  }

  // Verify state matches cookie
  const storedState = request.cookies.get('google_oauth_state')?.value
  if (!storedState || storedState !== state) {
    return NextResponse.redirect(`${APP_URL}/login?error=invalid_state`)
  }

  // Decode state to get source
  let stateData: { token: string; source: string; timestamp: number }
  try {
    stateData = JSON.parse(Buffer.from(state, 'base64url').toString())
  } catch {
    return NextResponse.redirect(`${APP_URL}/login?error=invalid_state`)
  }

  // Check state hasn't expired (10 minutes)
  if (Date.now() - stateData.timestamp > 10 * 60 * 1000) {
    return NextResponse.redirect(`${APP_URL}/login?error=state_expired`)
  }

  const source = stateData.source // 'login', 'signup', or 'join'

  // Exchange code for tokens
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

  // Get user info from Google
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

  // Ensure email is verified
  if (!googleUser.verified_email) {
    return NextResponse.redirect(`${APP_URL}/login?error=email_not_verified`)
  }

  const supabase = createServerClient()
  if (!supabase) {
    return NextResponse.redirect(`${APP_URL}/login?error=database_error`)
  }

  // Check if user exists by google_id
  const { data: existingByGoogleId } = await supabase
    .from('users')
    .select('*')
    .eq('google_id', googleUser.id)
    .single()

  if (existingByGoogleId) {
    // Flow 4: Returning Google User - just log them in
    return await loginUser(existingByGoogleId, request)
  }

  // Check if user exists by email
  const { data: existingByEmail } = await supabase
    .from('users')
    .select('*')
    .eq('email', googleUser.email.toLowerCase())
    .single()

  if (existingByEmail) {
    // Flow 3: Existing user, first Google sign in - link accounts
    await supabase
      .from('users')
      .update({
        google_id: googleUser.id,
        auth_provider: existingByEmail.password_hash ? 'both' : 'google',
        avatar_url: existingByEmail.avatar_url || googleUser.picture,
      })
      .eq('id', existingByEmail.id)

    return await loginUser({ ...existingByEmail, google_id: googleUser.id }, request)
  }

  // User doesn't exist - handle based on source
  if (source === 'signup') {
    // Flow 1: New reader via /signup
    const username = await generateUniqueUsername(googleUser.email, supabase)

    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        email: googleUser.email.toLowerCase(),
        username,
        display_name: googleUser.name,
        avatar_url: googleUser.picture,
        google_id: googleUser.id,
        auth_provider: 'google',
        role: 'reader',
        status: 'active',
      })
      .select()
      .single()

    if (createError || !newUser) {
      console.error('User creation error:', createError)
      return NextResponse.redirect(`${APP_URL}/signup?error=account_creation_failed`)
    }

    // Create default preferences
    await supabase.from('user_preferences').insert({
      user_id: newUser.id,
      view_mode: 'grid',
      default_sort: 'date',
    })

    // Notify admin (non-blocking)
    sendNewReaderNotification({
      name: newUser.display_name,
      username: newUser.username,
      email: newUser.email,
    }).catch(err => console.error('Failed to send notification:', err))

    return await loginUser(newUser, request, '/?welcome=true')
  }

  if (source === 'join') {
    // Flow 2: New writer request via /join
    // Check if there's already a pending request
    const { data: existingRequest } = await supabase
      .from('membership_requests')
      .select('id, status')
      .eq('email', googleUser.email.toLowerCase())
      .single()

    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        return NextResponse.redirect(`${APP_URL}/join?message=request_pending`)
      }
      if (existingRequest.status === 'rejected') {
        return NextResponse.redirect(`${APP_URL}/join?message=request_rejected`)
      }
    }

    // Create membership request
    const username = googleUser.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20)

    const { error: requestError } = await supabase
      .from('membership_requests')
      .insert({
        email: googleUser.email.toLowerCase(),
        name: googleUser.name,
        username,
        writing_sample: '(Signed up via Google - no writing sample provided)',
        google_id: googleUser.id,
        google_avatar_url: googleUser.picture,
        status: 'pending',
      })

    if (requestError) {
      console.error('Membership request error:', requestError)
      return NextResponse.redirect(`${APP_URL}/join?error=request_failed`)
    }

    // Notify admin
    sendNewRequestNotification({
      name: googleUser.name,
      username,
      email: googleUser.email,
      writingSample: '(Signed up via Google)',
    }).catch(err => console.error('Failed to send notification:', err))

    return NextResponse.redirect(`${APP_URL}/join?success=true`)
  }

  // source === 'login' but no account exists
  // Flow 5: Redirect to choose-role page
  // Store Google user info in a temporary token
  const tempData = {
    googleId: googleUser.id,
    email: googleUser.email,
    name: googleUser.name,
    picture: googleUser.picture,
    timestamp: Date.now(),
  }
  const tempToken = Buffer.from(JSON.stringify(tempData)).toString('base64url')

  const response = NextResponse.redirect(`${APP_URL}/auth/google/choose-role?token=${tempToken}`)

  // Clear the OAuth state cookie
  response.cookies.delete('google_oauth_state')

  return response
}

async function loginUser(
  user: { id: string; email: string; username: string; role: string },
  request: NextRequest,
  redirectPath = '/?welcome=true'
) {
  const supabase = createServerClient()!

  // Generate tokens
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    username: user.username,
    role: user.role as JWTPayload['role'],
  }

  const accessToken = generateAccessToken(payload)
  const refreshToken = generateRefreshToken(payload)

  // Store session
  await supabase.from('sessions').insert({
    user_id: user.id,
    refresh_token: refreshToken,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    user_agent: request.headers.get('user-agent') || '',
    ip_address: request.headers.get('x-forwarded-for') || '',
  })

  // Update last login
  await supabase
    .from('users')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', user.id)

  // Audit log
  await logLoginSuccess(user.id, user.email, request)

  // Set cookies and redirect
  await setAuthCookies(accessToken, refreshToken)

  const response = NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}${redirectPath}`)

  // Clear the OAuth state cookie
  response.cookies.delete('google_oauth_state')

  return response
}
