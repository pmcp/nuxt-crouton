import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { getAllThinkgraphNodes, updateThinkgraphNode } from '~~/layers/thinkgraph/collections/nodes/server/database/queries'
import { buildNodeContext } from '~~/server/utils/context-builder'

/**
 * Dispatch a work item to Pi.dev or another provider.
 *
 * POST /api/teams/[id]/dispatch/work-item
 * Body: { workItemId, prompt?, options? }
 *
 * For Pi.dev: stores handoff metadata on the work item's artifacts,
 * sets status to 'active'. The Pi worker picks up the handoff via polling.
 */
export default defineEventHandler(async (event) => {
  const { team, user, membership } = await resolveTeamAndCheckMembership(event)
  const body = await readBody(event)

  const { workItemId, prompt, options } = body
  if (!workItemId) {
    throw createError({ status: 400, statusText: 'Missing workItemId' })
  }

  // Load all work items for this team to build context chain
  const allItems = await getAllThinkgraphNodes(team.id)
  const targetItem = allItems.find((item: any) => item.id === workItemId)

  if (!targetItem) {
    throw createError({ status: 404, statusText: 'Work item not found' })
  }

  // Build context chain from ancestor work items
  const contextPayload = buildNodeContext(
    allItems.map((item: any) => ({
      id: item.id,
      parentId: item.parentId,
      title: item.title,
      nodeType: item.template,
      status: item.status,
      brief: item.brief,
      output: item.output,
    })),
    workItemId,
  )

  // Default stage to 'analyst' on first dispatch if not already set
  const stage = targetItem.stage || 'analyst'
  if (!targetItem.stage) {
    await updateThinkgraphNode(
      workItemId,
      team.id,
      user.id,
      { stage },
      { role: membership.role },
    )
  }

  // Determine the assignee/provider
  const assignee = targetItem.assignee || 'pi'
  const provider = targetItem.provider || (assignee.startsWith('api:') ? assignee.replace('api:', '') : assignee)

  // Build the handoff metadata
  const handoffMeta = {
    type: 'handoff' as const,
    provider,
    skill: targetItem.skill || targetItem.template,
    prompt: prompt || targetItem.brief || '',
    context: contextPayload.markdown,
    contextTokens: contextPayload.tokenEstimate,
    projectId: targetItem.projectId,
    workItemId,
    workItemTitle: targetItem.title,
    workItemType: targetItem.template,
    teamId: team.id,
    dispatchedBy: user.id,
    dispatchedAt: new Date().toISOString(),
  }

  // Store handoff metadata and set status to active
  const existingArtifacts = Array.isArray(targetItem.artifacts) ? targetItem.artifacts : []
  const cleanedArtifacts = existingArtifacts.filter((a: any) => a?.type !== 'handoff')

  await updateThinkgraphNode(
    workItemId,
    team.id,
    user.id,
    {
      status: 'active',
      artifacts: [...cleanedArtifacts, handoffMeta],
    },
    { role: membership.role },
  )

  // Dispatch to Pi worker via HTTP
  const config = useRuntimeConfig()
  const piWorkerUrl = config.piWorkerUrl || 'https://pi-api.pmcp.dev'
  let piAccepted = false

  if (provider === 'pi') {
    try {
      const piResponse = await $fetch<{ accepted: boolean }>(`${piWorkerUrl}/dispatch`, {
        method: 'POST',
        body: {
          workItemId,
          projectId: targetItem.projectId,
          prompt: handoffMeta.prompt || targetItem.brief || targetItem.title,
          context: contextPayload.markdown,
          skill: handoffMeta.skill,
          workItemType: targetItem.template,
          stage,
          teamId: team.id,
          teamSlug: team.slug || team.id,
          callbackUrl: `${config.public?.siteUrl || `https://${getHeader(event, 'host') || 'localhost:3004'}`}/api/teams/${team.id}/dispatch/webhook`,
        },
      })
      piAccepted = piResponse?.accepted || false
    }
    catch (err: any) {
      console.warn(`[dispatch] Pi worker not reachable at ${piWorkerUrl}:`, err.message)
      // Don't fail — handoff metadata is stored, Pi can pick it up via polling
    }
  }

  return {
    success: true,
    workItemId,
    provider,
    skill: handoffMeta.skill,
    contextTokens: contextPayload.tokenEstimate,
    piAccepted,
  }
})
