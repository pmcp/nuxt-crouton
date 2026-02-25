// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { deleteBookingtest3RoomType } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'

export default defineEventHandler(async (event) => {
  const { roomTypeId } = getRouterParams(event)
  if (!roomTypeId) {
    throw createError({ status: 400, statusText: 'Missing roomtype ID' })
  }
  const { team, user, membership } = await resolveTeamAndCheckMembership(event)

  return await deleteBookingtest3RoomType(roomTypeId, team.id, user.id, { role: membership.role })
})