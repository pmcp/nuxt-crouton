/**
 * Resend Webhook Endpoint - Figma Email Handler
 *
 * Receives POST requests from Resend containing Figma emails.
 * Unlike Mailgun, Resend webhooks do NOT include the email body - we must fetch it separately.
 *
 * **Flow:**
 * 1. Receive Resend `email.received` webhook
 * 2. Fetch email content from Resend API
 * 3. Classify email type (comment vs inbox messages)
 * 4. Branch based on email type:
 *    - **Comment emails**: Transform to Mailgun format → Process via Figma adapter → Create Notion tasks
 *    - **Inbox emails**: Store in inboxMessages collection for admin UI viewing
 *
 * **Inbox Message Types:**
 * - account-verification: Figma account verification emails
 * - password-reset: Password reset emails
 * - invitation: Team/file invitation emails
 * - notification: General notifications
 * - other: Unclassified emails
 *
 * **Flows Support (Phase 5):**
 * - Comment emails: Automatically finds flow by emailSlug (from recipient)
 * - Falls back to legacy config if no flow found
 * - Flow routing handled by processor service
 * - Inbox messages: Still use legacy config lookup (migration TBD)
 *
 * **Resend Webhook Payload Structure:**
 * ```json
 * {
 *   "type": "email.received",
 *   "created_at": "2025-01-15T12:00:00.000Z",
 *   "data": {
 *     "email_id": "49a3999c-0ce1-4ea6-ab68-afcd6dc2e794",
 *     "from": "comments-abc123@email.figma.com",
 *     "to": ["team-slug@yourdomain.com"],
 *     "subject": "Jane commented on Design File",
 *     "message_id": "<...@geopod-ismtpd-12>"
 *   }
 * }
 * ```
 *
 * **Endpoint:** POST /api/webhooks/resend
 * **Auth:** Webhook signature verification (Svix-based signing)
 *
 * @see https://resend.com/docs/dashboard/receiving/forward-emails
 * @see https://resend.com/docs/dashboard/webhooks/introduction
 */

import type { ParsedDiscussion } from '~/layers/discubot/types'
import { getAdapter } from '#layers/discubot/server/adapters'
import { processDiscussion } from '#layers/discubot/server/services/processor'
import { fetchResendEmail, transformToMailgunFormat } from '#layers/discubot/server/utils/resendEmail'
import { rateLimit, RateLimitPresets } from '#layers/discubot/server/utils/rateLimit'
import { classifyFigmaEmail, shouldForwardEmail } from '#layers/discubot/server/utils/emailClassifier'
import { forwardEmailToConfigOwner } from '#layers/discubot/server/utils/emailForwarding'
import { createDiscubotInboxMessage } from '#layers/discubot/collections/inboxmessages/server/database/queries'
import { findDiscubotConfigByEmail } from '#layers/discubot/collections/configs/server/database/queries'
import { findFlowInputByEmailAddress } from '#layers/discubot/collections/flowinputs/server/database/queries'
import { SYSTEM_USER_ID } from '#layers/discubot/server/utils/constants'

/**
 * Resend webhook payload structure
 * @see https://resend.com/docs/api-reference/webhooks/webhook-events
 */
interface ResendWebhookPayload {
  type: 'email.sent' | 'email.delivered' | 'email.received' | 'email.bounced' | 'email.complained' | 'email.opened' | 'email.clicked'
  created_at: string
  data: {
    email_id: string
    from?: string
    to?: string[]
    subject?: string
    message_id?: string
    created_at?: string
    [key: string]: any
  }
}

/**
 * Validate that this is an email.received event
 */
function validateResendWebhook(payload: ResendWebhookPayload): void {
  const errors: string[] = []

  // Check event type
  if (!payload.type) {
    errors.push('Missing required field: type')
  } else if (payload.type !== 'email.received') {
    errors.push(`Invalid event type: ${payload.type}. Expected: email.received`)
  }

  // Check data object
  if (!payload.data || typeof payload.data !== 'object') {
    errors.push('Missing or invalid data object')
  } else {
    // Check email ID
    if (!payload.data.email_id) {
      errors.push('Missing required field: data.email_id')
    }
  }

  if (errors.length > 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid Resend webhook payload',
      data: { errors },
    })
  }
}

/**
 * Find config or Flow by recipient email address
 * Searches FlowInputs first (new system), then falls back to legacy configs
 */
async function findConfigByRecipient(recipientEmail: string): Promise<{ config?: any; flowInput?: any; flow?: any; teamId: string; isFlow: boolean } | null> {
  try {
    logger.debug('[Resend Webhook] Looking for Flow or config by email', {
      recipientEmail,
    })

    // 1. Try FlowInputs first (new system)
    const flowInput = await findFlowInputByEmailAddress(recipientEmail)

    if (flowInput && flowInput.flowIdData) {
      logger.debug('[Resend Webhook] Found matching FlowInput', {
        flowInputId: flowInput.id,
        flowId: flowInput.flowId,
        flowName: flowInput.flowIdData.name,
        teamId: flowInput.teamId,
        emailAddress: flowInput.emailAddress,
        emailSlug: flowInput.emailSlug,
      })
      return {
        flowInput,
        flow: flowInput.flowIdData,
        teamId: flowInput.teamId,
        isFlow: true,
      }
    }

    // 2. Fall back to legacy configs (backward compatibility)
    const config = await findDiscubotConfigByEmail(recipientEmail)

    if (config) {
      logger.debug('[Resend Webhook] Found matching legacy config', {
        configId: config.id,
        teamId: config.teamId,
        emailAddress: config.emailAddress,
        emailSlug: config.emailSlug,
      })
      return {
        config,
        teamId: config.teamId,
        isFlow: false,
      }
    }

    logger.debug('[Resend Webhook] No matching Flow or config found')
    return null
  } catch (error) {
    logger.error('[Resend Webhook] Error finding Flow/config:', error)
    return null
  }
}

/**
 * Verify Resend webhook signature (Svix-based)
 *
 * Resend uses Svix for webhook signing. Signature verification headers:
 * - svix-id: Unique message ID
 * - svix-timestamp: Unix timestamp when message was sent
 * - svix-signature: HMAC signature(s) of the payload
 *
 * @see https://docs.svix.com/receiving/verifying-payloads/how
 */
async function verifyResendWebhookSignature(
  event: any,
  rawBody: string,
  signingSecret: string
): Promise<boolean> {
  const svixId = getHeader(event, 'svix-id')
  const svixTimestamp = getHeader(event, 'svix-timestamp')
  const svixSignature = getHeader(event, 'svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    logger.warn('[Resend Webhook] Missing Svix signature headers')
    return false
  }

  try {
    // Construct the signed content (Svix format)
    // Format: "{svix-id}.{svix-timestamp}.{raw-body}"
    // IMPORTANT: Must use raw body string, not parsed/re-stringified JSON
    const signedContent = `${svixId}.${svixTimestamp}.${rawBody}`

    // Decode the signing secret if it starts with whsec_
    // Svix secrets starting with whsec_ are base64-encoded
    let secretBytes: Uint8Array
    if (signingSecret.startsWith('whsec_')) {
      const base64Secret = signingSecret.substring(6) // Remove 'whsec_' prefix
      const binaryString = atob(base64Secret)
      secretBytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        secretBytes[i] = binaryString.charCodeAt(i)
      }
    } else {
      // Plain text secret
      const encoder = new TextEncoder()
      secretBytes = encoder.encode(signingSecret)
    }

    // Prepare the signed content
    const encoder = new TextEncoder()
    const data = encoder.encode(signedContent)

    // Import signing key
    const key = await crypto.subtle.importKey(
      'raw',
      secretBytes,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )

    // Generate signature
    const signature = await crypto.subtle.sign('HMAC', key, data)
    const base64Signature = btoa(String.fromCharCode(...new Uint8Array(signature)))

    // Extract signatures from header (format: "v1,signature1 v1,signature2")
    const signatures = svixSignature.split(' ').map(s => s.split(',')[1])

    // Check if our signature matches any of the provided signatures (constant-time comparison)
    for (const sig of signatures) {
      if (sig === base64Signature) {
        return true
      }
    }

    logger.warn('[Resend Webhook] Signature mismatch')
    return false
  } catch (error) {
    logger.error('[Resend Webhook] Signature verification error:', error)
    return false
  }
}

export default defineEventHandler(async (event) => {
  const startTime = Date.now()

  try {
    // 0. Apply rate limiting (100 requests per minute)
    await rateLimit(event, RateLimitPresets.WEBHOOK)

    // 1. Read raw body first (needed for signature verification)
    const rawBody = await readRawBody(event)
    if (!rawBody) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing request body',
      })
    }

    // Parse the JSON payload
    const payload = JSON.parse(rawBody) as ResendWebhookPayload

    logger.debug('[Resend Webhook] Received webhook', {
      type: payload.type,
      emailId: payload.data?.email_id,
      from: payload.data?.from,
      to: payload.data?.to,
    })

    // Validate webhook event type
    validateResendWebhook(payload)

    // 2. Verify webhook signature (if configured)
    const config = useRuntimeConfig()
    const signingSecret = config.resendWebhookSigningSecret as string | undefined

    if (signingSecret) {
      const isValid = await verifyResendWebhookSignature(event, rawBody, signingSecret)

      if (!isValid) {
        logger.warn('[Resend Webhook] Invalid signature detected')
        throw createError({
          statusCode: 401,
          statusMessage: 'Invalid webhook signature',
        })
      }

      logger.debug('[Resend Webhook] Signature verified successfully')
    } else {
      logger.warn('[Resend Webhook] Signature verification skipped - RESEND_WEBHOOK_SIGNING_SECRET not configured')
    }

    // 3. Fetch email content from Resend API
    // (Resend webhooks don't include body content for serverless optimization)
    const resendApiToken = config.resendApiToken as string

    if (!resendApiToken) {
      throw createError({
        statusCode: 500,
        statusMessage: 'RESEND_API_TOKEN not configured',
      })
    }

    let resendEmail
    try {
      resendEmail = await fetchResendEmail(payload.data.email_id, resendApiToken)
      logger.debug('[Resend Webhook] Fetched email content', {
        emailId: resendEmail.id,
        hasHtml: !!resendEmail.html,
        hasText: !!resendEmail.text,
      })
    } catch (error) {
      logger.error('[Resend Webhook] Failed to fetch email content:', error)
      throw createError({
        statusCode: 422,
        statusMessage: 'Failed to fetch email from Resend API',
        data: {
          error: (error as Error).message,
        },
      })
    }

    // 4. Classify the email to determine if it's a comment or inbox message
    const classification = classifyFigmaEmail({
      subject: resendEmail.subject,
      from: resendEmail.from,
      html: resendEmail.html,
      text: resendEmail.text,
    })

    logger.debug('[Resend Webhook] Email classified', {
      messageType: classification.messageType,
      confidence: classification.confidence,
      reason: classification.reason,
    })

    // 5. Branch based on message type
    // If it's NOT a comment, store in inbox and return early
    if (classification.messageType !== 'comment') {
      // Find matching config by email address
      const recipient = resendEmail.to[0] || ''
      const result = await findConfigByRecipient(recipient)

      if (!result) {
        logger.warn('[Resend Webhook] No matching config found for inbox message', {
          recipient,
          messageType: classification.messageType,
        })
        // Still return success to Resend, but log the issue
        return {
          success: true,
          stored: false,
          reason: 'No matching config found',
          messageType: classification.messageType,
        }
      }

      const { teamId, isFlow } = result
      // For inbox messages, we use legacy config ID (Flows don't support inbox yet)
      const configId = isFlow ? result.flowInput?.id : result.config?.id

      if (!configId) {
        logger.warn('[Resend Webhook] Config/FlowInput found but no ID available', {
          recipient,
          isFlow,
        })
        return {
          success: true,
          stored: false,
          reason: 'Invalid config/flow data',
          messageType: classification.messageType,
        }
      }

      // Store in inbox
      try {
        const inboxMessage = await createDiscubotInboxMessage({
          configId,
          messageType: classification.messageType,
          from: resendEmail.from,
          to: recipient,
          subject: resendEmail.subject,
          htmlBody: resendEmail.html || undefined,
          textBody: resendEmail.text || undefined,
          receivedAt: new Date(payload.created_at),
          read: false,
          resendEmailId: resendEmail.id,
          teamId,
          owner: SYSTEM_USER_ID,
          createdBy: SYSTEM_USER_ID,
          updatedBy: SYSTEM_USER_ID,
        })

        // Forward critical emails if enabled
        if (shouldForwardEmail(classification.messageType)) {
          const forwardResult = await forwardEmailToConfigOwner({
            inboxMessageId: inboxMessage.id,
            configId,
            teamId,
            from: resendEmail.from,
            subject: resendEmail.subject,
            htmlBody: resendEmail.html || undefined,
            textBody: resendEmail.text || undefined,
            messageType: classification.messageType,
          })

          if (forwardResult.forwarded) {
            logger.debug('[Resend Webhook] Email forwarded', {
              inboxMessageId: inboxMessage.id,
              forwardedTo: forwardResult.forwardedTo,
              messageType: classification.messageType,
            })
          }
          else {
            logger.warn('[Resend Webhook] Email forwarding failed', {
              inboxMessageId: inboxMessage.id,
              reason: forwardResult.error,
            })
          }
        }

        const processingTime = Date.now() - startTime

        logger.debug('[Resend Webhook] Inbox message stored', {
          inboxMessageId: inboxMessage.id,
          messageType: classification.messageType,
          configId,
          processingTime: `${processingTime}ms`,
        })

        return {
          success: true,
          stored: true,
          data: {
            inboxMessageId: inboxMessage.id,
            messageType: classification.messageType,
            configId,
            processingTime,
          },
        }
      } catch (error) {
        logger.error('[Resend Webhook] Failed to store inbox message:', error)
        throw createError({
          statusCode: 500,
          statusMessage: 'Failed to store inbox message',
          data: {
            error: (error as Error).message,
          },
        })
      }
    }

    // 6. For comment emails, continue with existing processing flow
    // Transform to Mailgun-compatible format
    // This allows us to reuse the existing Figma adapter without any changes!
    const mailgunFormat = transformToMailgunFormat(resendEmail)

    logger.debug('[Resend Webhook] Transformed to Mailgun format', {
      recipient: mailgunFormat.recipient,
      from: mailgunFormat.from,
      subject: mailgunFormat.subject,
    })

    // 7. Get Figma adapter and parse incoming email
    // Note: Currently hardcoded to 'figma' - could be made dynamic based on
    // recipient domain or other routing logic in the future
    const adapter = getAdapter('figma')

    let parsed: ParsedDiscussion
    try {
      parsed = await adapter.parseIncoming(mailgunFormat)
      logger.debug('[Resend Webhook] Successfully parsed comment email', {
        teamId: parsed.teamId,
        sourceThreadId: parsed.sourceThreadId,
        authorHandle: parsed.authorHandle,
      })
    } catch (error) {
      logger.error('[Resend Webhook] Failed to parse email:', error)
      throw createError({
        statusCode: 422,
        statusMessage: 'Failed to parse email',
        data: {
          error: (error as Error).message,
        },
      })
    }

    // 8. Process the discussion through the pipeline
    try {
      const result = await processDiscussion(parsed)

      const processingTime = Date.now() - startTime

      logger.debug('[Resend Webhook] Successfully processed comment discussion', {
        discussionId: result.discussionId,
        notionTaskCount: result.notionTasks.length,
        isMultiTask: result.isMultiTask,
        processingTime: `${processingTime}ms`,
      })

      // 9. Return success response for comment processing
      return {
        success: true,
        messageType: 'comment',
        data: {
          discussionId: result.discussionId,
          notionTasks: result.notionTasks.map(task => ({
            taskId: task.taskId,
            url: task.url,
          })),
          isMultiTask: result.isMultiTask,
          processingTime,
        },
      }
    } catch (error) {
      logger.error('[Resend Webhook] Failed to process discussion:', error)

      // Determine if error is retryable (for webhook retry logic)
      const isRetryable = (error as any).retryable === true

      // Return 5xx for retryable errors (Resend will retry)
      // Return 4xx for non-retryable errors (Resend won't retry)
      const statusCode = isRetryable ? 503 : 422

      throw createError({
        statusCode,
        statusMessage: 'Failed to process discussion',
        data: {
          error: (error as Error).message,
          retryable: isRetryable,
        },
      })
    }
  } catch (error) {
    // Handle all other unexpected errors
    logger.error('[Resend Webhook] Unexpected error:', error)

    // If this is already a H3Error from createError(), re-throw it
    if ((error as any).statusCode) {
      throw error
    }

    // Otherwise, wrap in a generic error
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error',
      data: {
        error: (error as Error).message,
      },
    })
  }
})
