// Team-based endpoint - requires @friendlyinternet/nuxt-crouton package
// The #crouton/team-auth alias is provided by @friendlyinternet/nuxt-crouton
// Install: pnpm add @friendlyinternet/nuxt-crouton
// Config: Add '@friendlyinternet/nuxt-crouton' to extends array in nuxt.config.ts
import { updateDiscubotTask } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '#crouton/team-auth'
import type { DiscubotTask } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const { taskId } = getRouterParams(event)
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const body = await readBody<Partial<DiscubotTask>>(event)

  return await updateDiscubotTask(taskId, team.id, user.id, {
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