// Team-based endpoint - requires @friendlyinternet/nuxt-crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { deleteProjectManagementTask } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@friendlyinternet/nuxt-crouton-auth/server/utils/team'

export default defineEventHandler(async (event) => {
  const { taskId } = getRouterParams(event)
  if (!taskId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing task ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  return await deleteProjectManagementTask(taskId, team.id, user.id)
})