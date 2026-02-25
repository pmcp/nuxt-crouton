// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updateBookingtest3Equipment } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import type { Bookingtest3Equipment } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const { equipmentId } = getRouterParams(event)
  if (!equipmentId) {
    throw createError({ status: 400, statusText: 'Missing equipment ID' })
  }
  const { team, user, membership } = await resolveTeamAndCheckMembership(event)

  const body = await readBody<Partial<Bookingtest3Equipment>>(event)

  return await updateBookingtest3Equipment(equipmentId, team.id, user.id, {
    display: body.display,
    fields: body.fields
  }, { role: membership.role })
})