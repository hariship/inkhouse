import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { generateApiKey } from '@/lib/api-auth'
import { ApiKey, ApiKeyWithSecret, CreateApiKeyRequest } from '@/types'

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

    const supabase = createServerClient()
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 503 }
      )
    }

    const { data: keys, error } = await supabase
      .from('api_keys')
      .select('id, user_id, name, key_prefix, last_used_at, expires_at, status, created_at, updated_at')
      .eq('user_id', authUser.userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Fetch API keys error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch API keys' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: keys as ApiKey[],
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

    const supabase = createServerClient()
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 503 }
      )
    }

    // Check key limit (max 5 keys per user)
    const { count } = await supabase
      .from('api_keys')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', authUser.userId)
      .eq('status', 'active')

    if (count !== null && count >= 5) {
      return NextResponse.json(
        { success: false, error: 'Maximum of 5 active API keys allowed' },
        { status: 400 }
      )
    }

    // Generate key
    const { key, hash, prefix } = generateApiKey()

    // Calculate expiration
    let expiresAt: string | null = null
    if (expires_in_days && expires_in_days > 0) {
      const expDate = new Date()
      expDate.setDate(expDate.getDate() + expires_in_days)
      expiresAt = expDate.toISOString()
    }

    // Insert key
    const { data: apiKey, error } = await supabase
      .from('api_keys')
      .insert({
        user_id: authUser.userId,
        name: name.trim(),
        key_hash: hash,
        key_prefix: prefix,
        expires_at: expiresAt,
      })
      .select('id, user_id, name, key_prefix, last_used_at, expires_at, status, created_at, updated_at')
      .single()

    if (error) {
      console.error('Create API key error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to create API key' },
        { status: 500 }
      )
    }

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
