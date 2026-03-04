import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { pageViews } from '@/lib/db/schema'

// POST - Track a page view
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { post_id } = body

    if (!post_id) {
      return NextResponse.json({ success: false }, { status: 400 })
    }

    await db.insert(pageViews).values({
      post_id: parseInt(post_id, 10),
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
