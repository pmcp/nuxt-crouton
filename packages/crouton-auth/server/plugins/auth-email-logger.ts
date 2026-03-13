/// <reference path="../crouton-hooks.d.ts" />
/**
 * Nitro plugin that logs all auth emails to the database.
 *
 * Hooks into crouton:auth:email and persists a log entry for every email
 * dispatched through the auth system. Runs independently of crouton-email.
 */
import { useDB, tables } from '../utils/database'

interface AuthEmailPayload {
  type: 'verification' | 'password-reset' | 'invitation' | 'magic-link'
  to: string
  url?: string
  userName?: string
  inviterName?: string
  organizationName?: string
  role?: string
  invitationId?: string
  inviterEmail?: string
  expiresAt?: Date
}

function extractMetadata(payload: AuthEmailPayload): Record<string, string> {
  const meta: Record<string, string> = {}

  switch (payload.type) {
    case 'verification':
    case 'password-reset':
      if (payload.userName) meta.userName = payload.userName
      break
    case 'invitation':
      meta.inviterName = payload.inviterName
      meta.organizationName = payload.organizationName
      meta.role = payload.role
      break
    case 'magic-link':
      break
  }

  return meta
}

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('crouton:auth:email', async (payload) => {
    const logId = crypto.randomUUID()

    try {
      const db = useDB()

      // Insert as sent — if the email sender (crouton-email) throws,
      // it catches internally and logs to console. The hook itself succeeding
      // means the email was dispatched (or at least attempted).
      await db.insert(tables.authEmailLog).values({
        id: logId,
        emailType: payload.type,
        recipientEmail: payload.to,
        status: 'sent',
        sentAt: new Date(),
        metadata: Object.keys(extractMetadata(payload)).length > 0
          ? extractMetadata(payload)
          : null,
        createdAt: new Date()
      })
    }
    catch (err) {
      // Logging must never break the auth/email flow
      console.error('[crouton-auth] Failed to log email:', err)
    }
  })
})
