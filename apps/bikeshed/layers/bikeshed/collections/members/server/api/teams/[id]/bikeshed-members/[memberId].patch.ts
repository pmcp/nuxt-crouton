// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updateBookingtest3Member } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import type { Bookingtest3Member } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const { memberId } = getRouterParams(event)
  if (!memberId) {
    throw createError({ status: 400, statusText: 'Missing member ID' })
  }
  const { team, user, membership } = await resolveTeamAndCheckMembership(event)

  const body = await readBody<Partial<Bookingtest3Member>>(event)

  return await updateBookingtest3Member(memberId, team.id, user.id, {
    display: body.display,
    fields: body.fields
  }, { role: membership.role })
})