// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updateProjectsTask } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import type { ProjectsTask } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const { taskId } = getRouterParams(event)
  if (!taskId) {
    throw createError({ status: 400, statusText: 'Missing task ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const body = await readBody<Partial<ProjectsTask>>(event)

  return await updateProjectsTask(taskId, team.id, user.id, {
    title: body.title,
    description: body.description,
    status: body.status,
    dueDate: body.dueDate ? new Date(body.dueDate) : body.dueDate,
    completed: body.completed,
    priority: body.priority,
    assigneeId: body.assigneeId,
    subtasks: body.subtasks
  })
})