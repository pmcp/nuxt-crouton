/// <reference path="../crouton-hooks.d.ts" />
import { Resend } from 'resend'
import { useNitroApp } from 'nitropack/runtime'
import type { SendEmailOptions, SendEmailResult } from '../../types'

/**
 * Get or create Resend client instance.
 * Uses useEvent() from the async context to support Cloudflare Workers,
 * where useRuntimeConfig(event) is required to access env bindings.
 */
function getResendClient(event?: any): Resend {
  let resolvedEvent = event
  if (!resolvedEvent) { try { resolvedEvent = useEvent() } catch (e) { console.log(`[crouton-email] ⚠️ useEvent() failed in getResendClient: ${e}`) } }
  const config = resolvedEvent ? useRuntimeConfig(resolvedEvent) : useRuntimeConfig()
  const emailConfig = (config as any).email

  console.log(`[crouton-email] 🔑 Resend API key present: ${!!emailConfig?.resendApiKey}, from: ${emailConfig?.from}`)
  const apiKey = emailConfig?.resendApiKey

  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured. Set it in runtimeConfig.email.resendApiKey or NUXT_EMAIL_RESEND_API_KEY env variable.')
  }

  return new Resend(apiKey)
}

/**
 * Email service for sending emails via Resend.
 * Pass an H3 event for Cloudflare Workers compatibility.
 */
export function useEmailService(event?: any) {
  let resolvedEvent = event
  if (!resolvedEvent) { try { resolvedEvent = useEvent() } catch {} }
  const config = resolvedEvent ? useRuntimeConfig(resolvedEvent) : useRuntimeConfig()
  const emailConfig = (config as any).email

  const defaultFrom = emailConfig?.fromName
    ? `${emailConfig.fromName} <${emailConfig.from}>`
    : emailConfig?.from || 'noreply@example.com'

  const defaultReplyTo = emailConfig?.replyTo

  /**
   * Send an email using Resend
   */
  async function send(options: SendEmailOptions): Promise<SendEmailResult> {
    const startTime = Date.now()
    const nitroApp = useNitroApp()
    const recipient = Array.isArray(options.to) ? options.to[0] : options.to

    try {
      const client = getResendClient(event)

      const from = options.fromName
        ? `${options.fromName} <${options.from || emailConfig?.from}>`
        : options.from || defaultFrom

      const { data, error } = await client.emails.send({
        from,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: options.replyTo || defaultReplyTo,
        cc: options.cc ? (Array.isArray(options.cc) ? options.cc : [options.cc]) : undefined,
        bcc: options.bcc ? (Array.isArray(options.bcc) ? options.bcc : [options.bcc]) : undefined,
        headers: options.headers,
        tags: options.tags
      })

      if (error) {
        console.error('[crouton-email] Failed to send email:', error)
        await nitroApp.hooks.callHook('crouton:operation', {
          type: 'email:failed',
          source: 'crouton-email',
          metadata: {
            recipient,
            subject: options.subject,
            status: 'failed',
            duration: Date.now() - startTime,
            error: error.message
          }
        })
        return {
          success: false,
          error: error.message
        }
      }

      await nitroApp.hooks.callHook('crouton:operation', {
        type: 'email:sent',
        source: 'crouton-email',
        metadata: {
          recipient,
          subject: options.subject,
          status: 'sent',
          duration: Date.now() - startTime,
          messageId: data?.id
        }
      })

      return {
        success: true,
        id: data?.id
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      console.error('[crouton-email] Failed to send email:', message)
      await nitroApp.hooks.callHook('crouton:operation', {
        type: 'email:failed',
        source: 'crouton-email',
        metadata: {
          recipient,
          subject: options.subject,
          status: 'failed',
          duration: Date.now() - startTime,
          error: message
        }
      })
      return {
        success: false,
        error: message
      }
    }
  }

  /**
   * Send a batch of emails
   */
  async function sendBatch(emails: SendEmailOptions[]): Promise<SendEmailResult[]> {
    return Promise.all(emails.map(send))
  }

  return {
    send,
    sendBatch
  }
}

// Export singleton for convenience
export const emailService = {
  send: (options: SendEmailOptions) => useEmailService().send(options),
  sendBatch: (emails: SendEmailOptions[]) => useEmailService().sendBatch(emails)
}
