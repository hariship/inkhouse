import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    if (authUser.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
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

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'newsletter'

    let count = 0

    if (type === 'newsletter') {
      // Count active subscribers
      const { count: subscriberCount } = await supabase
        .from('subscribers')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')

      count = subscriberCount || 0
    } else if (type === 'announcement') {
      // Count all active users
      const { count: userCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')

      count = userCount || 0
    } else if (type === 'writers') {
      // Count active writers (writer, admin, super_admin roles)
      const { count: writerCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .in('role', ['writer', 'admin', 'super_admin'])

      count = writerCount || 0
    } else if (type === 'readers') {
      // Count active readers only
      const { count: readerCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .eq('role', 'reader')

      count = readerCount || 0
    }

    return NextResponse.json({
      success: true,
      data: { type, count },
    })
  } catch (error) {
    console.error('Get recipients error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
