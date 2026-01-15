// Team-based endpoint - requires @friendlyinternet/nuxt-crouton package
// The #crouton/team-auth alias is provided by @friendlyinternet/nuxt-crouton
// Install: pnpm add @friendlyinternet/nuxt-crouton
// Config: Add '@friendlyinternet/nuxt-crouton' to extends array in nuxt.config.ts
import { updateDiscubotJob } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '#crouton/team-auth'
import type { DiscubotJob } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const { jobId } = getRouterParams(event)
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const body = await readBody<Partial<DiscubotJob>>(event)

  return await updateDiscubotJob(jobId, team.id, user.id, {
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