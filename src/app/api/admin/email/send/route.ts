import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getAuthUser } from '@/lib/auth'
import { Resend } from 'resend'

const APP_NAME = 'Inkhouse'

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return null
  return new Resend(apiKey)
}

function wrapInTemplate(body: string): string {
  // Body is already HTML from rich text editor
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; padding: 20px;">
      <h1 style="color: #0D9488; margin-bottom: 24px;">${APP_NAME}</h1>
      <div style="color: #374151; font-size: 16px; line-height: 1.6;">
        ${body}
      </div>
      <hr style="margin: 32px 0; border: none; border-top: 1px solid #e5e7eb;"/>
      <p style="color: #6b7280; font-size: 12px;">
        You received this email from ${APP_NAME}.
      </p>
    </div>
  `
}

export async function POST(request: NextRequest) {
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

    const resend = getResendClient()
    if (!resend) {
      return NextResponse.json(
        { success: false, error: 'Email service not configured' },
        { status: 503 }
      )
    }

    const supabase = createServerClient()
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 503 }
      )
    }

    const { type, subject, body, customEmail } = await request.json()

    if (!subject?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Subject is required' },
        { status: 400 }
      )
    }

    if (!body?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Message body is required' },
        { status: 400 }
      )
    }

    if (!['newsletter', 'announcement', 'writers', 'readers', 'custom'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email type' },
        { status: 400 }
      )
    }

    const fromEmail = process.env.EMAIL_FROM || 'noreply@haripriya.org'
    const htmlContent = wrapInTemplate(body)
    let recipients: string[] = []
    let sentCount = 0
    let failedCount = 0

    if (type === 'custom') {
      if (!customEmail?.trim()) {
        return NextResponse.json(
          { success: false, error: 'Email address is required for custom emails' },
          { status: 400 }
        )
      }
      recipients = [customEmail.trim()]
    } else if (type === 'newsletter') {
      const { data: subscribers } = await supabase
        .from('subscribers')
        .select('email')
        .eq('status', 'active')

      recipients = subscribers?.map(s => s.email) || []
    } else if (type === 'announcement') {
      const { data: users } = await supabase
        .from('users')
        .select('email')
        .eq('status', 'active')

      recipients = users?.map(u => u.email) || []
    } else if (type === 'writers') {
      const { data: writers } = await supabase
        .from('users')
        .select('email')
        .eq('status', 'active')
        .in('role', ['writer', 'admin', 'super_admin'])

      recipients = writers?.map(w => w.email) || []
    } else if (type === 'readers') {
      const { data: readers } = await supabase
        .from('users')
        .select('email')
        .eq('status', 'active')
        .eq('role', 'reader')

      recipients = readers?.map(r => r.email) || []
    }

    if (recipients.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No recipients found' },
        { status: 400 }
      )
    }

    // Send emails with delay to avoid rate limiting
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
    console.log(`Sending emails to ${recipients.length} recipients from ${fromEmail}`)

    for (let i = 0; i < recipients.length; i++) {
      const email = recipients[i]
      try {
        console.log(`Sending to: ${email} (${i + 1}/${recipients.length})`)
        const result = await resend.emails.send({
          from: `${APP_NAME} <${fromEmail}>`,
          to: [email],
          subject: subject.trim(),
          html: htmlContent,
        })
        console.log(`Sent successfully to ${email}:`, result)
        sentCount++

        // Add 500ms delay between emails to avoid rate limiting
        if (i < recipients.length - 1) {
          await delay(500)
        }
      } catch (err) {
        console.error(`Failed to send email to ${email}:`, err)
        failedCount++
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        sentCount,
        failedCount,
        totalRecipients: recipients.length,
      },
    })
  } catch (error) {
    console.error('Send email error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
