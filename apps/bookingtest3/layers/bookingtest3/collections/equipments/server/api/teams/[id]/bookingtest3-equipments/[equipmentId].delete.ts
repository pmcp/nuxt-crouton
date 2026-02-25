// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { deleteBookingtest3Equipment } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'

export default defineEventHandler(async (event) => {
  const { equipmentId } = getRouterParams(event)
  if (!equipmentId) {
    throw createError({ status: 400, statusText: 'Missing equipment ID' })
  }
  const { team, user, membership } = await resolveTeamAndCheckMembership(event)

  return await deleteBookingtest3Equipment(equipmentId, team.id, user.id, { role: membership.role })
})