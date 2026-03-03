// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updateBikeshedRoomType } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import type { BikeshedRoomType } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const { roomTypeId } = getRouterParams(event)
  if (!roomTypeId) {
    throw createError({ status: 400, statusText: 'Missing roomtype ID' })
  }
  const { team, user, membership } = await resolveTeamAndCheckMembership(event)

  const body = await readBody<Partial<BikeshedRoomType>>(event)

  return await updateBikeshedRoomType(roomTypeId, team.id, user.id, {
    display: body.display,
    fields: body.fields
  }, { role: membership.role })
})