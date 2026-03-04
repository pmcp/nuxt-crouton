// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { deleteDesignerField } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'

export default defineEventHandler(async (event) => {
  const { fieldId } = getRouterParams(event)
  if (!fieldId) {
    throw createError({ status: 400, statusText: 'Missing field ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  return await deleteDesignerField(fieldId, team.id, user.id)
})