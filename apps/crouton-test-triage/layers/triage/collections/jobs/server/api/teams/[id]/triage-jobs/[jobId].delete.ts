// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { deleteTriageJob } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'

export default defineEventHandler(async (event) => {
  const { jobId } = getRouterParams(event)
  if (!jobId) {
    throw createError({ status: 400, statusText: 'Missing job ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  return await deleteTriageJob(jobId, team.id, user.id)
})