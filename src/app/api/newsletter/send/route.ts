import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, isSuperAdmin } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase'
import { sendNewsletter } from '@/lib/email'

const NEWSLETTER_HTML = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #374151;">
  <p style="font-size: 12px; color: #9ca3af; margin-bottom: 24px;">
    January 1, 2026 · 1 min read
  </p>

  <p style="font-size: 16px; line-height: 1.8;">
    Today, I introduced a couple of features to Inkhouse, intentionally avoiding likes, subscriptions, and notifications.
  </p>

  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />

  <p style="font-size: 16px; line-height: 1.8;">
    A single "like" flattens too much. You may appreciate the writing but not agree with the idea. You may agree with the idea but not the way it is expressed. You may simply want to think about it longer. Reducing all of that to one action takes away the reader's agency.
  </p>

  <p style="font-size: 16px; line-height: 1.8;">
    Instead, Inkhouse treats reading as a relationship, not a reaction. You can mark something as read, return to it later, or save it into a <strong>Box</strong> if it matters to you. Boxes exist so that writing can be revisited, not just acknowledged and forgotten.
  </p>

  <p style="font-size: 16px; line-height: 1.8; font-style: italic; color: #0D9488;">
    If an idea stays with you, it deserves a place, not a count.
  </p>

  <p style="font-size: 16px; line-height: 1.8;">
    Discussions remain open through comments. Nothing demands a response.
  </p>

  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;" />

  <p style="font-size: 16px; line-height: 1.8;">
    Platform decisions follow the same philosophy.
  </p>

  <p style="font-size: 16px; line-height: 1.8;">
    Inkhouse is an open source project. While I run the platform, I do not believe decisions about its direction should be made unilaterally. Writers can propose ideas, discuss them, and vote. When a suggestion receives majority support, it becomes a real signal to act. If more than half the writers want something, I commit to implementing it.
  </p>

  <p style="font-size: 16px; line-height: 1.8;">
    I introduced a feature where &gt;50% of upvotes on any suggestion will be notified to me and raised as a GitHub issue.
  </p>

  <p style="font-size: 16px; line-height: 1.8; font-style: italic; color: #0D9488;">
    Nothing ships silently. Nothing is decided in private.
  </p>

  <p style="font-size: 16px; line-height: 1.8;">
    The intention is to build like a library. Shaped by its readers and writers, and governed by the people who choose to stay.
  </p>

  <p style="font-size: 16px; line-height: 1.8; margin-top: 24px;">
    Warm regards,<br/>
    Haripriya
  </p>

  <p style="font-size: 12px; color: #9ca3af; margin-top: 40px; text-align: center;">
    <a href="https://inkhouse.haripriya.org" style="color: #0D9488;">Inkhouse</a> · A home for writers
  </p>
</div>
`

export async function POST(request: NextRequest) {
  console.log('=== SENDING NEW NEWSLETTER: Writing Together, Deciding Together ===')
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
        subject: 'Writing Together, Deciding Together',
        html: NEWSLETTER_HTML,
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
