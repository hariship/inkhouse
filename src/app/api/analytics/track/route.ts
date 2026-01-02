import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// POST - Track a page view (fire-and-forget, non-blocking)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { post_id } = body

    if (!post_id) {
      return NextResponse.json({ success: false }, { status: 400 })
    }

    const supabase = createServerClient()
    if (!supabase) {
      return NextResponse.json({ success: false }, { status: 503 })
    }

    // Insert page view (minimal data for performance)
    await supabase.from('page_views').insert({
      post_id: parseInt(post_id, 10),
    })

    return NextResponse.json({ success: true })
  } catch {
    // Fail silently - analytics should never break the user experience
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
