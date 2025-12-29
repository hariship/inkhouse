import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser()
    if (!authUser || authUser.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const supabase = createServerClient()

    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 503 }
      )
    }

    // Get counts in parallel
    const [usersResult, postsResult, requestsResult, subscribersResult] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('posts').select('*', { count: 'exact', head: true }),
      supabase.from('membership_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('subscribers').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    ])

    return NextResponse.json({
      success: true,
      data: {
        totalUsers: usersResult.count || 0,
        totalPosts: postsResult.count || 0,
        pendingRequests: requestsResult.count || 0,
        subscribers: subscribersResult.count || 0,
      },
    })
  } catch (error) {
    console.error('Fetch stats error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
