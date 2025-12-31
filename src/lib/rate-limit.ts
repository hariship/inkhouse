import { createServerClient } from '@/lib/supabase'

const RATE_LIMIT = 1000 // requests per hour
const WINDOW_MS = 60 * 60 * 1000 // 1 hour in milliseconds

// Rate limit configs for different endpoints
// Generous limits - just basic abuse protection
const RATE_LIMITS = {
  login: { limit: 100, windowMs: 15 * 60 * 1000 }, // 100 attempts per 15 minutes
  membershipRequest: { limit: 50, windowMs: 60 * 60 * 1000 }, // 50 per hour
  comments: { limit: 200, windowMs: 60 * 1000 }, // 200 per minute
  likes: { limit: 500, windowMs: 60 * 1000 }, // 500 per minute
  api: { limit: 50000, windowMs: 60 * 60 * 1000 }, // 50,000 per hour
} as const

type RateLimitType = keyof typeof RATE_LIMITS

// In-memory store for IP-based rate limiting (simple implementation)
// For production, use Redis or database
const ipRateLimits = new Map<string, { count: number; resetAt: number }>()

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

/**
 * Check rate limit by IP address for specific endpoint types
 */
export function checkIpRateLimit(ip: string, type: RateLimitType): RateLimitResult {
  const config = RATE_LIMITS[type]
  const key = `${type}:${ip}`
  const now = Date.now()

  // Clean up expired entries periodically
  if (Math.random() < 0.01) {
    for (const [k, v] of ipRateLimits.entries()) {
      if (v.resetAt < now) {
        ipRateLimits.delete(k)
      }
    }
  }

  const existing = ipRateLimits.get(key)

  if (existing) {
    // Check if window has expired
    if (existing.resetAt < now) {
      // Reset the window
      ipRateLimits.set(key, { count: 1, resetAt: now + config.windowMs })
      return {
        allowed: true,
        limit: config.limit,
        remaining: config.limit - 1,
        reset: new Date(now + config.windowMs),
      }
    }

    // Check if limit exceeded
    if (existing.count >= config.limit) {
      return {
        allowed: false,
        limit: config.limit,
        remaining: 0,
        reset: new Date(existing.resetAt),
      }
    }

    // Increment counter
    existing.count++
    return {
      allowed: true,
      limit: config.limit,
      remaining: config.limit - existing.count,
      reset: new Date(existing.resetAt),
    }
  }

  // Create new entry
  ipRateLimits.set(key, { count: 1, resetAt: now + config.windowMs })
  return {
    allowed: true,
    limit: config.limit,
    remaining: config.limit - 1,
    reset: new Date(now + config.windowMs),
  }
}

/**
 * Get client IP from request
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }
  return '127.0.0.1'
}
