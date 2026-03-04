import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { posts, users } from '@/lib/db/schema'
import { eq, and, or, ilike, desc, count, isNull } from 'drizzle-orm'
import { getAuthUser, isSuperAdmin } from '@/lib/auth'
import { sendNewPostNotification } from '@/lib/email'

// GET - List published posts (public)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10')))
    const category = searchParams.get('category')
    const author = searchParams.get('author')
    const search = searchParams.get('search')?.trim()
    const type = searchParams.get('type') || 'post'
    const offset = (page - 1) * limit

    // Build conditions
    const conditions = [eq(posts.status, 'published')]

    if (category) {
      conditions.push(eq(posts.category, category))
    }

    if (author) {
      conditions.push(eq(posts.author_id, author))
    }

    if (type === 'desk') {
      conditions.push(eq(posts.type, 'desk'))
    } else {
      conditions.push(or(eq(posts.type, 'post'), isNull(posts.type))!)
    }

    // Handle search
    let searchCondition
    if (search) {
      const matchingAuthors = await db
        .select({ id: users.id })
        .from(users)
        .where(or(ilike(users.display_name, `%${search}%`), ilike(users.username, `%${search}%`)))

      const searchFilters = [
        ilike(posts.title, `%${search}%`),
        ilike(posts.description, `%${search}%`),
        ilike(posts.category, `%${search}%`),
      ]

      for (const a of matchingAuthors) {
        searchFilters.push(eq(posts.author_id, a.id))
      }

      searchCondition = or(...searchFilters)
    }

    const whereClause = searchCondition
      ? and(...conditions, searchCondition)
      : and(...conditions)

    // Get total count
    const [{ total }] = await db
      .select({ total: count() })
      .from(posts)
      .where(whereClause)

    // Get posts with author
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
    console.error('Fetch posts error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create new post (authenticated)
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
    const { title, description, content, category, image_url, status, featured, allow_comments, type } = body

    if (!title || !content) {
      return NextResponse.json(
        { success: false, error: 'Title and content are required' },
        { status: 400 }
      )
    }

    const postType = type || 'post'
    if (postType === 'desk') {
      const [fullUser] = await db
        .select({ role: users.role, email: users.email })
        .from(users)
        .where(eq(users.id, authUser.userId))
        .limit(1)

      if (!isSuperAdmin(fullUser)) {
        return NextResponse.json(
          { success: false, error: 'Only super admin can create desk posts' },
          { status: 403 }
        )
      }
    }

    const normalizedTitle = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 100)

    const [existing] = await db
      .select({ id: posts.id })
      .from(posts)
      .where(eq(posts.normalized_title, normalizedTitle))
      .limit(1)

    const finalNormalizedTitle = existing
      ? `${normalizedTitle}-${Date.now()}`
      : normalizedTitle

    const [post] = await db
      .insert(posts)
      .values({
        title,
        normalized_title: finalNormalizedTitle,
        description: description || null,
        content,
        category: category || null,
        image_url: image_url || null,
        author_id: authUser.userId,
        status: status || 'draft',
        featured: featured || false,
        allow_comments: allow_comments !== false,
        pub_date: status === 'published' ? new Date() : null,
        type: postType,
      })
      .returning()

    if (status === 'published') {
      const [authorData] = await db
        .select({ display_name: users.display_name, username: users.username })
        .from(users)
        .where(eq(users.id, authUser.userId))
        .limit(1)

      if (authorData) {
        sendNewPostNotification({
          postTitle: title,
          postSlug: post.normalized_title,
          authorName: authorData.display_name,
          authorUsername: authorData.username,
        }).catch(err => console.error('Failed to send post notification:', err))
      }
    }

    return NextResponse.json({
      success: true,
      data: post,
    })
  } catch (error) {
    console.error('Create post error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
