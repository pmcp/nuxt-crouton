/// <reference path="../crouton-hooks.d.ts" />
import {
  sendVerificationLink,
  sendPasswordReset,
  sendTeamInvite,
  sendMagicLink
} from '../utils/senders'
import { getEmailBrandConfig } from '../utils/template-renderer'
import { resolveEmailOverrides } from '../utils/resolve-email-settings'
import type { EmailTemplateType } from '../utils/resolve-email-settings'

/**
 * Resolve a team/organization brand name from the URL in the email payload.
 * Returns undefined on any failure so callers fall back to the config default.
 */
async function resolveBrandName(url: string): Promise<string | undefined> {
  try {
    const host = new URL(url).host
    // resolveTeamBrandFromHost is auto-imported from crouton-auth server utils
    return await resolveTeamBrandFromHost(host)
  }
  catch {
    return undefined
  }
}

/**
 * Resolve team email template overrides for a given email type and recipient.
 * Returns undefined on any failure so callers fall back to defaults.
 */
async function getOverrides(emailType: EmailTemplateType, context: {
  userEmail?: string
  organizationName?: string
}) {
  try {
    return await resolveEmailOverrides(emailType, context)
  }
  catch {
    return undefined
  }
}

/**
 * Nitro plugin that listens for crouton:auth:email hooks emitted by crouton-auth
 * and dispatches to the appropriate email sender.
 *
 * Apps without crouton-email simply never register this listener — hooks fire
 * with no handler, which is a silent no-op.
 */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('crouton:auth:email', async (payload) => {
    try {
      switch (payload.type) {
        case 'verification': {
          const [brandName, overrides] = await Promise.all([
            resolveBrandName(payload.url),
            getOverrides('verification', { userEmail: payload.to })
          ])
          await sendVerificationLink({
            to: payload.to,
            link: payload.url,
            name: payload.userName,
            ...(brandName && { brandName }),
            ...(overrides && { overrides })
          })
          break
        }

        case 'password-reset': {
          const [brandName, overrides] = await Promise.all([
            resolveBrandName(payload.url),
            getOverrides('password-reset', { userEmail: payload.to })
          ])
          await sendPasswordReset({
            to: payload.to,
            link: payload.url,
            name: payload.userName,
            ...(brandName && { brandName }),
            ...(overrides && { overrides })
          })
          break
        }

        case 'invitation': {
          const brand = getEmailBrandConfig()
          const acceptLink = `${brand.appUrl}/auth/accept-invitation/${payload.invitationId}`
          const overrides = await getOverrides('team-invite', {
            organizationName: payload.organizationName
          })
          await sendTeamInvite({
            to: payload.to,
            link: acceptLink,
            inviterName: payload.inviterName,
            teamName: payload.organizationName,
            role: payload.role,
            brandName: payload.organizationName,
            ...(overrides && { overrides })
          })
          break
        }

        case 'magic-link': {
          const [brandName, overrides] = await Promise.all([
            resolveBrandName(payload.url),
            getOverrides('magic-link', { userEmail: payload.to })
          ])
          await sendMagicLink({
            to: payload.to,
            link: payload.url,
            ...(brandName && { brandName }),
            ...(overrides && { overrides })
          })
          break
        }
      }
    }
    catch (err) {
      // Email failure must never break auth flow
      console.error(`[crouton-email] Failed to send ${payload.type} email to ${payload.to}:`, err)
    }
  })
})
