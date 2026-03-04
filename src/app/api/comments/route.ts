import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { comments, posts, users } from '@/lib/db/schema'
import { eq, and, asc } from 'drizzle-orm'
import { getAuthUser } from '@/lib/auth'

// GET - Get comments for a post
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const postId = searchParams.get('postId')

    if (!postId) {
      return NextResponse.json(
        { success: false, error: 'Post ID is required' },
        { status: 400 }
      )
    }

    const result = await db
      .select({
        id: comments.id,
        post_id: comments.post_id,
        author_name: comments.author_name,
        author_email: comments.author_email,
        author_id: comments.author_id,
        content: comments.content,
        parent_id: comments.parent_id,
        status: comments.status,
        created_at: comments.created_at,
        updated_at: comments.updated_at,
        author: {
          id: users.id,
          username: users.username,
          display_name: users.display_name,
          avatar_url: users.avatar_url,
        },
      })
      .from(comments)
      .leftJoin(users, eq(comments.author_id, users.id))
      .where(
        and(
          eq(comments.post_id, parseInt(postId)),
          eq(comments.status, 'approved')
        )
      )
      .orderBy(asc(comments.created_at))

    // Organize into threads
    const rootComments = result.filter((c) => !c.parent_id)
    const replies = result.filter((c) => c.parent_id)

    const threaded = rootComments.map((comment) => ({
      ...comment,
      replies: replies.filter((r) => r.parent_id === comment.id),
    }))

    return NextResponse.json({
      success: true,
      data: threaded,
    })
  } catch (error) {
    console.error('Fetch comments error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Add a comment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { post_id, content, author_name, author_email, parent_id } = body

    if (!post_id || !content || !author_name) {
      return NextResponse.json(
        { success: false, error: 'Post ID, content, and author name are required' },
        { status: 400 }
      )
    }

    // Check if post exists and allows comments
    const [post] = await db
      .select({ id: posts.id, allow_comments: posts.allow_comments })
      .from(posts)
      .where(and(eq(posts.id, post_id), eq(posts.status, 'published')))
      .limit(1)

    if (!post) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      )
    }

    if (!post.allow_comments) {
      return NextResponse.json(
        { success: false, error: 'Comments are disabled for this post' },
        { status: 403 }
      )
    }

    const authUser = await getAuthUser()

    let finalAuthorName = author_name
    if (authUser) {
      const [user] = await db
        .select({ display_name: users.display_name })
        .from(users)
        .where(eq(users.id, authUser.userId))
        .limit(1)
      finalAuthorName = user?.display_name || author_name
    }

    const [comment] = await db
      .insert(comments)
      .values({
        post_id,
        content,
        author_name: finalAuthorName,
        author_email: authUser ? null : author_email,
        author_id: authUser?.userId || null,
        parent_id: parent_id || null,
        status: 'approved',
      })
      .returning()

    return NextResponse.json({
      success: true,
      data: comment,
    })
  } catch (error) {
    console.error('Create comment error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
