import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, isSuperAdmin } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase'
import { sendNewsletter } from '@/lib/email'

const NEW_YEAR_2025_HTML = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #374151;">
  <p style="font-size: 16px; line-height: 1.8;">Hi there,</p>

  <p style="font-size: 16px; line-height: 1.8;">
    As we step into 2025, I wanted to take a moment to thank you for being part of Inkhouse.
  </p>

  <p style="font-size: 16px; line-height: 1.8;">
    This past year, I've been thinking deeply about what it means to read online. In a world of endless feeds and algorithmic recommendations, I wanted Inkhouse to feel different. A place where <em>you</em> decide what to read, when to read it, and how to organize your reading life.
  </p>

  <h3 style="color: #0D9488; margin-top: 32px;">Your reading, your way</h3>
  <p style="font-size: 16px; line-height: 1.8;">
    You can now track what you've read and what's waiting for you. No pressure, no notifications nagging you. Just a simple way to know where you left off. When you've caught up, you'll simply see "You're all caught up!" and that's it.
  </p>

  <h3 style="color: #0D9488; margin-top: 32px;">Boxes for your thoughts</h3>
  <p style="font-size: 16px; line-height: 1.8;">
    Found a post you want to save for later? Create a box. Call it "Weekend reads" or "Ideas to revisit" or whatever makes sense to you. Your boxes are yours. A personal library that grows with your interests.
  </p>

  <h3 style="color: #0D9488; margin-top: 32px;">A home on any screen</h3>
  <p style="font-size: 16px; line-height: 1.8;">
    Whether you're reading on your phone during a commute or at your desk with a cup of coffee, Inkhouse adapts. On mobile, I've made things lighter and faster. Compact views that get out of your way and let the words breathe.
  </p>

  <h3 style="color: #0D9488; margin-top: 32px;">From the Desk</h3>
  <p style="font-size: 16px; line-height: 1.8;">
    I've also created a little corner called "From the Desk". A place for updates, stories, and reflections from behind the scenes at Inkhouse.
  </p>

  <div style="border-top: 1px solid #e5e7eb; margin-top: 40px; padding-top: 24px;">
    <p style="font-size: 16px; line-height: 1.8;">
      Thank you for reading, for writing, and for being here. Here's to more words, more stories, and more moments of connection in 2025.
    </p>

    <p style="font-size: 16px; line-height: 1.8;">
      Happy New Year!
    </p>

    <p style="font-size: 16px; line-height: 1.8; margin-top: 24px;">
      Warm regards,<br/>
      Haripriya
    </p>
  </div>

  <p style="font-size: 12px; color: #9ca3af; margin-top: 40px; text-align: center;">
    <a href="https://inkhouse.haripriya.org" style="color: #0D9488;">Inkhouse</a>. A home for writers
  </p>
</div>
`

export async function POST(request: NextRequest) {
  try {
    // Verify super admin
    const user = await getAuthUser()
    if (!user || !isSuperAdmin(user)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check for specific emails in request body
    let targetEmails: string[] | null = null
    try {
      const body = await request.json()
      if (body.emails && Array.isArray(body.emails)) {
        targetEmails = body.emails
      }
    } catch {
      // No body or invalid JSON, send to all
    }

    const supabase = createServerClient()
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 500 }
      )
    }

    // Get users (all active or specific emails)
    let query = supabase
      .from('users')
      .select('id, email, display_name')
      .eq('status', 'active')

    if (targetEmails) {
      query = query.in('email', targetEmails)
    }

    const { data: users, error } = await query

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch users' },
        { status: 500 }
      )
    }

    if (!users || users.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No users found' },
        { status: 404 }
      )
    }

    // Send to all users with delay to avoid rate limits
    const results = {
      total: users.length,
      sent: 0,
      failed: 0,
      errors: [] as string[],
    }

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

    for (const user of users) {
      const result = await sendNewsletter({
        to: user.email,
        name: user.display_name,
        subject: 'Happy New Year from Inkhouse 🎉',
        html: NEW_YEAR_2025_HTML,
      })

      if (result.success) {
        results.sent++
      } else {
        results.failed++
        results.errors.push(`${user.email}: ${result.error}`)
      }

      // Wait 600ms between emails (under 2/sec rate limit)
      await delay(600)
    }

    return NextResponse.json({
      success: true,
      message: `Newsletter sent to ${results.sent}/${results.total} users`,
      results,
    })
  } catch (error) {
    console.error('Newsletter send error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
