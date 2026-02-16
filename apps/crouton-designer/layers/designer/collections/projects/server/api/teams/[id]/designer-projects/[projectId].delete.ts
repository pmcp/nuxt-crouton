// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { deleteDesignerProject } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'

export default defineEventHandler(async (event) => {
  const { projectId } = getRouterParams(event)
  if (!projectId) {
    throw createError({ status: 400, statusText: 'Missing project ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  return await deleteDesignerProject(projectId, team.id, user.id)
})