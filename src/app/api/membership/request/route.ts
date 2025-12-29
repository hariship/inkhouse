import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, name, username, bio, writing_sample, portfolio_url } = body

    // Validate required fields
    if (!email || !name || !username || !writing_sample) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
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

    // Validate username format
    const usernameRegex = /^[a-zA-Z0-9_]+$/
    if (!usernameRegex.test(username)) {
      return NextResponse.json(
        { success: false, error: 'Username can only contain letters, numbers, and underscores' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database not configured. Please set up Supabase environment variables.' },
        { status: 503 }
      )
    }

    // Check if email already exists in users or pending requests
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'This email is already registered' },
        { status: 400 }
      )
    }

    const { data: existingRequest } = await supabase
      .from('membership_requests')
      .select('id, status')
      .eq('email', email)
      .single()

    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        return NextResponse.json(
          { success: false, error: 'A request with this email is already pending' },
          { status: 400 }
        )
      }
    }

    // Check if username is taken
    const { data: existingUsername } = await supabase
      .from('users')
      .select('id')
      .eq('username', username.toLowerCase())
      .single()

    if (existingUsername) {
      return NextResponse.json(
        { success: false, error: 'This username is already taken' },
        { status: 400 }
      )
    }

    // Create membership request
    const { error: insertError } = await supabase
      .from('membership_requests')
      .insert({
        email: email.toLowerCase(),
        name,
        username: username.toLowerCase(),
        bio: bio || null,
        writing_sample,
        portfolio_url: portfolio_url || null,
        status: 'pending',
      })

    if (insertError) {
      console.error('Insert error:', insertError)
      return NextResponse.json(
        { success: false, error: 'Failed to submit request' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Membership request submitted successfully',
    })
  } catch (error) {
    console.error('Membership request error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
