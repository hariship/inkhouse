import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getAuthUser, hashPassword, generateTempPassword } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser()
    if (!authUser || authUser.role !== 'admin') {
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
    if (!authUser || authUser.role !== 'admin') {
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
      // Generate temporary password
      const tempPassword = generateTempPassword()
      const passwordHash = await hashPassword(tempPassword)

      // Create user
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

      // Update request status
      await supabase
        .from('membership_requests')
        .update({
          status: 'approved',
          reviewed_by: authUser.userId,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', id)

      // TODO: Send welcome email with credentials
      // For now, log the temp password (in production, this would be emailed)
      console.log(`User ${membershipRequest.email} approved. Temp password: ${tempPassword}`)

      return NextResponse.json({
        success: true,
        message: 'User approved and created',
        tempPassword, // Remove in production - send via email instead
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

      // TODO: Send rejection email

      return NextResponse.json({
        success: true,
        message: 'Request rejected',
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
