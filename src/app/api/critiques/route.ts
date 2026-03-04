import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { critiques, posts, users } from '@/lib/db/schema'
import { eq, and, asc } from 'drizzle-orm'
import { getAuthUser } from '@/lib/auth'
import { sendNewCritiqueNotification } from '@/lib/email'

// GET - Get critiques for a post (only visible to post author)
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const postId = searchParams.get('postId')

    if (!postId) {
      return NextResponse.json(
        { success: false, error: 'Post ID is required' },
        { status: 400 }
      )
    }

    const [post] = await db
      .select({ id: posts.id, author_id: posts.author_id, title: posts.title })
      .from(posts)
      .where(eq(posts.id, parseInt(postId)))
      .limit(1)

    if (!post) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      )
    }

    if (post.author_id !== authUser.userId) {
      return NextResponse.json(
        { success: false, error: 'Only the post author can view critiques' },
        { status: 403 }
      )
    }

    const result = await db
      .select({
        id: critiques.id,
        post_id: critiques.post_id,
        author_id: critiques.author_id,
        content: critiques.content,
        parent_id: critiques.parent_id,
        status: critiques.status,
        created_at: critiques.created_at,
        updated_at: critiques.updated_at,
        author: {
          id: users.id,
          username: users.username,
          display_name: users.display_name,
          avatar_url: users.avatar_url,
        },
      })
      .from(critiques)
      .leftJoin(users, eq(critiques.author_id, users.id))
      .where(and(eq(critiques.post_id, parseInt(postId)), eq(critiques.status, 'active')))
      .orderBy(asc(critiques.created_at))

    const rootCritiques = result.filter((c) => !c.parent_id)
    const replies = result.filter((c) => c.parent_id)

    const threaded = rootCritiques.map((critique) => ({
      ...critique,
      replies: replies.filter((r) => r.parent_id === critique.id),
    }))

    return NextResponse.json({
      success: true,
      data: threaded,
    })
  } catch (error) {
    console.error('Fetch critiques error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create a critique (writers only, cannot critique own posts)
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    if (!['writer', 'admin', 'super_admin'].includes(authUser.role)) {
      return NextResponse.json(
        { success: false, error: 'Only writers can leave critiques' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { post_id, content, parent_id } = body

    if (!post_id || !content) {
      return NextResponse.json(
        { success: false, error: 'Post ID and content are required' },
        { status: 400 }
      )
    }

    if (content.trim().length < 10) {
      return NextResponse.json(
        { success: false, error: 'Critique must be at least 10 characters' },
        { status: 400 }
      )
    }

    // Get post and author info
    const [post] = await db
      .select({
        id: posts.id,
        title: posts.title,
        normalized_title: posts.normalized_title,
        author_id: posts.author_id,
      })
      .from(posts)
      .where(and(eq(posts.id, post_id), eq(posts.status, 'published')))
      .limit(1)

    if (!post) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      )
    }

    if (post.author_id === authUser.userId) {
      return NextResponse.json(
        { success: false, error: 'You cannot critique your own post' },
        { status: 403 }
      )
    }

    // Get critiquer and post author info for notification
    const [critiquer] = await db
      .select({ display_name: users.display_name })
      .from(users)
      .where(eq(users.id, authUser.userId))
      .limit(1)

    if (parent_id) {
      const [parentCritique] = await db
        .select({ id: critiques.id, post_id: critiques.post_id })
        .from(critiques)
        .where(and(eq(critiques.id, parent_id), eq(critiques.status, 'active')))
        .limit(1)

      if (!parentCritique || parentCritique.post_id !== post_id) {
        return NextResponse.json(
          { success: false, error: 'Invalid parent critique' },
          { status: 400 }
        )
      }
    }

    const [critique] = await db
      .insert(critiques)
      .values({
        post_id,
        author_id: authUser.userId,
        content: content.trim(),
        parent_id: parent_id || null,
        status: 'active',
      })
      .returning()

    // Send email notification to post author (non-blocking)
    if (!parent_id) {
      const [postAuthor] = await db
        .select({ email: users.email, display_name: users.display_name })
        .from(users)
        .where(eq(users.id, post.author_id))
        .limit(1)

      if (postAuthor?.email) {
        sendNewCritiqueNotification({
          to: postAuthor.email,
          authorName: postAuthor.display_name,
          postTitle: post.title,
          postSlug: post.normalized_title,
          critiquerName: critiquer?.display_name || authUser.username,
        }).catch((err) => console.error('Failed to send critique notification:', err))
      }
    }

    return NextResponse.json({
      success: true,
      data: critique,
    })
  } catch (error) {
    console.error('Create critique error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
