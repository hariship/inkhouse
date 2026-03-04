import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { readingLists, readingListItems, posts, users } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { getAuthUser } from '@/lib/auth'

// GET - Get a single reading list with items
export async function GET(
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

    const [list] = await db
      .select()
      .from(readingLists)
      .where(and(eq(readingLists.id, id), eq(readingLists.user_id, authUser.userId)))
      .limit(1)

    if (!list) {
      return NextResponse.json(
        { success: false, error: 'Reading list not found' },
        { status: 404 }
      )
    }

    // Get items with post details
    const items = await db
      .select({
        id: readingListItems.id,
        post_id: readingListItems.post_id,
        added_at: readingListItems.added_at,
        post: {
          id: posts.id,
          title: posts.title,
          normalized_title: posts.normalized_title,
          description: posts.description,
          image_url: posts.image_url,
          category: posts.category,
          pub_date: posts.pub_date,
          author_id: posts.author_id,
        },
      })
      .from(readingListItems)
      .leftJoin(posts, eq(readingListItems.post_id, posts.id))
      .where(eq(readingListItems.list_id, id))

    return NextResponse.json({
      success: true,
      data: {
        ...list,
        items,
        item_count: items.length,
      },
    })
  } catch (error) {
    console.error('Get reading list error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH - Update reading list
export async function PATCH(
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
    const body = await request.json()
    const { name, description } = body

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name.trim()
    if (description !== undefined) updateData.description = description?.trim() || null

    const [list] = await db
      .update(readingLists)
      .set(updateData)
      .where(and(eq(readingLists.id, id), eq(readingLists.user_id, authUser.userId)))
      .returning()

    if (!list) {
      return NextResponse.json(
        { success: false, error: 'Reading list not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: list,
    })
  } catch (error) {
    console.error('Update reading list error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete reading list
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

    await db
      .delete(readingLists)
      .where(and(eq(readingLists.id, id), eq(readingLists.user_id, authUser.userId)))

    return NextResponse.json({
      success: true,
      message: 'Reading list deleted',
    })
  } catch (error) {
    console.error('Delete reading list error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
