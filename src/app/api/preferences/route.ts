import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { userPreferences } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getAuthUser } from '@/lib/auth'

// GET - Get user preferences
export async function GET() {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const [data] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.user_id, authUser.userId))
      .limit(1)

    return NextResponse.json({
      success: true,
      data: data || {
        user_id: authUser.userId,
        view_mode: 'grid',
        default_sort: 'date',
        default_filter: 'unread',
      },
    })
  } catch (error) {
    console.error('Get preferences error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH - Update user preferences
export async function PATCH(request: NextRequest) {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { view_mode, default_sort, default_filter } = body

    if (view_mode && !['grid', 'list'].includes(view_mode)) {
      return NextResponse.json(
        { success: false, error: 'Invalid view mode' },
        { status: 400 }
      )
    }

    if (default_sort && !['date', 'category'].includes(default_sort)) {
      return NextResponse.json(
        { success: false, error: 'Invalid sort option' },
        { status: 400 }
      )
    }

    if (default_filter && !['all', 'unread', 'read', 'saved'].includes(default_filter)) {
      return NextResponse.json(
        { success: false, error: 'Invalid filter option' },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = {}
    if (view_mode) updateData.view_mode = view_mode
    if (default_sort) updateData.default_sort = default_sort
    if (default_filter) updateData.default_filter = default_filter

    const [data] = await db
      .insert(userPreferences)
      .values({
        user_id: authUser.userId,
        ...updateData,
      })
      .onConflictDoUpdate({
        target: userPreferences.user_id,
        set: { ...updateData, updated_at: new Date() },
      })
      .returning()

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error) {
    console.error('Update preferences error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
