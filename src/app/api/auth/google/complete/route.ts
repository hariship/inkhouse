import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
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

// Generate unique username from email prefix
async function generateUniqueUsername(email: string, supabase: ReturnType<typeof createServerClient>): Promise<string> {
  const baseUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '')
  let username = baseUsername.slice(0, 20)
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

    // Decode and validate token
    let userData: GoogleUserData
    try {
      userData = JSON.parse(Buffer.from(token, 'base64url').toString())
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 400 }
      )
    }

    // Check if token is expired (10 minutes)
    if (Date.now() - userData.timestamp > 10 * 60 * 1000) {
      return NextResponse.json(
        { success: false, error: 'Token expired' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 503 }
      )
    }

    // Double-check user doesn't already exist
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .or(`email.eq.${userData.email.toLowerCase()},google_id.eq.${userData.googleId}`)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Account already exists. Please sign in instead.' },
        { status: 400 }
      )
    }

    // Create the user as reader
    const username = await generateUniqueUsername(userData.email, supabase)

    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        email: userData.email.toLowerCase(),
        username,
        display_name: userData.name,
        avatar_url: userData.picture,
        google_id: userData.googleId,
        auth_provider: 'google',
        role: 'reader',
        status: 'active',
      })
      .select()
      .single()

    if (createError || !newUser) {
      console.error('User creation error:', createError)
      return NextResponse.json(
        { success: false, error: 'Failed to create account' },
        { status: 500 }
      )
    }

    // Create default preferences
    await supabase.from('user_preferences').insert({
      user_id: newUser.id,
      view_mode: 'grid',
      default_sort: 'date',
    })

    // Notify admin about new reader
    sendNewReaderNotification({
      name: newUser.display_name,
      username: newUser.username,
      email: newUser.email,
    }).catch(err => console.error('Failed to send notification:', err))

    let writerRequestSubmitted = false

    // If user wants to write, create a membership request for upgrade
    if (wantsToWrite) {
      const { error: requestError } = await supabase
        .from('membership_requests')
        .insert({
          email: userData.email.toLowerCase(),
          name: userData.name,
          username,
          writing_sample: '(Signed up via Google - requesting writer access)',
          google_id: userData.googleId,
          google_avatar_url: userData.picture,
          status: 'pending',
        })

      if (!requestError) {
        writerRequestSubmitted = true

        // Notify admin about writer request
        sendNewRequestNotification({
          name: userData.name,
          username,
          email: userData.email,
          writingSample: '(Signed up via Google - requesting writer access)',
        }).catch(err => console.error('Failed to send notification:', err))
      }
    }

    // Generate tokens and create session
    const payload: JWTPayload = {
      userId: newUser.id,
      email: newUser.email,
      username: newUser.username,
      role: newUser.role,
    }

    const accessToken = generateAccessToken(payload)
    const refreshToken = generateRefreshToken(payload)

    // Store session
    await supabase.from('sessions').insert({
      user_id: newUser.id,
      refresh_token: refreshToken,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      user_agent: request.headers.get('user-agent') || '',
      ip_address: request.headers.get('x-forwarded-for') || '',
    })

    // Set cookies
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
