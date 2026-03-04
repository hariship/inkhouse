import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { critiques } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
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

    const [critique] = await db
      .select({ id: critiques.id, author_id: critiques.author_id })
      .from(critiques)
      .where(eq(critiques.id, id))
      .limit(1)

    if (!critique) {
      return NextResponse.json(
        { success: false, error: 'Critique not found' },
        { status: 404 }
      )
    }

    if (critique.author_id !== authUser.userId) {
      return NextResponse.json(
        { success: false, error: 'You can only delete your own critiques' },
        { status: 403 }
      )
    }

    await db
      .update(critiques)
      .set({ status: 'deleted' })
      .where(eq(critiques.id, id))

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
