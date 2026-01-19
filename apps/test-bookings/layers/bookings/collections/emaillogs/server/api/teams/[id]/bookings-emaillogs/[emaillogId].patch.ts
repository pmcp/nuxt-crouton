// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updateBookingsEmaillog } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import type { BookingsEmaillog } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const { emaillogId } = getRouterParams(event)
  if (!emaillogId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing emaillog ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const body = await readBody<Partial<BookingsEmaillog>>(event)

  return await updateBookingsEmaillog(emaillogId, team.id, user.id, {
    bookingId: body.bookingId,
    templateId: body.templateId,
    recipientEmail: body.recipientEmail,
    triggerType: body.triggerType,
    status: body.status,
    sentAt: body.sentAt,
    error: body.error
  })
})