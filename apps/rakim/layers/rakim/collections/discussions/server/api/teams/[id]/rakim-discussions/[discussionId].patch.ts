// Team-based endpoint - requires @fyit/crouton package
// The #crouton/team-auth alias is provided by @fyit/crouton
// Install: pnpm add @fyit/crouton
// Config: Add '@fyit/crouton' to extends array in nuxt.config.ts
import { updateRakimDiscussion } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '#crouton/team-auth'
import type { RakimDiscussion } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const { discussionId } = getRouterParams(event)
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const body = await readBody<Partial<RakimDiscussion>>(event)

  return await updateRakimDiscussion(discussionId, team.id, user.id, {
    sourceType: body.sourceType,
    sourceThreadId: body.sourceThreadId,
    sourceUrl: body.sourceUrl,
    sourceConfigId: body.sourceConfigId,
    title: body.title,
    content: body.content,
    authorHandle: body.authorHandle,
    participants: body.participants,
    status: body.status,
    threadData: body.threadData,
    totalMessages: body.totalMessages,
    aiSummary: body.aiSummary,
    aiKeyPoints: body.aiKeyPoints,
    aiTasks: body.aiTasks,
    isMultiTask: body.isMultiTask,
    syncJobId: body.syncJobId,
    notionTaskIds: body.notionTaskIds,
    rawPayload: body.rawPayload,
    metadata: body.metadata,
    processedAt: body.processedAt ? new Date(body.processedAt) : body.processedAt
  })
})