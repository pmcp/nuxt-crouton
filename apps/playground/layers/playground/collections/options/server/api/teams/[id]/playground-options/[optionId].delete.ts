// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { deletePlaygroundOption } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'

export default defineEventHandler(async (event) => {
  const { optionId } = getRouterParams(event)
  if (!optionId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing option ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  return await deletePlaygroundOption(optionId, team.id, user.id)
})