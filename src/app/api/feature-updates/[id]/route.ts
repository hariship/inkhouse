import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
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

    const supabase = createServerClient()
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 503 }
      )
    }

    const { error } = await supabase
      .from('feature_updates')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Delete feature update error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to delete update' },
        { status: 500 }
      )
    }

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
