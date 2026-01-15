// Team-based endpoint - requires @friendlyinternet/nuxt-crouton package
// The #crouton/team-auth alias is provided by @friendlyinternet/nuxt-crouton
// Install: pnpm add @friendlyinternet/nuxt-crouton
// Config: Add '@friendlyinternet/nuxt-crouton' to extends array in nuxt.config.ts
import { updateDiscubotInboxMessage } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '#crouton/team-auth'
import type { DiscubotInboxMessage } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const { inboxmessageId } = getRouterParams(event)
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const body = await readBody<Partial<DiscubotInboxMessage>>(event)

  return await updateDiscubotInboxMessage(inboxmessageId, team.id, user.id, {
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