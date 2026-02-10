// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updateTriageInboxMessage } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import type { TriageInboxMessage } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const { inboxMessageId } = getRouterParams(event)
  if (!inboxMessageId) {
    throw createError({ status: 400, statusText: 'Missing inboxmessage ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const body = await readBody<Partial<TriageInboxMessage>>(event)

  return await updateTriageInboxMessage(inboxMessageId, team.id, user.id, {
    flowInputId: body.flowInputId,
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