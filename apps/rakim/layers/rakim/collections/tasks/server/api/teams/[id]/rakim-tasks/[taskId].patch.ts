// Team-based endpoint - requires @fyit/crouton package
// The #crouton/team-auth alias is provided by @fyit/crouton
// Install: pnpm add @fyit/crouton
// Config: Add '@fyit/crouton' to extends array in nuxt.config.ts
import { updateRakimTask } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '#crouton/team-auth'
import type { RakimTask } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const { taskId } = getRouterParams(event)
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const body = await readBody<Partial<RakimTask>>(event)

  return await updateRakimTask(taskId, team.id, user.id, {
    discussionId: body.discussionId,
    syncJobId: body.syncJobId,
    notionPageId: body.notionPageId,
    notionPageUrl: body.notionPageUrl,
    title: body.title,
    description: body.description,
    status: body.status,
    priority: body.priority,
    assignee: body.assignee,
    summary: body.summary,
    sourceUrl: body.sourceUrl,
    isMultiTaskChild: body.isMultiTaskChild,
    taskIndex: body.taskIndex,
    metadata: body.metadata
  })
})