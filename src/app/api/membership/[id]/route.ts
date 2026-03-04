import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users, membershipRequests } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
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

    const [membershipRequest] = await db
      .select()
      .from(membershipRequests)
      .where(eq(membershipRequests.id, id))
      .limit(1)

    if (!membershipRequest) {
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

    const [membershipRequest] = await db
      .select()
      .from(membershipRequests)
      .where(eq(membershipRequests.id, id))
      .limit(1)

    if (!membershipRequest) {
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

      if (membershipRequest.google_id) {
        const [existingUser] = await db
          .select({ id: users.id, role: users.role })
          .from(users)
          .where(eq(users.google_id, membershipRequest.google_id))
          .limit(1)

        if (existingUser) {
          isExistingUser = true
          await db
            .update(users)
            .set({ role: 'writer' })
            .where(eq(users.id, existingUser.id))

          emailResult = await sendWelcomeEmail({
            to: membershipRequest.email,
            name: membershipRequest.name,
            username: membershipRequest.username,
            isGoogleUser: true,
          })
        } else {
          await db.insert(users).values({
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

          emailResult = await sendWelcomeEmail({
            to: membershipRequest.email,
            name: membershipRequest.name,
            username: membershipRequest.username,
            isGoogleUser: true,
          })
        }
      } else {
        const tempPassword = generateTempPassword()
        const passwordHash = await hashPassword(tempPassword)

        await db.insert(users).values({
          email: membershipRequest.email,
          username: membershipRequest.username,
          password_hash: passwordHash,
          display_name: membershipRequest.name,
          bio: membershipRequest.bio,
          role: 'writer',
          status: 'active',
        })

        emailResult = await sendWelcomeEmail({
          to: membershipRequest.email,
          name: membershipRequest.name,
          username: membershipRequest.username,
          tempPassword,
        })
      }

      await db
        .update(membershipRequests)
        .set({
          status: 'approved',
          reviewed_by: authUser.userId,
          reviewed_at: new Date(),
        })
        .where(eq(membershipRequests.id, id))

      await logMembershipApprove(authUser.userId, id, membershipRequest.email, membershipRequest.username, request)

      return NextResponse.json({
        success: true,
        message: isExistingUser ? 'User upgraded to writer' : 'User approved and welcome email sent',
        emailSent: emailResult.success,
      })
    } else {
      await db
        .update(membershipRequests)
        .set({
          status: 'rejected',
          reviewed_by: authUser.userId,
          reviewed_at: new Date(),
          rejection_reason: rejection_reason || null,
        })
        .where(eq(membershipRequests.id, id))

      const emailResult = await sendRejectionEmail({
        to: membershipRequest.email,
        name: membershipRequest.name,
        reason: rejection_reason,
      })

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
