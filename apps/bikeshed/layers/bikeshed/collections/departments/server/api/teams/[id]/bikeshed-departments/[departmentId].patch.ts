// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updateBikeshedDepartment } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import type { BikeshedDepartment } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const { departmentId } = getRouterParams(event)
  if (!departmentId) {
    throw createError({ status: 400, statusText: 'Missing department ID' })
  }
  const { team, user, membership } = await resolveTeamAndCheckMembership(event)

  const body = await readBody<Partial<BikeshedDepartment>>(event)

  return await updateBikeshedDepartment(departmentId, team.id, user.id, {
    display: body.display,
    fields: body.fields
  }, { role: membership.role })
})