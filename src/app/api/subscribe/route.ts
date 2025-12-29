import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, name, categories, frequency } = body

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
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

    // Check if already subscribed
    const { data: existing } = await supabase
      .from('subscribers')
      .select('id, status')
      .eq('email', email.toLowerCase())
      .single()

    if (existing) {
      if (existing.status === 'active') {
        return NextResponse.json(
          { success: false, error: 'This email is already subscribed' },
          { status: 400 }
        )
      }

      // Reactivate subscription
      await supabase
        .from('subscribers')
        .update({
          status: 'active',
          name: name || null,
          categories: categories || null,
          frequency: frequency || 'weekly',
        })
        .eq('id', existing.id)

      return NextResponse.json({
        success: true,
        message: 'Subscription reactivated',
      })
    }

    // Create new subscription
    const { error } = await supabase.from('subscribers').insert({
      email: email.toLowerCase(),
      name: name || null,
      categories: categories || null,
      frequency: frequency || 'weekly',
      status: 'active',
    })

    if (error) {
      console.error('Subscribe error:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to subscribe' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Subscribed successfully',
    })
  } catch (error) {
    console.error('Subscribe error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
