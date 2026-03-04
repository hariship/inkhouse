import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { userDrafts } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getAuthUser } from '@/lib/auth'

// GET - Get user's current draft
export async function GET() {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const [draft] = await db
      .select()
      .from(userDrafts)
      .where(eq(userDrafts.user_id, authUser.userId))
      .limit(1)

    return NextResponse.json({
      success: true,
      data: draft || null,
    })
  } catch (error) {
    console.error('Fetch draft error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Save/update user's draft
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { title, description, content, category, image_url, featured, allow_comments } = body

    const [draft] = await db
      .insert(userDrafts)
      .values({
        user_id: authUser.userId,
        title: title || '',
        description: description || '',
        content: content || '',
        category: category || '',
        image_url: image_url || '',
        featured: featured || false,
        allow_comments: allow_comments !== false,
        updated_at: new Date(),
      })
      .onConflictDoUpdate({
        target: userDrafts.user_id,
        set: {
          title: title || '',
          description: description || '',
          content: content || '',
          category: category || '',
          image_url: image_url || '',
          featured: featured || false,
          allow_comments: allow_comments !== false,
          updated_at: new Date(),
        },
      })
      .returning()

    return NextResponse.json({
      success: true,
      data: draft,
    })
  } catch (error) {
    console.error('Save draft error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Clear user's draft (after successful publish)
export async function DELETE() {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    await db
      .delete(userDrafts)
      .where(eq(userDrafts.user_id, authUser.userId))

    return NextResponse.json({
      success: true,
      message: 'Draft deleted',
    })
  } catch (error) {
    console.error('Delete draft error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
