// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updateTriageMessage } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import type { TriageMessage } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const { messageId } = getRouterParams(event)
  if (!messageId) {
    throw createError({ status: 400, statusText: 'Missing message ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const body = await readBody<Partial<TriageMessage>>(event)

  return await updateTriageMessage(messageId, team.id, user.id, {
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