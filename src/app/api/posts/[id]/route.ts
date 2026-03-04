import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { posts, users } from '@/lib/db/schema'
import { eq, ne, and } from 'drizzle-orm'
import { getAuthUser, isSuperAdmin, isAdmin } from '@/lib/auth'
import { sendNewPostNotification } from '@/lib/email'
import { deleteImage, extractPublicId, extractCloudinaryUrls } from '@/lib/cloudinary'

// GET - Get single post
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const isNumeric = /^\d+$/.test(id)

    const [post] = await db
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
          website_url: users.website_url,
          social_links: users.social_links,
        },
      })
      .from(posts)
      .leftJoin(users, eq(posts.author_id, users.id))
      .where(isNumeric ? eq(posts.id, parseInt(id)) : eq(posts.normalized_title, id))
      .limit(1)

    if (!post) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      )
    }

    const authUser = await getAuthUser()
    const isAuthor = authUser?.userId === post.author_id
    const hasAdminAccess = isAdmin(authUser)

    if (post.status !== 'published' && !isAuthor && !hasAdminAccess) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      )
    }

    const response = NextResponse.json({
      success: true,
      data: post,
    })

    if (post.status === 'published') {
      response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
    }
    return response
  } catch (error) {
    console.error('Fetch post error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH - Update post
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

    const [existingPost] = await db
      .select()
      .from(posts)
      .where(eq(posts.id, parseInt(id)))
      .limit(1)

    if (!existingPost) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      )
    }

    if (existingPost.type === 'desk') {
      const [fullUser] = await db
        .select({ role: users.role, email: users.email })
        .from(users)
        .where(eq(users.id, authUser.userId))
        .limit(1)

      if (!isSuperAdmin(fullUser)) {
        return NextResponse.json(
          { success: false, error: 'Only super admin can edit desk posts' },
          { status: 403 }
        )
      }
    } else if (existingPost.author_id !== authUser.userId && !isAdmin(authUser)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      )
    }

    const updateData: Record<string, unknown> = {}
    const allowedFields = ['title', 'description', 'content', 'category', 'image_url', 'status', 'featured', 'allow_comments']

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    if (body.title && body.title !== existingPost.title) {
      const normalizedTitle = body.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 100)

      const [existing] = await db
        .select({ id: posts.id })
        .from(posts)
        .where(and(eq(posts.normalized_title, normalizedTitle), ne(posts.id, parseInt(id))))
        .limit(1)

      updateData.normalized_title = existing
        ? `${normalizedTitle}-${Date.now()}`
        : normalizedTitle
    }

    if (body.status === 'published' && existingPost.status !== 'published') {
      updateData.pub_date = new Date()
    }

    const [post] = await db
      .update(posts)
      .set(updateData)
      .where(eq(posts.id, parseInt(id)))
      .returning()

    if (body.status === 'published' && existingPost.status !== 'published') {
      const [authorData] = await db
        .select({ display_name: users.display_name, username: users.username })
        .from(users)
        .where(eq(users.id, existingPost.author_id))
        .limit(1)

      if (authorData) {
        sendNewPostNotification({
          postTitle: post.title,
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
    console.error('Update post error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete post
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

    const [existingPost] = await db
      .select({
        author_id: posts.author_id,
        type: posts.type,
        image_url: posts.image_url,
        content: posts.content,
      })
      .from(posts)
      .where(eq(posts.id, parseInt(id)))
      .limit(1)

    if (!existingPost) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      )
    }

    if (existingPost.type === 'desk') {
      const [fullUser] = await db
        .select({ role: users.role, email: users.email })
        .from(users)
        .where(eq(users.id, authUser.userId))
        .limit(1)

      if (!isSuperAdmin(fullUser)) {
        return NextResponse.json(
          { success: false, error: 'Only super admin can delete desk posts' },
          { status: 403 }
        )
      }
    } else if (existingPost.author_id !== authUser.userId && !isAdmin(authUser)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      )
    }

    const cloudinaryUrls: string[] = []
    if (existingPost.image_url && existingPost.image_url.includes('res.cloudinary.com')) {
      cloudinaryUrls.push(existingPost.image_url)
    }
    cloudinaryUrls.push(...extractCloudinaryUrls(existingPost.content || ''))

    await db.delete(posts).where(eq(posts.id, parseInt(id)))

    const uniqueUrls = [...new Set(cloudinaryUrls)]
    for (const url of uniqueUrls) {
      const publicId = extractPublicId(url)
      if (publicId) {
        deleteImage(publicId).catch(err =>
          console.error(`Failed to delete Cloudinary image ${publicId}:`, err)
        )
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Post deleted',
    })
  } catch (error) {
    console.error('Delete post error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
