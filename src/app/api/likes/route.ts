import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import crypto from 'crypto'

// POST - Toggle like on a post
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { post_id } = body

    if (!post_id) {
      return NextResponse.json(
        { success: false, error: 'Post ID is required' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 503 }
      )
    }

    const authUser = await getAuthUser()

    // Get IP hash for anonymous likes
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    const ipHash = crypto.createHash('md5').update(ip).digest('hex')

    // Check existing like
    let query = supabase.from('likes').select('id').eq('post_id', post_id)

    if (authUser) {
      query = query.eq('user_id', authUser.userId)
    } else {
      query = query.eq('ip_hash', ipHash)
    }

    const { data: existingLike } = await query.single()

    if (existingLike) {
      // Unlike
      await supabase.from('likes').delete().eq('id', existingLike.id)

      // Get updated count
      const { count } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', post_id)

      return NextResponse.json({
        success: true,
        liked: false,
        count: count || 0,
      })
    } else {
      // Like
      await supabase.from('likes').insert({
        post_id,
        user_id: authUser?.userId || null,
        ip_hash: authUser ? null : ipHash,
      })

      // Get updated count
      const { count } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', post_id)

      return NextResponse.json({
        success: true,
        liked: true,
        count: count || 0,
      })
    }
  } catch (error) {
    console.error('Like error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET - Get like status and count
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

    const supabase = createServerClient()

    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 503 }
      )
    }

    const authUser = await getAuthUser()

    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    const ipHash = crypto.createHash('md5').update(ip).digest('hex')

    // Get count
    const { count } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId)

    // Check if user liked
    let liked = false
    let query = supabase.from('likes').select('id').eq('post_id', postId)

    if (authUser) {
      query = query.eq('user_id', authUser.userId)
    } else {
      query = query.eq('ip_hash', ipHash)
    }

    const { data: existingLike } = await query.single()
    liked = !!existingLike

    return NextResponse.json({
      success: true,
      liked,
      count: count || 0,
    })
  } catch (error) {
    console.error('Get like error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
