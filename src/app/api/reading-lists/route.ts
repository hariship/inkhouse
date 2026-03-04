import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { readingLists, readingListItems } from '@/lib/db/schema'
import { eq, desc, count } from 'drizzle-orm'
import { getAuthUser } from '@/lib/auth'

// GET - Get user's reading lists
export async function GET() {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const lists = await db
      .select()
      .from(readingLists)
      .where(eq(readingLists.user_id, authUser.userId))
      .orderBy(desc(readingLists.updated_at))

    // Get item counts for each list
    const listsWithCount = await Promise.all(
      lists.map(async (list) => {
        const [{ total }] = await db
          .select({ total: count() })
          .from(readingListItems)
          .where(eq(readingListItems.list_id, list.id))

        return {
          ...list,
          item_count: total || 0,
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: listsWithCount,
    })
  } catch (error) {
    console.error('Get reading lists error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create new reading list
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { name, description } = await request.json()

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      )
    }

    const [list] = await db
      .insert(readingLists)
      .values({
        user_id: authUser.userId,
        name: name.trim(),
        description: description?.trim() || null,
      })
      .returning()

    return NextResponse.json({
      success: true,
      data: { ...list, item_count: 0 },
    })
  } catch (error) {
    console.error('Create reading list error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
