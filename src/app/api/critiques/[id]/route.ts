import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'

// DELETE - Delete a critique (only the critique author can delete)
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

    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Critique ID is required' },
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

    // Get the critique
    const { data: critique, error: fetchError } = await supabase
      .from('critiques')
      .select('id, author_id')
      .eq('id', id)
      .single()

    if (fetchError || !critique) {
      return NextResponse.json(
        { success: false, error: 'Critique not found' },
        { status: 404 }
      )
    }

    // Only the critique author can delete it
    if (critique.author_id !== authUser.userId) {
      return NextResponse.json(
        { success: false, error: 'You can only delete your own critiques' },
        { status: 403 }
      )
    }

    // Soft delete by updating status
    const { error } = await supabase
      .from('critiques')
      .update({ status: 'deleted' })
      .eq('id', id)

    if (error) {
      console.error('Delete critique error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to delete critique' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Critique deleted',
    })
  } catch (error) {
    console.error('Delete critique error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
