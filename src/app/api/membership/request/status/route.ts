import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'

// GET - Check if current user has a pending membership request
export async function GET() {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServerClient()
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 503 })
    }

    // Get user email
    const { data: user } = await supabase
      .from('users')
      .select('email')
      .eq('id', authUser.userId)
      .single()

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    }

    // Check for pending request
    const { data: request } = await supabase
      .from('membership_requests')
      .select('id, status, created_at')
      .eq('email', user.email)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    return NextResponse.json({
      success: true,
      data: request || null
    })
  } catch (error) {
    console.error('Check request status error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
