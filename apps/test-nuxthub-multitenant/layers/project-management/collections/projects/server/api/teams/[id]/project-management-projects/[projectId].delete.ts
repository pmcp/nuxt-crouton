// Team-based endpoint - requires @friendlyinternet/nuxt-crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { deleteProjectManagementProject } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@friendlyinternet/nuxt-crouton-auth/server/utils/team'

export default defineEventHandler(async (event) => {
  const { projectId } = getRouterParams(event)
  if (!projectId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing project ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  return await deleteProjectManagementProject(projectId, team.id, user.id)
})