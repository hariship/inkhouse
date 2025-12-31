import { createServerClient } from '@/lib/supabase'

type AuditAction =
  | 'user.role_change'
  | 'user.status_change'
  | 'membership.approve'
  | 'membership.reject'
  | 'api_key.create'
  | 'api_key.revoke'
  | 'login.success'
  | 'login.failed'

interface AuditLogEntry {
  action: AuditAction
  userId?: string
  targetId?: string
  targetType?: string
  details?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
}

/**
 * Extract client info from request
 */
function getRequestContext(request?: Request) {
  return {
    ipAddress: request?.headers.get('x-forwarded-for')?.split(',')[0].trim() || undefined,
    userAgent: request?.headers.get('user-agent') || undefined,
  }
}

/**
 * Core audit logging function
 */
async function logAudit(entry: AuditLogEntry): Promise<void> {
  const supabase = createServerClient()
  if (!supabase) return

  try {
    const { error } = await supabase.from('audit_logs').insert({
      action: entry.action,
      user_id: entry.userId || null,
      target_id: entry.targetId || null,
      target_type: entry.targetType || null,
      details: entry.details || {},
      ip_address: entry.ipAddress || null,
      user_agent: entry.userAgent || null,
    })
    if (error) {
      console.error('Audit log error:', error)
    }
  } catch (error) {
    console.error('Audit log error:', error)
  }
}

// =====================================================
// LOGIN AUDIT FUNCTIONS
// =====================================================

export async function logLoginSuccess(
  userId: string,
  email: string,
  request?: Request
): Promise<void> {
  await logAudit({
    action: 'login.success',
    userId,
    details: { email },
    ...getRequestContext(request),
  })
}

export async function logLoginFailed(
  email: string,
  reason: 'user_not_found' | 'invalid_password' | 'account_suspended',
  request?: Request,
  userId?: string
): Promise<void> {
  await logAudit({
    action: 'login.failed',
    userId,
    details: { email, reason },
    ...getRequestContext(request),
  })
}

// =====================================================
// USER MANAGEMENT AUDIT FUNCTIONS
// =====================================================

export async function logUserRoleChange(
  adminId: string,
  targetUserId: string,
  previousRole: string,
  newRole: string,
  request?: Request
): Promise<void> {
  await logAudit({
    action: 'user.role_change',
    userId: adminId,
    targetId: targetUserId,
    targetType: 'user',
    details: { previousRole, newRole },
    ...getRequestContext(request),
  })
}

export async function logUserStatusChange(
  adminId: string,
  targetUserId: string,
  previousStatus: string,
  newStatus: string,
  request?: Request
): Promise<void> {
  await logAudit({
    action: 'user.status_change',
    userId: adminId,
    targetId: targetUserId,
    targetType: 'user',
    details: { previousStatus, newStatus },
    ...getRequestContext(request),
  })
}

// =====================================================
// MEMBERSHIP AUDIT FUNCTIONS
// =====================================================

export async function logMembershipApprove(
  adminId: string,
  requestId: string,
  email: string,
  username: string,
  request?: Request
): Promise<void> {
  await logAudit({
    action: 'membership.approve',
    userId: adminId,
    targetId: requestId,
    targetType: 'membership_request',
    details: { email, username },
    ...getRequestContext(request),
  })
}

export async function logMembershipReject(
  adminId: string,
  requestId: string,
  email: string,
  reason?: string,
  request?: Request
): Promise<void> {
  await logAudit({
    action: 'membership.reject',
    userId: adminId,
    targetId: requestId,
    targetType: 'membership_request',
    details: { email, reason },
    ...getRequestContext(request),
  })
}

// =====================================================
// API KEY AUDIT FUNCTIONS
// =====================================================

export async function logApiKeyCreate(
  userId: string,
  keyId: string,
  keyName: string,
  request?: Request
): Promise<void> {
  await logAudit({
    action: 'api_key.create',
    userId,
    targetId: keyId,
    targetType: 'api_key',
    details: { name: keyName },
    ...getRequestContext(request),
  })
}

export async function logApiKeyRevoke(
  userId: string,
  keyId: string,
  keyName: string,
  request?: Request
): Promise<void> {
  await logAudit({
    action: 'api_key.revoke',
    userId,
    targetId: keyId,
    targetType: 'api_key',
    details: { name: keyName },
    ...getRequestContext(request),
  })
}
