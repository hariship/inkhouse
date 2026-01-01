import { Resend } from 'resend'

const APP_NAME = 'Inkhouse'

const EMAIL_ERRORS = {
  NOT_CONFIGURED: 'Email service not configured',
  SUPER_ADMIN_NOT_CONFIGURED: 'Super admin email not configured',
  SEND_FAILED: 'Failed to send email',
} as const

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
    appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    superAdminEmail: process.env.SUPER_ADMIN_EMAIL,
  }
}

export async function sendWelcomeEmail({
  to,
  name,
  username,
  tempPassword,
  isGoogleUser,
}: {
  to: string
  name: string
  username: string
  tempPassword?: string
  isGoogleUser?: boolean
}) {
  try {
    const resend = getResendClient()
    if (!resend) {
      return { success: false, error: EMAIL_ERRORS.NOT_CONFIGURED }
    }

    const config = getEmailConfig()

    // Different email content for Google users vs password users
    const loginDetailsHtml = isGoogleUser
      ? `
          <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <p style="margin: 0 0 12px 0; color: #374151;"><strong>Your account:</strong></p>
            <p style="margin: 0 0 8px 0; color: #374151;">Username: <strong>${username}</strong></p>
            <p style="margin: 0; color: #374151;">Email: <strong>${to}</strong></p>
          </div>

          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Sign in with the same Google account you used to apply.
          </p>
        `
      : `
          <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <p style="margin: 0 0 12px 0; color: #374151;"><strong>Your login details:</strong></p>
            <p style="margin: 0 0 8px 0; color: #374151;">Username: <strong>${username}</strong></p>
            <p style="margin: 0 0 8px 0; color: #374151;">Email: <strong>${to}</strong></p>
            <p style="margin: 0; color: #374151;">Temporary Password: <strong>${tempPassword}</strong></p>
          </div>

          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Please change your password after logging in for the first time.
          </p>
        `

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
            ${isGoogleUser ? 'Great news! Your writer access has been approved.' : 'Your membership request has been approved.'} You can now log in and start writing!
          </p>

          ${loginDetailsHtml}

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
      return { success: false, error: EMAIL_ERRORS.NOT_CONFIGURED }
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

export async function sendNewPostNotification({
  postTitle,
  postSlug,
  authorName,
  authorUsername,
}: {
  postTitle: string
  postSlug: string
  authorName: string
  authorUsername: string
}) {
  try {
    const resend = getResendClient()
    if (!resend) {
      return { success: false, error: EMAIL_ERRORS.NOT_CONFIGURED }
    }

    const config = getEmailConfig()
    if (!config.superAdminEmail) {
      console.warn('SUPER_ADMIN_EMAIL not configured')
      return { success: false, error: EMAIL_ERRORS.SUPER_ADMIN_NOT_CONFIGURED }
    }

    const postUrl = `${config.appUrl}/post/${postSlug}`

    const { data, error } = await resend.emails.send({
      from: `${APP_NAME} <${config.from}>`,
      to: [config.superAdminEmail],
      subject: `New post published: ${postTitle}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #0D9488; margin-bottom: 24px;">New Post Published</h1>

          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            A new post has been published on ${APP_NAME}!
          </p>

          <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <p style="margin: 0 0 12px 0; color: #374151;"><strong>Post Details:</strong></p>
            <p style="margin: 0 0 8px 0; color: #374151;">Title: <strong>${postTitle}</strong></p>
            <p style="margin: 0; color: #374151;">Author: <strong>${authorName}</strong> (@${authorUsername})</p>
          </div>

          <a href="${postUrl}" style="display: inline-block; background-color: #0D9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">
            View Post
          </a>

          <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">
            ${APP_NAME} Admin Notifications
          </p>
        </div>
      `,
    })

    if (error) {
      console.error('Failed to send new post notification:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Email send error:', error)
    return { success: false, error }
  }
}

export async function sendNewsletter({
  to,
  name,
  subject,
  html,
}: {
  to: string
  name: string
  subject: string
  html: string
}) {
  try {
    const resend = getResendClient()
    if (!resend) {
      return { success: false, error: EMAIL_ERRORS.NOT_CONFIGURED }
    }

    const config = getEmailConfig()
    const { data, error } = await resend.emails.send({
      from: `${APP_NAME} <${config.from}>`,
      to: [to],
      subject,
      html,
    })

    if (error) {
      console.error(`Failed to send newsletter to ${to}:`, error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Newsletter send error:', error)
    return { success: false, error }
  }
}

export async function sendPasswordResetEmail({
  to,
  name,
  resetToken,
}: {
  to: string
  name: string
  resetToken: string
}) {
  try {
    const resend = getResendClient()
    if (!resend) {
      return { success: false, error: EMAIL_ERRORS.NOT_CONFIGURED }
    }

    const config = getEmailConfig()
    const resetUrl = `${config.appUrl}/reset-password?token=${resetToken}`

    const { data, error } = await resend.emails.send({
      from: `${APP_NAME} <${config.from}>`,
      to: [to],
      subject: `Reset your ${APP_NAME} password`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #0D9488; margin-bottom: 24px;">Reset Your Password</h1>

          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Hi ${name},
          </p>

          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            We received a request to reset your password. Click the button below to create a new password.
          </p>

          <a href="${resetUrl}" style="display: inline-block; background-color: #0D9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 24px 0;">
            Reset Password
          </a>

          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
          </p>

          <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">
            ${APP_NAME}
          </p>
        </div>
      `,
    })

    if (error) {
      console.error('Failed to send password reset email:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Password reset email error:', error)
    return { success: false, error }
  }
}

export async function sendNewReaderNotification({
  name,
  username,
  email,
}: {
  name: string
  username: string
  email: string
}) {
  try {
    const resend = getResendClient()
    if (!resend) {
      return { success: false, error: EMAIL_ERRORS.NOT_CONFIGURED }
    }

    const config = getEmailConfig()
    if (!config.superAdminEmail) {
      console.warn('SUPER_ADMIN_EMAIL not configured')
      return { success: false, error: EMAIL_ERRORS.SUPER_ADMIN_NOT_CONFIGURED }
    }

    const { data, error } = await resend.emails.send({
      from: `${APP_NAME} <${config.from}>`,
      to: [config.superAdminEmail],
      subject: `New reader joined: ${name}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #0D9488; margin-bottom: 24px;">New Reader Joined</h1>

          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            A new reader has signed up on ${APP_NAME}!
          </p>

          <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <p style="margin: 0 0 8px 0; color: #374151;">Name: <strong>${name}</strong></p>
            <p style="margin: 0 0 8px 0; color: #374151;">Username: <strong>@${username}</strong></p>
            <p style="margin: 0; color: #374151;">Email: <strong>${email}</strong></p>
          </div>

          <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">
            ${APP_NAME} Admin Notifications
          </p>
        </div>
      `,
    })

    if (error) {
      console.error('Failed to send new reader notification:', error)
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
      return { success: false, error: EMAIL_ERRORS.NOT_CONFIGURED }
    }

    const config = getEmailConfig()
    if (!config.superAdminEmail) {
      console.warn('SUPER_ADMIN_EMAIL not configured')
      return { success: false, error: EMAIL_ERRORS.SUPER_ADMIN_NOT_CONFIGURED }
    }

    const { data, error } = await resend.emails.send({
      from: `${APP_NAME} <${config.from}>`,
      to: [config.superAdminEmail],
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
