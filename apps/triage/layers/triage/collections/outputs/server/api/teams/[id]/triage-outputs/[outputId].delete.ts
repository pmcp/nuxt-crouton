// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { deleteTriageOutput } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'

export default defineEventHandler(async (event) => {
  const { outputId } = getRouterParams(event)
  if (!outputId) {
    throw createError({ status: 400, statusText: 'Missing output ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  return await deleteTriageOutput(outputId, team.id, user.id)
})