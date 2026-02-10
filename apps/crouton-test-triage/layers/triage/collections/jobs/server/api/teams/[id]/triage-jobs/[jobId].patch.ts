// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updateTriageJob } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import type { TriageJob } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const { jobId } = getRouterParams(event)
  if (!jobId) {
    throw createError({ status: 400, statusText: 'Missing job ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const body = await readBody<Partial<TriageJob>>(event)

  return await updateTriageJob(jobId, team.id, user.id, {
    discussionId: body.discussionId,
    flowInputId: body.flowInputId,
    status: body.status,
    stage: body.stage,
    attempts: body.attempts,
    maxAttempts: body.maxAttempts,
    error: body.error,
    errorStack: body.errorStack,
    startedAt: body.startedAt ? new Date(body.startedAt) : body.startedAt,
    completedAt: body.completedAt ? new Date(body.completedAt) : body.completedAt,
    processingTime: body.processingTime,
    taskIds: body.taskIds,
    metadata: body.metadata
  })
})