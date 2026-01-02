import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'

export async function GET() {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Only super_admin can view audit logs
    if (authUser.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      )
    }

    const supabase = createServerClient()
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 503 }
      )
    }

    // Fetch recent audit logs with user info
    const { data: logs, error } = await supabase
      .from('audit_logs')
      .select(`
        id,
        action,
        user_id,
        target_id,
        target_type,
        details,
        ip_address,
        created_at,
        user:users!audit_logs_user_id_fkey(id, username, display_name)
      `)
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      console.error('Fetch audit logs error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch audit logs' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: logs || [],
    })
  } catch (error) {
    console.error('Audit logs error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
