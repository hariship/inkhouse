import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auditLogs, users } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
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

    // Fetch recent audit logs with user info
    const logs = await db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        user_id: auditLogs.user_id,
        target_id: auditLogs.target_id,
        target_type: auditLogs.target_type,
        details: auditLogs.details,
        ip_address: auditLogs.ip_address,
        created_at: auditLogs.created_at,
        user: {
          id: users.id,
          username: users.username,
          display_name: users.display_name,
        },
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.user_id, users.id))
      .orderBy(desc(auditLogs.created_at))
      .limit(10)

    return NextResponse.json({
      success: true,
      data: logs,
    })
  } catch (error) {
    console.error('Audit logs error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
