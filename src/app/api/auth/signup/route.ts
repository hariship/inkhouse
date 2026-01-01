import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import {
  hashPassword,
  generateAccessToken,
  generateRefreshToken,
  setAuthCookies,
} from '@/lib/auth'
import { checkIpRateLimit, getClientIp, getRateLimitHeaders } from '@/lib/rate-limit'
import { sendNewReaderNotification } from '@/lib/email'
import { JWTPayload } from '@/types'

export async function POST(request: NextRequest) {
  try {
    // Check rate limit
    const clientIp = getClientIp(request)
    const rateLimit = checkIpRateLimit(clientIp, 'signup')

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many signup attempts. Please try again later.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      )
    }

    const { email, username, password, display_name } = await request.json()

    // Validate required fields
    if (!email || !username || !password || !display_name) {
      return NextResponse.json(
        { success: false, error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validate username format (alphanumeric and underscores, 3-20 chars)
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/
    if (!usernameRegex.test(username)) {
      return NextResponse.json(
        { success: false, error: 'Username must be 3-20 characters, alphanumeric and underscores only' },
        { status: 400 }
      )
    }

    // Validate password strength (min 8 chars)
    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters' },
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

    // Check if email already exists
    const { data: existingEmail } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single()

    if (existingEmail) {
      return NextResponse.json(
        { success: false, error: 'Email is already registered' },
        { status: 400 }
      )
    }

    // Check if username already exists
    const { data: existingUsername } = await supabase
      .from('users')
      .select('id')
      .eq('username', username.toLowerCase())
      .single()

    if (existingUsername) {
      return NextResponse.json(
        { success: false, error: 'Username is already taken' },
        { status: 400 }
      )
    }

    // Hash password
    const passwordHash = await hashPassword(password)

    // Create user with reader role
    const { data: user, error: createError } = await supabase
      .from('users')
      .insert({
        email: email.toLowerCase(),
        username: username.toLowerCase(),
        display_name: display_name.trim(),
        password_hash: passwordHash,
        role: 'reader',
        status: 'active',
      })
      .select()
      .single()

    if (createError) {
      console.error('User creation error:', createError)
      return NextResponse.json(
        { success: false, error: 'Failed to create account' },
        { status: 500 }
      )
    }

    // Create default user preferences
    await supabase.from('user_preferences').insert({
      user_id: user.id,
      view_mode: 'grid',
      default_sort: 'date',
    })

    // Notify super admin about new reader (non-blocking)
    sendNewReaderNotification({
      name: user.display_name,
      username: user.username,
      email: user.email,
    }).catch((err) => console.error('Failed to send new reader notification:', err))

    // Generate tokens for auto-login
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
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

    // Set cookies
    await setAuthCookies(accessToken, refreshToken)

    // Return user data (without password)
    const { password_hash: _, ...safeUser } = user

    return NextResponse.json({
      success: true,
      user: safeUser,
    })
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
