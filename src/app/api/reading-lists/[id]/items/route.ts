import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { readingLists, readingListItems } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { getAuthUser } from '@/lib/auth'

// POST - Add post to reading list
export async function POST(
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

    const { id: listId } = await params
    const { post_id } = await request.json()

    if (!post_id) {
      return NextResponse.json(
        { success: false, error: 'Post ID is required' },
        { status: 400 }
      )
    }

    // Verify list belongs to user
    const [list] = await db
      .select({ id: readingLists.id })
      .from(readingLists)
      .where(and(eq(readingLists.id, listId), eq(readingLists.user_id, authUser.userId)))
      .limit(1)

    if (!list) {
      return NextResponse.json(
        { success: false, error: 'Reading list not found' },
        { status: 404 }
      )
    }

    await db
      .insert(readingListItems)
      .values({
        list_id: listId,
        post_id: post_id,
      })
      .onConflictDoNothing()

    // Update list's updated_at
    await db
      .update(readingLists)
      .set({ updated_at: new Date() })
      .where(eq(readingLists.id, listId))

    return NextResponse.json({
      success: true,
      message: 'Added to reading list',
    })
  } catch (error) {
    console.error('Add to reading list error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Remove post from reading list
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

    const { id: listId } = await params
    const { searchParams } = new URL(request.url)
    const postId = searchParams.get('postId')

    if (!postId) {
      return NextResponse.json(
        { success: false, error: 'Post ID is required' },
        { status: 400 }
      )
    }

    // Verify list belongs to user
    const [list] = await db
      .select({ id: readingLists.id })
      .from(readingLists)
      .where(and(eq(readingLists.id, listId), eq(readingLists.user_id, authUser.userId)))
      .limit(1)

    if (!list) {
      return NextResponse.json(
        { success: false, error: 'Reading list not found' },
        { status: 404 }
      )
    }

    await db
      .delete(readingListItems)
      .where(and(eq(readingListItems.list_id, listId), eq(readingListItems.post_id, parseInt(postId))))

    return NextResponse.json({
      success: true,
      message: 'Removed from reading list',
    })
  } catch (error) {
    console.error('Remove from reading list error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
