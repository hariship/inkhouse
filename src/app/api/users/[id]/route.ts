import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { logUserRoleChange, logUserStatusChange } from '@/lib/audit'

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
    const { role, status } = body

    const supabase = createServerClient()

    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 503 }
      )
    }

    // Get current user state for audit log
    const { data: currentUser } = await supabase
      .from('users')
      .select('role, status')
      .eq('id', id)
      .single()

    const updateData: Record<string, unknown> = {}
    if (role) updateData.role = role
    if (status) updateData.status = status

    const { data: user, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Update user error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to update user' },
        { status: 500 }
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
