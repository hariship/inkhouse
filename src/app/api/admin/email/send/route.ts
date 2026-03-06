import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { subscribers, users } from '@/lib/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { getAuthUser } from '@/lib/auth'
import { Resend } from 'resend'

const APP_NAME = 'Inkhouse'

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return null
  return new Resend(apiKey)
}

function wrapInTemplate(body: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0; padding:0; width:100%; -webkit-text-size-adjust:100%;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%; table-layout:fixed;">
<tr><td align="left" valign="top" style="padding:20px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:15px; line-height:1.7; color:#374151; word-break:break-word;">
<h2 style="color:#0D9488; margin:0 0 20px 0;">${APP_NAME}</h2>
${body}
<hr style="margin:32px 0; border:none; border-top:1px solid #e5e7eb;"/>
<p style="color:#6b7280; font-size:12px;">You received this email from ${APP_NAME}.</p>
</td></tr>
</table>
</body></html>`
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
      const subs = await db
        .select({ email: subscribers.email })
        .from(subscribers)
        .where(eq(subscribers.status, 'active'))
      recipients = subs.map(s => s.email)
    } else if (type === 'announcement') {
      const allUsers = await db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.status, 'active'))
      recipients = allUsers.map(u => u.email)
    } else if (type === 'writers') {
      const writers = await db
        .select({ email: users.email })
        .from(users)
        .where(and(eq(users.status, 'active'), inArray(users.role, ['writer', 'admin', 'super_admin'])))
      recipients = writers.map(w => w.email)
    } else if (type === 'readers') {
      const readers = await db
        .select({ email: users.email })
        .from(users)
        .where(and(eq(users.status, 'active'), eq(users.role, 'reader')))
      recipients = readers.map(r => r.email)
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
