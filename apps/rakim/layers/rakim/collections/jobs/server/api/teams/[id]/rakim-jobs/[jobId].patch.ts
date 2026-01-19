// Team-based endpoint - requires @fyit/crouton package
// The #crouton/team-auth alias is provided by @fyit/crouton
// Install: pnpm add @fyit/crouton
// Config: Add '@fyit/crouton' to extends array in nuxt.config.ts
import { updateRakimJob } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '#crouton/team-auth'
import type { RakimJob } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const { jobId } = getRouterParams(event)
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const body = await readBody<Partial<RakimJob>>(event)

  return await updateRakimJob(jobId, team.id, user.id, {
    discussionId: body.discussionId,
    sourceConfigId: body.sourceConfigId,
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