// Team-based endpoint - requires @friendlyinternet/nuxt-crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updateProjectManagementTask } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@friendlyinternet/nuxt-crouton-auth/server/utils/team'
import type { ProjectManagementTask } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const { taskId } = getRouterParams(event)
  if (!taskId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing task ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const body = await readBody<Partial<ProjectManagementTask>>(event)

  return await updateProjectManagementTask(taskId, team.id, user.id, {
    id: body.id,
    title: body.title,
    description: body.description,
    status: body.status,
    priority: body.priority,
    projectId: body.projectId,
    dueDate: body.dueDate ? new Date(body.dueDate) : body.dueDate,
    completedAt: body.completedAt,
    estimatedHours: body.estimatedHours
  })
})