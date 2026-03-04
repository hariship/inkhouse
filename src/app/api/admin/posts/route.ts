import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { posts, users } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { getAuthUser, isAdmin } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser()
    if (!authUser || !isAdmin(authUser)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const allPosts = await db
      .select({
        id: posts.id,
        title: posts.title,
        normalized_title: posts.normalized_title,
        description: posts.description,
        content: posts.content,
        category: posts.category,
        image_url: posts.image_url,
        status: posts.status,
        featured: posts.featured,
        allow_comments: posts.allow_comments,
        type: posts.type,
        author_id: posts.author_id,
        pub_date: posts.pub_date,
        updated_at: posts.updated_at,
        author: {
          id: users.id,
          username: users.username,
          display_name: users.display_name,
        },
      })
      .from(posts)
      .leftJoin(users, eq(posts.author_id, users.id))
      .orderBy(desc(posts.updated_at))

    return NextResponse.json({
      success: true,
      data: allPosts,
    })
  } catch (error) {
    console.error('Fetch posts error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
