import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'

// DELETE - Revoke API key
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params

    const supabase = createServerClient()
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 503 }
      )
    }

    // Check ownership
    const { data: existingKey, error: fetchError } = await supabase
      .from('api_keys')
      .select('id, user_id')
      .eq('id', id)
      .single()

    if (fetchError || !existingKey) {
      return NextResponse.json(
        { success: false, error: 'API key not found' },
        { status: 404 }
      )
    }

    if (existingKey.user_id !== authUser.userId) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      )
    }

    // Revoke the key (soft delete by changing status)
    const { error: updateError } = await supabase
      .from('api_keys')
      .update({ status: 'revoked' })
      .eq('id', id)

    if (updateError) {
      console.error('Revoke API key error:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to revoke API key' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'API key revoked',
    })
  } catch (error) {
    console.error('Revoke API key error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
