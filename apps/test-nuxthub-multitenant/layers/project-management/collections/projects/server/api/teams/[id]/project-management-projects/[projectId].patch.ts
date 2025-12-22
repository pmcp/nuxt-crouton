// Team-based endpoint - requires @friendlyinternet/nuxt-crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updateProjectManagementProject } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@friendlyinternet/nuxt-crouton-auth/server/utils/team'
import type { ProjectManagementProject } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const { projectId } = getRouterParams(event)
  if (!projectId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing project ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const body = await readBody<Partial<ProjectManagementProject>>(event)

  return await updateProjectManagementProject(projectId, team.id, user.id, {
    id: body.id,
    name: body.name,
    description: body.description,
    status: body.status,
    priority: body.priority,
    startDate: body.startDate ? new Date(body.startDate) : body.startDate,
    dueDate: body.dueDate ? new Date(body.dueDate) : body.dueDate,
    color: body.color
  })
})