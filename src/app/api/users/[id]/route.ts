import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getAuthUser, isAdmin } from '@/lib/auth'
import { logUserRoleChange, logUserStatusChange } from '@/lib/audit'

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
    const { role, status } = body

    // Get current user state for audit log
    const [currentUser] = await db
      .select({ role: users.role, status: users.status })
      .from(users)
      .where(eq(users.id, id))
      .limit(1)

    const updateData: Record<string, unknown> = {}
    if (role) updateData.role = role
    if (status) updateData.status = status

    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Audit log
    if (role && currentUser?.role !== role) {
      await logUserRoleChange(authUser.userId, id, currentUser?.role || '', role, request)
    }
    if (status && currentUser?.status !== status) {
      await logUserStatusChange(authUser.userId, id, currentUser?.status || '', status, request)
    }

    return NextResponse.json({
      success: true,
      data: user,
    })
  } catch (error) {
    console.error('Update user error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
