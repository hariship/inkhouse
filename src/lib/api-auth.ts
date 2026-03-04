import crypto from 'crypto'
import { db } from '@/lib/db'
import { apiKeys } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

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

  const keyHash = hashApiKey(key)

  const [apiKey] = await db
    .select({
      id: apiKeys.id,
      user_id: apiKeys.user_id,
      status: apiKeys.status,
      expires_at: apiKeys.expires_at,
    })
    .from(apiKeys)
    .where(eq(apiKeys.key_hash, keyHash))
    .limit(1)

  if (!apiKey) {
    return { valid: false, error: 'Invalid API key' }
  }

  if (apiKey.status !== 'active') {
    return { valid: false, error: 'API key has been revoked' }
  }

  if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) {
    return { valid: false, error: 'API key has expired' }
  }

  // Update last_used_at (fire and forget)
  void db
    .update(apiKeys)
    .set({ last_used_at: new Date() })
    .where(eq(apiKeys.id, apiKey.id))

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
