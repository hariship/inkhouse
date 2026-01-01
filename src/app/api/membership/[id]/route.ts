import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getAuthUser, hashPassword, generateTempPassword, isAdmin } from '@/lib/auth'
import { sendWelcomeEmail, sendRejectionEmail } from '@/lib/email'
import { logMembershipApprove, logMembershipReject } from '@/lib/audit'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser()
    if (!authUser || !isAdmin(authUser)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const { id } = await params
    const supabase = createServerClient()

    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 503 }
      )
    }

    const { data: membershipRequest, error } = await supabase
      .from('membership_requests')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !membershipRequest) {
      return NextResponse.json(
        { success: false, error: 'Request not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: membershipRequest,
    })
  } catch (error) {
    console.error('Fetch request error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser()
    if (!authUser || !isAdmin(authUser)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { action, rejection_reason } = body

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
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

    // Get the membership request
    const { data: membershipRequest, error: fetchError } = await supabase
      .from('membership_requests')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !membershipRequest) {
      return NextResponse.json(
        { success: false, error: 'Request not found' },
        { status: 404 }
      )
    }

    if (membershipRequest.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'Request has already been processed' },
        { status: 400 }
      )
    }

    if (action === 'approve') {
      let emailResult = { success: false }
      let isExistingUser = false

      // Check if this is a Google user who already has an account (signed up via choose-role)
      if (membershipRequest.google_id) {
        const { data: existingUser } = await supabase
          .from('users')
          .select('id, role')
          .eq('google_id', membershipRequest.google_id)
          .single()

        if (existingUser) {
          // Existing user - just upgrade their role to writer
          isExistingUser = true
          const { error: updateError } = await supabase
            .from('users')
            .update({ role: 'writer' })
            .eq('id', existingUser.id)

          if (updateError) {
            console.error('User role update error:', updateError)
            return NextResponse.json(
              { success: false, error: 'Failed to upgrade user role' },
              { status: 500 }
            )
          }

          // Send writer access granted email (no password needed)
          emailResult = await sendWelcomeEmail({
            to: membershipRequest.email,
            name: membershipRequest.name,
            username: membershipRequest.username,
            isGoogleUser: true,
          })
        } else {
          // Google user from /join - create account with google_id
          const { error: userError } = await supabase.from('users').insert({
            email: membershipRequest.email,
            username: membershipRequest.username,
            display_name: membershipRequest.name,
            bio: membershipRequest.bio,
            avatar_url: membershipRequest.google_avatar_url,
            google_id: membershipRequest.google_id,
            auth_provider: 'google',
            role: 'writer',
            status: 'active',
          })

          if (userError) {
            console.error('User creation error:', userError)
            return NextResponse.json(
              { success: false, error: 'Failed to create user' },
              { status: 500 }
            )
          }

          // Send welcome email for Google user (no password needed)
          emailResult = await sendWelcomeEmail({
            to: membershipRequest.email,
            name: membershipRequest.name,
            username: membershipRequest.username,
            isGoogleUser: true,
          })
        }
      } else {
        // Regular (non-Google) user - generate temp password
        const tempPassword = generateTempPassword()
        const passwordHash = await hashPassword(tempPassword)

        const { error: userError } = await supabase.from('users').insert({
          email: membershipRequest.email,
          username: membershipRequest.username,
          password_hash: passwordHash,
          display_name: membershipRequest.name,
          bio: membershipRequest.bio,
          role: 'writer',
          status: 'active',
        })

        if (userError) {
          console.error('User creation error:', userError)
          return NextResponse.json(
            { success: false, error: 'Failed to create user' },
            { status: 500 }
          )
        }

        // Send welcome email with credentials
        emailResult = await sendWelcomeEmail({
          to: membershipRequest.email,
          name: membershipRequest.name,
          username: membershipRequest.username,
          tempPassword,
        })
      }

      // Update request status
      await supabase
        .from('membership_requests')
        .update({
          status: 'approved',
          reviewed_by: authUser.userId,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (!emailResult.success) {
        console.error('Failed to send welcome email:', emailResult)
      }

      // Audit log
      await logMembershipApprove(authUser.userId, id, membershipRequest.email, membershipRequest.username, request)

      return NextResponse.json({
        success: true,
        message: isExistingUser ? 'User upgraded to writer' : 'User approved and welcome email sent',
        emailSent: emailResult.success,
      })
    } else {
      // Reject request
      await supabase
        .from('membership_requests')
        .update({
          status: 'rejected',
          reviewed_by: authUser.userId,
          reviewed_at: new Date().toISOString(),
          rejection_reason: rejection_reason || null,
        })
        .eq('id', id)

      // Send rejection email
      const emailResult = await sendRejectionEmail({
        to: membershipRequest.email,
        name: membershipRequest.name,
        reason: rejection_reason,
      })

      if (!emailResult.success) {
        console.error('Failed to send rejection email:', emailResult.error)
      }

      // Audit log
      await logMembershipReject(authUser.userId, id, membershipRequest.email, rejection_reason, request)

      return NextResponse.json({
        success: true,
        message: 'Request rejected',
        emailSent: emailResult.success,
      })
    }
  } catch (error) {
    console.error('Process request error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
