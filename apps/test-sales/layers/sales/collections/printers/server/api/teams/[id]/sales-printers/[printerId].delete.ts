// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { deleteSalesPrinter } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'

export default defineEventHandler(async (event) => {
  const { printerId } = getRouterParams(event)
  if (!printerId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing printer ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  return await deleteSalesPrinter(printerId, team.id, user.id)
})