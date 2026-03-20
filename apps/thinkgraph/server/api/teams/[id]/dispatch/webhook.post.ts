import { updateThinkgraphWorkItem, getAllThinkgraphWorkItems, getThinkgraphWorkItemsByIds } from '~~/layers/thinkgraph/collections/workitems/server/database/queries'

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

  const { workItemId, status, output, artifacts, error, signal, nextStage } = body
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

  // Merge new artifacts with existing ones (don't replace)
  if (artifacts) {
    const newArtifacts = Array.isArray(artifacts) ? artifacts : [artifacts]
    // Fetch existing artifacts to merge
    const [existing] = await getThinkgraphWorkItemsByIds(teamId, [workItemId])
    const existingArtifacts = Array.isArray(existing?.artifacts) ? existing.artifacts : []
    updates.artifacts = [...existingArtifacts, ...newArtifacts]
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

  // Pipeline stage progression: when signal is green and nextStage is set,
  // re-queue the same work item at the next stage
  let stageAdvanced = false
  if (updates.status === 'done' && signal === 'green' && nextStage) {
    try {
      await updateThinkgraphWorkItem(workItemId, teamId, 'system', {
        stage: nextStage,
        signal: null,       // Reset signal for next stage
        status: 'queued',   // Ready for re-dispatch
        assignee: 'pi',
      }, { role: 'admin' })
      stageAdvanced = true
      console.log(`[webhook] Stage advanced: ${workItemId} → ${nextStage} (queued)`)
    } catch (err) {
      console.error('[webhook] Stage advance failed:', err)
    }
  }

  // Auto-advance: when a work item completes, find the next queued child
  // Skip if we just stage-advanced (the same item will be re-dispatched)
  let advancedItemId: string | null = null
  if (updates.status === 'done' && !stageAdvanced) {
    try {
      const allItems = await getAllThinkgraphWorkItems(teamId)
      // Find queued children of the completed item (ordered by creation)
      // Only auto-advance pi-assigned items — human/client items wait for triage
      const queuedChildren = allItems
        .filter((item: any) => item.parentId === workItemId && item.status === 'queued' && item.assignee === 'pi')
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

  return {
    success: true,
    workItemId,
    status: updates.status,
    advancedItemId,
    stageAdvanced,
  }
})
