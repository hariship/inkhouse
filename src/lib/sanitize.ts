/**
 * Input sanitization utilities
 */

/**
 * Sanitize HTML to prevent XSS attacks
 * Removes script tags and event handlers
 */
export function sanitizeHtml(input: string): string {
  if (!input) return ''

  return input
    // Remove script tags and content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove event handlers
    .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '')
    // Remove javascript: URLs
    .replace(/javascript:/gi, '')
    // Remove data: URLs in src/href (potential XSS vector)
    .replace(/(src|href)\s*=\s*["']?\s*data:/gi, '$1="')
}

/**
 * Sanitize plain text - escape HTML entities
 */
export function escapeHtml(input: string): string {
  if (!input) return ''

  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
  }

  return input.replace(/[&<>"']/g, (char) => htmlEntities[char])
}

/**
 * Sanitize string for safe database queries
 * Note: Always use parameterized queries - this is an extra layer
 */
export function sanitizeString(input: string): string {
  if (!input) return ''

  return input
    .trim()
    // Remove null bytes
    .replace(/\0/g, '')
    // Limit length to prevent DoS
    .substring(0, 10000)
}

/**
 * Sanitize email address
 */
export function sanitizeEmail(email: string): string {
  if (!email) return ''

  return email
    .toLowerCase()
    .trim()
    .substring(0, 254) // Max email length per RFC
}

/**
 * Sanitize username - only allow alphanumeric and underscores
 */
export function sanitizeUsername(username: string): string {
  if (!username) return ''

  return username
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_]/g, '')
    .substring(0, 50)
}

/**
 * Validate and sanitize URL
 */
export function sanitizeUrl(url: string): string | null {
  if (!url) return null

  try {
    const parsed = new URL(url.trim())
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null
    }
    return parsed.toString()
  } catch {
    return null
  }
}

/**
 * Sanitize object keys and values recursively
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(obj)) {
    const sanitizedKey = sanitizeString(key)

    if (typeof value === 'string') {
      result[sanitizedKey] = sanitizeString(value)
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result[sanitizedKey] = sanitizeObject(value as Record<string, unknown>)
    } else {
      result[sanitizedKey] = value
    }
  }

  return result as T
}
