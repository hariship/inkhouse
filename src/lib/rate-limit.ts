import { createServerClient } from '@/lib/supabase'

const RATE_LIMIT = 1000 // requests per hour
const WINDOW_MS = 60 * 60 * 1000 // 1 hour in milliseconds

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  reset: Date
  error?: string
}

/**
 * Check rate limit for an API key
 */
export async function checkRateLimit(keyId: string): Promise<RateLimitResult> {
  const supabase = createServerClient()
  if (!supabase) {
    return {
      allowed: false,
      limit: RATE_LIMIT,
      remaining: 0,
      reset: new Date(),
      error: 'Database not configured',
    }
  }

  const now = new Date()
  const windowStart = new Date(Math.floor(now.getTime() / WINDOW_MS) * WINDOW_MS)
  const windowEnd = new Date(windowStart.getTime() + WINDOW_MS)

  // Get or create rate limit record
  const { data: existing } = await supabase
    .from('api_rate_limits')
    .select('*')
    .eq('api_key_id', keyId)
    .eq('window_start', windowStart.toISOString())
    .single()

  if (existing) {
    if (existing.request_count >= RATE_LIMIT) {
      return {
        allowed: false,
        limit: RATE_LIMIT,
        remaining: 0,
        reset: windowEnd,
      }
    }

    // Increment counter
    await supabase
      .from('api_rate_limits')
      .update({ request_count: existing.request_count + 1 })
      .eq('id', existing.id)

    return {
      allowed: true,
      limit: RATE_LIMIT,
      remaining: RATE_LIMIT - existing.request_count - 1,
      reset: windowEnd,
    }
  }

  // Create new record
  await supabase.from('api_rate_limits').insert({
    api_key_id: keyId,
    window_start: windowStart.toISOString(),
    request_count: 1,
  })

  return {
    allowed: true,
    limit: RATE_LIMIT,
    remaining: RATE_LIMIT - 1,
    reset: windowEnd,
  }
}

/**
 * Get rate limit headers for API response
 */
export function getRateLimitHeaders(rateLimit: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': rateLimit.limit.toString(),
    'X-RateLimit-Remaining': rateLimit.remaining.toString(),
    'X-RateLimit-Reset': rateLimit.reset.toISOString(),
  }
}
