import crypto from 'crypto'
import { createServerClient } from '@/lib/supabase'

const API_KEY_PREFIX = 'ink_'

export interface ApiKeyValidationResult {
  valid: boolean
  userId?: string
  keyId?: string
  error?: string
}

export interface ApiAuthResult {
  userId?: string
  keyId?: string
  error?: string
}

/**
 * Generate a new API key with its hash and display prefix
 */
export function generateApiKey(): { key: string; hash: string; prefix: string } {
  const randomBytes = crypto.randomBytes(32).toString('hex')
  const key = `${API_KEY_PREFIX}${randomBytes}`
  const hash = hashApiKey(key)
  const prefix = key.substring(0, 12) + '...'
  return { key, hash, prefix }
}

/**
 * Hash an API key using SHA-256
 */
export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex')
}

/**
 * Validate an API key against the database
 */
export async function validateApiKey(key: string): Promise<ApiKeyValidationResult> {
  if (!key || !key.startsWith(API_KEY_PREFIX)) {
    return { valid: false, error: 'Invalid API key format' }
  }

  const supabase = createServerClient()
  if (!supabase) {
    return { valid: false, error: 'Database not configured' }
  }

  const keyHash = hashApiKey(key)

  const { data: apiKey, error } = await supabase
    .from('api_keys')
    .select('id, user_id, status, expires_at')
    .eq('key_hash', keyHash)
    .single()

  if (error || !apiKey) {
    return { valid: false, error: 'Invalid API key' }
  }

  if (apiKey.status !== 'active') {
    return { valid: false, error: 'API key has been revoked' }
  }

  if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) {
    return { valid: false, error: 'API key has expired' }
  }

  // Update last_used_at (fire and forget)
  supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', apiKey.id)
    .then(() => {})
    .catch(() => {})

  return { valid: true, userId: apiKey.user_id, keyId: apiKey.id }
}

/**
 * Extract and validate API key from request Authorization header
 */
export async function getApiUserFromRequest(request: Request): Promise<ApiAuthResult> {
  const authHeader = request.headers.get('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'Missing or invalid Authorization header. Use: Bearer <api_key>' }
  }

  const key = authHeader.substring(7)
  const result = await validateApiKey(key)

  if (!result.valid) {
    return { error: result.error }
  }

  return { userId: result.userId, keyId: result.keyId }
}
