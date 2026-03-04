import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { posts, users } from '@/lib/db/schema'
import { eq, and, desc, count } from 'drizzle-orm'

// GET - List published desk posts (public)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit

    const whereClause = and(eq(posts.status, 'published'), eq(posts.type, 'desk'))

    const [{ total }] = await db
      .select({ total: count() })
      .from(posts)
      .where(whereClause)

    const result = await db
      .select({
        id: posts.id,
        title: posts.title,
        normalized_title: posts.normalized_title,
        description: posts.description,
        image_url: posts.image_url,
        content: posts.content,
        category: posts.category,
        enclosure: posts.enclosure,
        pub_date: posts.pub_date,
        updated_at: posts.updated_at,
        author_id: posts.author_id,
        status: posts.status,
        featured: posts.featured,
        allow_comments: posts.allow_comments,
        type: posts.type,
        author: {
          id: users.id,
          username: users.username,
          display_name: users.display_name,
          avatar_url: users.avatar_url,
          bio: users.bio,
        },
      })
      .from(posts)
      .leftJoin(users, eq(posts.author_id, users.id))
      .where(whereClause)
      .orderBy(desc(posts.pub_date))
      .limit(limit)
      .offset(offset)

    const response = NextResponse.json({
      success: true,
      data: result,
      pagination: {
        page,
        limit,
        total: total || 0,
        totalPages: Math.ceil((total || 0) / limit),
      },
    })

    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
    return response
  } catch (error) {
    console.error('Fetch desk posts error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
