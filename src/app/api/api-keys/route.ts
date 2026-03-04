import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { apiKeys } from '@/lib/db/schema'
import { eq, and, count, desc } from 'drizzle-orm'
import { getAuthUser } from '@/lib/auth'
import { generateApiKey } from '@/lib/api-auth'
import { ApiKeyWithSecret, CreateApiKeyRequest } from '@/types'

// GET - List user's API keys
export async function GET() {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const keys = await db
      .select({
        id: apiKeys.id,
        user_id: apiKeys.user_id,
        name: apiKeys.name,
        key_prefix: apiKeys.key_prefix,
        last_used_at: apiKeys.last_used_at,
        expires_at: apiKeys.expires_at,
        status: apiKeys.status,
        created_at: apiKeys.created_at,
        updated_at: apiKeys.updated_at,
      })
      .from(apiKeys)
      .where(eq(apiKeys.user_id, authUser.userId))
      .orderBy(desc(apiKeys.created_at))

    return NextResponse.json({
      success: true,
      data: keys,
    })
  } catch (error) {
    console.error('Fetch API keys error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create new API key
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body: CreateApiKeyRequest = await request.json()
    const { name, expires_in_days } = body

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Key name is required' },
        { status: 400 }
      )
    }

    if (name.length > 100) {
      return NextResponse.json(
        { success: false, error: 'Key name must be 100 characters or less' },
        { status: 400 }
      )
    }

    // Check key limit (max 5 keys per user)
    const [{ total }] = await db
      .select({ total: count() })
      .from(apiKeys)
      .where(and(eq(apiKeys.user_id, authUser.userId), eq(apiKeys.status, 'active')))

    if (total >= 5) {
      return NextResponse.json(
        { success: false, error: 'Maximum of 5 active API keys allowed' },
        { status: 400 }
      )
    }

    // Generate key
    const { key, hash, prefix } = generateApiKey()

    // Calculate expiration
    let expiresAt: Date | null = null
    if (expires_in_days && expires_in_days > 0) {
      expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + expires_in_days)
    }

    // Insert key
    const [apiKey] = await db
      .insert(apiKeys)
      .values({
        user_id: authUser.userId,
        name: name.trim(),
        key_hash: hash,
        key_prefix: prefix,
        expires_at: expiresAt,
      })
      .returning({
        id: apiKeys.id,
        user_id: apiKeys.user_id,
        name: apiKeys.name,
        key_prefix: apiKeys.key_prefix,
        last_used_at: apiKeys.last_used_at,
        expires_at: apiKeys.expires_at,
        status: apiKeys.status,
        created_at: apiKeys.created_at,
        updated_at: apiKeys.updated_at,
      })

    // Return key with secret (only time it's shown)
    const keyWithSecret: ApiKeyWithSecret = {
      ...apiKey,
      secret: key,
    }

    return NextResponse.json({
      success: true,
      data: keyWithSecret,
    })
  } catch (error) {
    console.error('Create API key error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
