import { updateThinkgraphWorkItem, getAllThinkgraphWorkItems, getThinkgraphWorkItemsByIds, createThinkgraphWorkItem } from '~~/layers/thinkgraph/collections/workitems/server/database/queries'

/**
 * Webhook for receiving dispatch results from Pi.dev or other providers.
 *
 * POST /api/teams/[id]/dispatch/webhook
 * Headers: X-Webhook-Secret: <shared secret>
 * Body: { workItemId, status, output?, artifacts?, error? }
 *
 * Authenticated via shared secret (not user session).
 *
 * Auto-advance: when status is 'done', finds the next queued child work item
 * and sets it to 'queued' (ready for dispatch).
 */
export default defineEventHandler(async (event) => {
  // Verify webhook secret
  const config = useRuntimeConfig()
  const expectedSecret = config.webhookSecret || config.public?.webhookSecret
  if (expectedSecret) {
    const providedSecret = getHeader(event, 'x-webhook-secret')
    if (providedSecret !== expectedSecret) {
      throw createError({ status: 401, statusText: 'Invalid webhook secret' })
    }
  }

  const { id: teamId } = getRouterParams(event)
  if (!teamId) {
    throw createError({ status: 400, statusText: 'Missing team ID' })
  }

  const body = await readBody(event)

  const { workItemId, status, output, artifacts, error } = body
  if (!workItemId) {
    throw createError({ status: 400, statusText: 'Missing workItemId' })
  }

  const updates: Record<string, any> = {}

  // Set status
  if (status === 'done' || status === 'error' || status === 'blocked' || status === 'waiting') {
    updates.status = status
  }

  // Set output
  if (output) {
    updates.output = output
  }

  // Merge artifacts (keep existing non-handoff artifacts, add new ones)
  if (artifacts) {
    updates.artifacts = Array.isArray(artifacts) ? artifacts : [artifacts]
  }

  // Set error info in output if failed
  if (error) {
    updates.output = `Error: ${error}`
    updates.status = 'error'
  }

  await updateThinkgraphWorkItem(
    workItemId,
    teamId,
    'system',
    updates,
    { role: 'admin' },
  )

  // Auto-advance: when a work item completes, find the next queued child
  let advancedItemId: string | null = null
  if (updates.status === 'done') {
    try {
      const allItems = await getAllThinkgraphWorkItems(teamId)
      // Find queued children of the completed item (ordered by creation)
      const queuedChildren = allItems
        .filter((item: any) => item.parentId === workItemId && item.status === 'queued')
        .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))

      if (queuedChildren.length > 0) {
        const nextItem = queuedChildren[0]
        // Mark the next item as active (ready for dispatch)
        await updateThinkgraphWorkItem(
          nextItem.id,
          teamId,
          'system',
          { status: 'active' },
          { role: 'admin' },
        )
        advancedItemId = nextItem.id
        console.log(`[webhook] Auto-advanced work item ${nextItem.id} ("${nextItem.title}") → active`)
      }
    } catch (err) {
      // Auto-advance is best-effort — don't fail the webhook
      console.error('[webhook] Auto-advance failed:', err)
    }
  }

  // Create learning nodes from retrospective
  let learningIds: string[] = []
  if (updates.status === 'done') {
    try {
      // Fetch the completed item to get its retrospective and projectId
      const [completedItem] = await getThinkgraphWorkItemsByIds(teamId, [workItemId])
      const retro = completedItem?.retrospective
      if (retro && retro.trim().length > 0) {
        // Parse retrospective into individual learnings
        // Supports: bullet points (- or *), numbered lists (1.), or newline-separated paragraphs
        const lines = retro
          .split(/\n/)
          .map((l: string) => l.replace(/^[\s]*[-*•]\s*/, '').replace(/^\d+\.\s*/, '').trim())
          .filter((l: string) => l.length > 10) // skip short/empty lines

        for (const learning of lines) {
          const item = await createThinkgraphWorkItem({
            teamId,
            owner: 'system',
            projectId: completedItem.projectId,
            parentId: workItemId,
            title: learning.length > 80 ? learning.slice(0, 77) + '...' : learning,
            type: 'review',
            status: 'queued',
            assignee: 'human',
            brief: learning,
          } as any)
          learningIds.push(item.id)
        }
        if (learningIds.length > 0) {
          console.log(`[webhook] Created ${learningIds.length} learning node(s) from retrospective of ${workItemId}`)
        }
      }
    } catch (err) {
      // Learning creation is best-effort
      console.error('[webhook] Learning node creation failed:', err)
    }
  }

  return {
    success: true,
    workItemId,
    status: updates.status,
    advancedItemId,
    learningIds,
  }
})
