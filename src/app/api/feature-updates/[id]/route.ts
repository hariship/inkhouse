import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { featureUpdates } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getAuthUser } from '@/lib/auth'

// DELETE - Delete feature update (super_admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Only super_admin can delete updates
    if (authUser.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'Only super admin can delete feature updates' },
        { status: 403 }
      )
    }

    const { id } = await params

    await db
      .delete(featureUpdates)
      .where(eq(featureUpdates.id, id))

    return NextResponse.json({
      success: true,
      message: 'Update deleted',
    })
  } catch (error) {
    console.error('Delete feature update error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
