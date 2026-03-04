import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users, posts } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params

    const [author] = await db
      .select({
        id: users.id,
        username: users.username,
        display_name: users.display_name,
        bio: users.bio,
        avatar_url: users.avatar_url,
        website_url: users.website_url,
        social_links: users.social_links,
        created_at: users.created_at,
      })
      .from(users)
      .where(and(eq(users.username, username), eq(users.status, 'active')))
      .limit(1)

    if (!author) {
      return NextResponse.json(
        { success: false, error: 'Author not found' },
        { status: 404 }
      )
    }

    const authorPosts = await db
      .select()
      .from(posts)
      .where(and(eq(posts.author_id, author.id), eq(posts.status, 'published')))
      .orderBy(desc(posts.pub_date))

    const response = NextResponse.json({
      success: true,
      data: {
        author,
        posts: authorPosts,
      },
    })

    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
    return response
  } catch (error) {
    console.error('Fetch author error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
