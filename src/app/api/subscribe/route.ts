import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { subscribers } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

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

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      )
    }

    const [existing] = await db
      .select({ id: subscribers.id, status: subscribers.status })
      .from(subscribers)
      .where(eq(subscribers.email, email.toLowerCase()))
      .limit(1)

    if (existing) {
      if (existing.status === 'active') {
        return NextResponse.json(
          { success: false, error: 'This email is already subscribed' },
          { status: 400 }
        )
      }

      // Reactivate subscription
      await db
        .update(subscribers)
        .set({
          status: 'active',
          name: name || null,
          categories: categories || null,
          frequency: frequency || 'weekly',
        })
        .where(eq(subscribers.id, existing.id))

      return NextResponse.json({
        success: true,
        message: 'Subscription reactivated',
      })
    }

    await db.insert(subscribers).values({
      email: email.toLowerCase(),
      name: name || null,
      categories: categories || null,
      frequency: frequency || 'weekly',
      status: 'active',
    })

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
