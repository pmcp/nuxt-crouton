// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { deleteTriageInput } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'

export default defineEventHandler(async (event) => {
  const { inputId } = getRouterParams(event)
  if (!inputId) {
    throw createError({ status: 400, statusText: 'Missing input ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  return await deleteTriageInput(inputId, team.id, user.id)
})