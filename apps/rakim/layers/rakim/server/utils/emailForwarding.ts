import { findUserById } from '@@/server/database/queries/users'
import { sendEmail } from '@@/server/services/email'
import { getDiscubotConfigsByIds } from '#layers/discubot/collections/configs/server/database/queries'
import { updateDiscubotInboxMessage } from '#layers/discubot/collections/inboxmessages/server/database/queries'
import { logger } from '../utils/logger'

export interface ForwardEmailParams {
  inboxMessageId: string
  configId: string
  teamId: string
  from: string
  subject: string
  htmlBody?: string
  textBody?: string
  messageType: string
}

export interface ForwardEmailResult {
  forwarded: boolean
  forwardedTo?: string
  error?: string
}

/**
 * Forward an email to the config owner
 *
 * This function implements a best-effort approach to email forwarding:
 * - Only forwards if enableEmailForwarding is true on the config
 * - Only forwards to the config owner's email address
 * - Updates the inbox message with forwarding details
 * - Returns success/failure status but doesn't throw errors
 *
 * @param params Email forwarding parameters
 * @returns Result object with forwarding status
 */
export async function forwardEmailToConfigOwner(
  params: ForwardEmailParams,
): Promise<ForwardEmailResult> {
  try {
    // 1. Get config
    const configs = await getDiscubotConfigsByIds(params.teamId, [params.configId])
    const config = configs?.[0]

    if (!config) {
      return {
        forwarded: false,
        error: 'Config not found',
      }
    }

    // 2. Check if forwarding is enabled
    if (!config.enableEmailForwarding) {
      return {
        forwarded: false,
        error: 'Forwarding disabled for this config',
      }
    }

    // 3. Get owner user
    const owner = await findUserById(config.owner)
    if (!owner || !owner.email) {
      return {
        forwarded: false,
        error: 'Config owner email not found',
      }
    }

    // 4. Send forwarded email
    await sendEmail({
      to: owner.email,
      subject: `[Discubot Inbox] ${params.subject}`,
      html: buildForwardedEmailHtml(params),
      text: buildForwardedEmailText(params),
    })

    // 5. Update inbox message with forwarding info
    await updateDiscubotInboxMessage(params.teamId, params.inboxMessageId, {
      forwardedTo: owner.email,
      forwardedAt: new Date(),
    })

    return {
      forwarded: true,
      forwardedTo: owner.email,
    }
  }
  catch (error) {
    logger.error('[Email Forwarding] Failed to forward email:', error)
    return {
      forwarded: false,
      error: (error as Error).message,
    }
  }
}

/**
 * Build HTML email body for forwarded message
 */
function buildForwardedEmailHtml(params: ForwardEmailParams): string {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000'

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Forwarded Email from Discubot</title>
</head>
<body style="margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
    <!-- Header -->
    <div style="background-color: #4f46e5; padding: 24px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">Forwarded Email from Discubot</h1>
    </div>

    <!-- Metadata -->
    <div style="padding: 24px; background-color: #f9fafb; border-bottom: 1px solid #e5e7eb;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 4px 0; color: #6b7280; font-size: 14px; font-weight: 600;">Type:</td>
          <td style="padding: 4px 0; color: #111827; font-size: 14px;">${formatMessageType(params.messageType)}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #6b7280; font-size: 14px; font-weight: 600;">From:</td>
          <td style="padding: 4px 0; color: #111827; font-size: 14px;">${escapeHtml(params.from)}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #6b7280; font-size: 14px; font-weight: 600;">Subject:</td>
          <td style="padding: 4px 0; color: #111827; font-size: 14px;">${escapeHtml(params.subject)}</td>
        </tr>
      </table>
    </div>

    <!-- Original Message -->
    <div style="padding: 24px;">
      <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 16px; font-weight: 600;">Original Message</h2>
      <div style="color: #374151; font-size: 14px; line-height: 1.6;">
        ${params.htmlBody || '<p style="color: #9ca3af; font-style: italic;">No HTML content available</p>'}
      </div>
    </div>

    <!-- Footer -->
    <div style="padding: 24px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
      <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 12px;">
        This email was automatically forwarded from your Discubot inbox.
      </p>
      <a href="${baseUrl}/dashboard/inbox" style="color: #4f46e5; font-size: 12px; text-decoration: none; font-weight: 600;">
        View in Discubot →
      </a>
    </div>
  </div>
</body>
</html>
  `.trim()
}

/**
 * Build plain text email body for forwarded message
 */
function buildForwardedEmailText(params: ForwardEmailParams): string {
  return `
Forwarded Email from Discubot
===============================

Type: ${formatMessageType(params.messageType)}
From: ${params.from}
Subject: ${params.subject}

---

${params.textBody || 'No text content available'}

---

This email was automatically forwarded from your Discubot inbox.
View your inbox: ${process.env.BASE_URL || 'http://localhost:3000'}/dashboard/inbox
  `.trim()
}

/**
 * Format message type for display
 */
function formatMessageType(type: string): string {
  const typeMap: Record<string, string> = {
    'account-verification': 'Account Verification',
    'password-reset': 'Password Reset',
    'comment': 'Comment',
    'invitation': 'Invitation',
    'notification': 'Notification',
    'other': 'Other',
  }
  return typeMap[type] || type
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }
  return text.replace(/[&<>"']/g, m => map[m])
}
