import { Resend } from 'resend'

const APP_NAME = 'Inkhouse'
const SUPER_ADMIN_EMAIL = 'mailtoharipriyas@gmail.com'

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('RESEND_API_KEY not configured')
    return null
  }
  return new Resend(apiKey)
}

function getEmailConfig() {
  return {
    from: process.env.EMAIL_FROM || 'noreply@haripriya.org',
    appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://inkhouse.haripriya.org',
  }
}

export async function sendWelcomeEmail({
  to,
  name,
  username,
  tempPassword,
}: {
  to: string
  name: string
  username: string
  tempPassword: string
}) {
  try {
    const resend = getResendClient()
    if (!resend) {
      return { success: false, error: 'Email not configured' }
    }

    const config = getEmailConfig()
    const { data, error } = await resend.emails.send({
      from: `${APP_NAME} <${config.from}>`,
      to: [to],
      subject: `Welcome to ${APP_NAME}!`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #0D9488; margin-bottom: 24px;">Welcome to ${APP_NAME}!</h1>

          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Hi ${name},
          </p>

          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Your membership request has been approved. You can now log in and start writing!
          </p>

          <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <p style="margin: 0 0 12px 0; color: #374151;"><strong>Your login details:</strong></p>
            <p style="margin: 0 0 8px 0; color: #374151;">Username: <strong>${username}</strong></p>
            <p style="margin: 0 0 8px 0; color: #374151;">Email: <strong>${to}</strong></p>
            <p style="margin: 0; color: #374151;">Temporary Password: <strong>${tempPassword}</strong></p>
          </div>

          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Please change your password after logging in for the first time.
          </p>

          <a href="${config.appUrl}/login" style="display: inline-block; background-color: #0D9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">
            Log in to ${APP_NAME}
          </a>

          <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">
            Happy writing!<br/>
            The ${APP_NAME} Team
          </p>
        </div>
      `,
    })

    if (error) {
      console.error('Failed to send welcome email:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Email send error:', error)
    return { success: false, error }
  }
}

export async function sendRejectionEmail({
  to,
  name,
  reason,
}: {
  to: string
  name: string
  reason?: string
}) {
  try {
    const resend = getResendClient()
    if (!resend) {
      return { success: false, error: 'Email not configured' }
    }

    const config = getEmailConfig()
    const { data, error } = await resend.emails.send({
      from: `${APP_NAME} <${config.from}>`,
      to: [to],
      subject: `Update on your ${APP_NAME} membership request`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #374151; margin-bottom: 24px;">Membership Request Update</h1>

          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Hi ${name},
          </p>

          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Thank you for your interest in joining ${APP_NAME}. After reviewing your request, we're unable to approve your membership at this time.
          </p>

          ${reason ? `
          <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <p style="margin: 0; color: #374151;"><strong>Reason:</strong> ${reason}</p>
          </div>
          ` : ''}

          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            If you believe this was a mistake or would like to reapply, please feel free to submit a new request.
          </p>

          <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">
            Best regards,<br/>
            The ${APP_NAME} Team
          </p>
        </div>
      `,
    })

    if (error) {
      console.error('Failed to send rejection email:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Email send error:', error)
    return { success: false, error }
  }
}

export async function sendNewRequestNotification({
  name,
  username,
  email,
  writingSample,
}: {
  name: string
  username: string
  email: string
  writingSample: string
}) {
  try {
    const resend = getResendClient()
    if (!resend) {
      return { success: false, error: 'Email not configured' }
    }

    const config = getEmailConfig()
    const { data, error } = await resend.emails.send({
      from: `${APP_NAME} <${config.from}>`,
      to: [SUPER_ADMIN_EMAIL],
      subject: `New membership request from ${name}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #0D9488; margin-bottom: 24px;">New Membership Request</h1>

          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            A new writer wants to join ${APP_NAME}!
          </p>

          <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <p style="margin: 0 0 12px 0; color: #374151;"><strong>Applicant Details:</strong></p>
            <p style="margin: 0 0 8px 0; color: #374151;">Name: <strong>${name}</strong></p>
            <p style="margin: 0 0 8px 0; color: #374151;">Username: <strong>@${username}</strong></p>
            <p style="margin: 0 0 12px 0; color: #374151;">Email: <strong>${email}</strong></p>
            <p style="margin: 0 0 8px 0; color: #374151;"><strong>Why they want to join:</strong></p>
            <p style="margin: 0; color: #374151; white-space: pre-wrap;">${writingSample}</p>
          </div>

          <a href="${config.appUrl}/admin/requests" style="display: inline-block; background-color: #0D9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">
            Review Request
          </a>

          <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">
            ${APP_NAME} Admin Notifications
          </p>
        </div>
      `,
    })

    if (error) {
      console.error('Failed to send admin notification:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Email send error:', error)
    return { success: false, error }
  }
}
