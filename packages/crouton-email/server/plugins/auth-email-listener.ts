/// <reference path="../crouton-hooks.d.ts" />
import {
  sendVerificationLink,
  sendPasswordReset,
  sendTeamInvite,
  sendMagicLink
} from '../utils/senders'
import { getEmailBrandConfig } from '../utils/template-renderer'

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
        case 'verification':
          await sendVerificationLink({
            to: payload.to,
            link: payload.url,
            name: payload.userName
          })
          break

        case 'password-reset':
          await sendPasswordReset({
            to: payload.to,
            link: payload.url,
            name: payload.userName
          })
          break

        case 'invitation': {
          const brand = getEmailBrandConfig()
          const acceptLink = `${brand.appUrl}/auth/accept-invitation/${payload.invitationId}`
          await sendTeamInvite({
            to: payload.to,
            link: acceptLink,
            inviterName: payload.inviterName,
            teamName: payload.organizationName,
            role: payload.role
          })
          break
        }

        case 'magic-link':
          await sendMagicLink({
            to: payload.to,
            link: payload.url
          })
          break
      }
    }
    catch (err) {
      // Email failure must never break auth flow
      console.error(`[crouton-email] Failed to send ${payload.type} email to ${payload.to}:`, err)
    }
  })
})
