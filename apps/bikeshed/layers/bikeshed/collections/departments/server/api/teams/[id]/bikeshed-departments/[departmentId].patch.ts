// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updateBookingtest3Department } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import type { Bookingtest3Department } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const { departmentId } = getRouterParams(event)
  if (!departmentId) {
    throw createError({ status: 400, statusText: 'Missing department ID' })
  }
  const { team, user, membership } = await resolveTeamAndCheckMembership(event)

  const body = await readBody<Partial<Bookingtest3Department>>(event)

  return await updateBookingtest3Department(departmentId, team.id, user.id, {
    display: body.display,
    fields: body.fields
  }, { role: membership.role })
})