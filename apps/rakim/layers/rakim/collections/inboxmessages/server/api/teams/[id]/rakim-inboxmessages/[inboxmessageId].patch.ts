// Team-based endpoint - requires @fyit/crouton package
// The #crouton/team-auth alias is provided by @fyit/crouton
// Install: pnpm add @fyit/crouton
// Config: Add '@fyit/crouton' to extends array in nuxt.config.ts
import { updateRakimInboxMessage } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '#crouton/team-auth'
import type { RakimInboxMessage } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const { inboxmessageId } = getRouterParams(event)
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const body = await readBody<Partial<RakimInboxMessage>>(event)

  return await updateRakimInboxMessage(inboxmessageId, team.id, user.id, {
    configId: body.configId,
    messageType: body.messageType,
    from: body.from,
    to: body.to,
    subject: body.subject,
    htmlBody: body.htmlBody,
    textBody: body.textBody,
    receivedAt: body.receivedAt ? new Date(body.receivedAt) : body.receivedAt,
    read: body.read,
    forwardedTo: body.forwardedTo,
    forwardedAt: body.forwardedAt ? new Date(body.forwardedAt) : body.forwardedAt,
    resendEmailId: body.resendEmailId
  })
})