// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updateBookingsAppStaff } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import type { BookingsAppStaff } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const { staffId } = getRouterParams(event)
  if (!staffId) {
    throw createError({ status: 400, statusText: 'Missing staff ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const body = await readBody<Partial<BookingsAppStaff>>(event)

  return await updateBookingsAppStaff(staffId, team.id, user.id, {
    display: body.display,
    fields: body.fields
  })
})