// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { deleteTriageTask } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'

export default defineEventHandler(async (event) => {
  const { taskId } = getRouterParams(event)
  if (!taskId) {
    throw createError({ status: 400, statusText: 'Missing task ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  return await deleteTriageTask(taskId, team.id, user.id)
})