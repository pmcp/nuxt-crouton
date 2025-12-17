import { Resend } from 'resend'
import type { SendEmailOptions, SendEmailResult } from '../../types'

let resendClient: Resend | null = null

/**
 * Get or create Resend client instance
 */
function getResendClient(): Resend {
  if (resendClient) return resendClient

  const config = useRuntimeConfig()
  const emailConfig = (config as any).email

  const apiKey = emailConfig?.resendApiKey

  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured. Set it in runtimeConfig.email.resendApiKey or RESEND_API_KEY env variable.')
  }

  resendClient = new Resend(apiKey)
  return resendClient
}

/**
 * Email service for sending emails via Resend
 */
export function useEmailService() {
  const config = useRuntimeConfig()
  const emailConfig = (config as any).email

  const defaultFrom = emailConfig?.fromName
    ? `${emailConfig.fromName} <${emailConfig.from}>`
    : emailConfig?.from || 'noreply@example.com'

  const defaultReplyTo = emailConfig?.replyTo

  /**
   * Send an email using Resend
   */
  async function send(options: SendEmailOptions): Promise<SendEmailResult> {
    try {
      const client = getResendClient()

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
        tags: options.tags,
      })

      if (error) {
        console.error('[crouton-email] Failed to send email:', error)
        return {
          success: false,
          error: error.message,
        }
      }

      return {
        success: true,
        id: data?.id,
      }
    }
    catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      console.error('[crouton-email] Failed to send email:', message)
      return {
        success: false,
        error: message,
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
    sendBatch,
  }
}

// Export singleton for convenience
export const emailService = {
  send: (options: SendEmailOptions) => useEmailService().send(options),
  sendBatch: (emails: SendEmailOptions[]) => useEmailService().sendBatch(emails),
}
