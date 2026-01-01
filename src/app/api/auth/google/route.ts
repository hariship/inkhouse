import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/google/callback`

export async function GET(request: NextRequest) {
  if (!GOOGLE_CLIENT_ID) {
    return NextResponse.json(
      { success: false, error: 'Google OAuth not configured' },
      { status: 503 }
    )
  }

  const searchParams = request.nextUrl.searchParams
  const source = searchParams.get('source') || 'login' // 'login', 'signup', or 'join'

  // Validate source
  if (!['login', 'signup', 'join'].includes(source)) {
    return NextResponse.json(
      { success: false, error: 'Invalid source parameter' },
      { status: 400 }
    )
  }

  // Generate state token for CSRF protection
  // State includes: random token + source (to know which flow after callback)
  const stateData = {
    token: crypto.randomBytes(32).toString('hex'),
    source,
    timestamp: Date.now(),
  }
  const state = Buffer.from(JSON.stringify(stateData)).toString('base64url')

  // Build Google OAuth URL
  const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  googleAuthUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID)
  googleAuthUrl.searchParams.set('redirect_uri', GOOGLE_REDIRECT_URI)
  googleAuthUrl.searchParams.set('response_type', 'code')
  googleAuthUrl.searchParams.set('scope', 'openid email profile')
  googleAuthUrl.searchParams.set('state', state)
  googleAuthUrl.searchParams.set('access_type', 'offline')
  googleAuthUrl.searchParams.set('prompt', 'select_account')

  // Store state in a short-lived cookie for verification in callback
  const response = NextResponse.redirect(googleAuthUrl.toString())
  response.cookies.set('google_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10, // 10 minutes
    path: '/',
  })

  return response
}
