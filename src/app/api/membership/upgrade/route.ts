import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { sendNewRequestNotification } from '@/lib/email'

// POST - Reader requests to become a writer
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServerClient()
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 503 })
    }

    // Get full user data
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }

    // Only readers can upgrade
    if (user.role !== 'reader') {
      return NextResponse.json({ success: false, error: 'Already a writer' }, { status: 400 })
    }

    // Check for existing pending request
    const { data: existingRequest } = await supabase
      .from('membership_requests')
      .select('id, status')
      .eq('email', user.email)
      .eq('status', 'pending')
      .single()

    if (existingRequest) {
      return NextResponse.json({
        success: false,
        error: 'You already have a pending request'
      }, { status: 400 })
    }

    const body = await request.json()
    const { writing_sample, portfolio_url } = body

    if (!writing_sample?.trim()) {
      return NextResponse.json({
        success: false,
        error: 'Please tell us why you want to become a writer'
      }, { status: 400 })
    }

    // Create membership request using existing user data
    const { data: membershipRequest, error: insertError } = await supabase
      .from('membership_requests')
      .insert({
        email: user.email,
        name: user.display_name,
        username: user.username,
        bio: user.bio || null,
        writing_sample: writing_sample.trim(),
        portfolio_url: portfolio_url?.trim() || null,
        status: 'pending',
        google_id: user.google_id || null,
        google_avatar_url: user.avatar_url || null,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Create upgrade request error:', insertError)
      return NextResponse.json({
        success: false,
        error: 'Failed to submit request'
      }, { status: 500 })
    }

    // Send notification to super admin
    sendNewRequestNotification({
      name: user.display_name,
      email: user.email,
      username: user.username,
      writingSample: writing_sample.trim(),
    }).catch(err => console.error('Failed to send notification:', err))

    return NextResponse.json({
      success: true,
      data: membershipRequest,
      message: 'Request submitted successfully'
    })
  } catch (error) {
    console.error('Upgrade request error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
