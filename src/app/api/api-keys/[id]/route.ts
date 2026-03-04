import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { apiKeys } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
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

    // Check ownership
    const [existingKey] = await db
      .select({ id: apiKeys.id, user_id: apiKeys.user_id })
      .from(apiKeys)
      .where(eq(apiKeys.id, id))
      .limit(1)

    if (!existingKey) {
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
    await db
      .update(apiKeys)
      .set({ status: 'revoked' })
      .where(eq(apiKeys.id, id))

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
