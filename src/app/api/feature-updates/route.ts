import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { featureUpdates } from '@/lib/db/schema'
import { desc } from 'drizzle-orm'
import { getAuthUser } from '@/lib/auth'

// GET - List all feature updates
export async function GET() {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const updates = await db
      .select()
      .from(featureUpdates)
      .orderBy(desc(featureUpdates.created_at))

    return NextResponse.json({
      success: true,
      data: updates,
    })
  } catch (error) {
    console.error('Feature updates error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create feature update (super_admin only)
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Only super_admin can create updates
    if (authUser.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'Only super admin can create feature updates' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { title, description, category } = body

    if (!title?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Title is required' },
        { status: 400 }
      )
    }

    if (!category || !['new', 'improved', 'fixed'].includes(category)) {
      return NextResponse.json(
        { success: false, error: 'Valid category is required (new, improved, fixed)' },
        { status: 400 }
      )
    }

    const [update] = await db
      .insert(featureUpdates)
      .values({
        title: title.trim(),
        description: description?.trim() || null,
        category,
        created_by: authUser.userId,
      })
      .returning()

    return NextResponse.json({
      success: true,
      data: update,
    })
  } catch (error) {
    console.error('Create feature update error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
