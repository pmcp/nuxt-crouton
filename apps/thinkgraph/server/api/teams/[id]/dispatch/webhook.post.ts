import { updateThinkgraphWorkItem, getAllThinkgraphWorkItems, getThinkgraphWorkItemsByIds } from '~~/layers/thinkgraph/collections/workitems/server/database/queries'

/**
 * Webhook for receiving dispatch results from Pi.dev or other providers.
 *
 * POST /api/teams/[id]/dispatch/webhook
 * Headers: X-Webhook-Secret: <shared secret>
 * Body: { workItemId, status, output?, artifacts?, error? }
 *
 * Pipeline stage progression: when a work item completes with a green signal,
 * reads the item's current stage from DB, advances to the next stage, and
 * auto-dispatches to the Pi worker.
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

  // Read current item state — the agent may have already set signal/status via update_workitem
  const [currentState] = await getThinkgraphWorkItemsByIds(teamId, [workItemId])

  // Set status — but respect the agent's signal
  // If the agent set signal=orange (waiting for human) or signal=red (blocked),
  // don't let the session callback override that with 'done'
  if (status === 'done' && currentState?.signal === 'orange') {
    // Agent signaled orange → keep status as waiting (agent already set it)
    // Don't override with 'done' from session completion
  }
  else if (status === 'done' && currentState?.signal === 'red') {
    // Agent signaled red → keep status as blocked
  }
  else if (status === 'done' || status === 'error' || status === 'blocked' || status === 'waiting') {
    updates.status = status
  }

  // Set output — but don't overwrite agent-set output with empty callback output
  if (output && !(currentState?.signal === 'orange' && currentState?.output)) {
    updates.output = output
  }

  // Merge new artifacts with existing ones (don't replace)
  if (artifacts) {
    const newArtifacts = Array.isArray(artifacts) ? artifacts : [artifacts]
    const existingArtifacts = Array.isArray(currentState?.artifacts) ? currentState.artifacts : []
    updates.artifacts = [...existingArtifacts, ...newArtifacts]
  }

  // Set error info in output if failed
  if (error) {
    updates.output = `Error: ${error}`
    updates.status = 'error'
  }

  if (Object.keys(updates).length > 0) {
    await updateThinkgraphWorkItem(workItemId, teamId, 'system', updates, { role: 'admin' })
  }

  // Pipeline stage progression
  const STAGE_ORDER = ['analyst', 'builder', 'launcher', 'reviewer', 'merger']
  let stageAdvanced = false
  let advancedItemId: string | null = null

  if (updates.status === 'done') {
    // Read the work item's current signal and stage directly from DB
    const [currentItem] = await getThinkgraphWorkItemsByIds(teamId, [workItemId])
    const itemSignal = currentItem?.signal

    // Store stage output as artifact before advancing
    if (currentItem?.stage && (output || currentItem?.output)) {
      const existingArtifacts = Array.isArray(currentItem.artifacts) ? currentItem.artifacts : []
      const stageOutputArtifact = {
        type: 'stage-output',
        stage: currentItem.stage,
        signal: itemSignal || null,
        output: output || currentItem.output,
        timestamp: new Date().toISOString(),
      }
      await updateThinkgraphWorkItem(workItemId, teamId, 'system', {
        artifacts: [...existingArtifacts, stageOutputArtifact],
      }, { role: 'admin' })
    }

    if (itemSignal === 'green' && currentItem?.stage) {
      const currentIdx = STAGE_ORDER.indexOf(currentItem.stage)
      const nextStage = currentIdx >= 0 && currentIdx < STAGE_ORDER.length - 1
        ? STAGE_ORDER[currentIdx + 1]
        : null

      if (nextStage) {
        try {
          if (nextStage === 'launcher') {
            // Launcher stage: wait for CI results, don't dispatch to Pi
            await updateThinkgraphWorkItem(workItemId, teamId, 'system', {
              stage: 'launcher',
              signal: null,
              status: 'waiting',
              assignee: 'ci',
            }, { role: 'admin' })
            stageAdvanced = true
            console.log(`[webhook] Stage advanced: ${workItemId} → launcher (waiting for CI)`)
          }
          else {
            // Normal stage: advance and dispatch to Pi
            await updateThinkgraphWorkItem(workItemId, teamId, 'system', {
              stage: nextStage,
              signal: null,
              status: 'queued',
              assignee: 'pi',
            }, { role: 'admin' })
            stageAdvanced = true
            console.log(`[webhook] Stage advanced: ${workItemId} → ${nextStage} (queued)`)

            // Auto-dispatch to Pi worker
            const piWorkerUrl = config.piWorkerUrl || 'https://pi-api.pmcp.dev'
            const [targetItem] = await getThinkgraphWorkItemsByIds(teamId, [workItemId])
            if (targetItem) {
              const { buildNodeContext } = await import('~~/server/utils/context-builder')
              const allItems = await getAllThinkgraphWorkItems(teamId)
              const contextPayload = buildNodeContext(
                allItems.map((item: any) => ({
                  id: item.id,
                  parentId: item.parentId,
                  title: item.title,
                  nodeType: item.type,
                  status: item.status,
                  brief: item.brief,
                  output: item.output,
                })),
                workItemId,
              )

              await $fetch(`${piWorkerUrl}/dispatch`, {
                method: 'POST',
                body: {
                  workItemId,
                  projectId: targetItem.projectId,
                  prompt: targetItem.brief || targetItem.title,
                  context: contextPayload.markdown,
                  skill: targetItem.skill || targetItem.type,
                  workItemType: targetItem.type,
                  stage: nextStage,
                  teamId,
                  teamSlug: teamId,
                  callbackUrl: `${config.public?.siteUrl || `http://${getHeader(event, 'host') || 'localhost:3004'}`}/api/teams/${teamId}/dispatch/webhook`,
                },
              })
              await updateThinkgraphWorkItem(workItemId, teamId, 'system', { status: 'active' }, { role: 'admin' })
              console.log(`[webhook] Auto-dispatched ${workItemId} at stage ${nextStage}`)
            }
          }
        } catch (err: any) {
          console.error('[webhook] Stage advance/dispatch failed:', err.message)
        }
      }
    }

    // Auto-advance children: when done and no stage progression, find next queued child
    if (!stageAdvanced) {
      try {
        const allItems = await getAllThinkgraphWorkItems(teamId)
        const queuedChildren = allItems
          .filter((item: any) => item.parentId === workItemId && item.status === 'queued' && item.assignee === 'pi')
          .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))

        if (queuedChildren.length > 0) {
          const nextItem = queuedChildren[0]
          await updateThinkgraphWorkItem(nextItem.id, teamId, 'system', { status: 'active' }, { role: 'admin' })
          advancedItemId = nextItem.id
          console.log(`[webhook] Auto-advanced work item ${nextItem.id} ("${nextItem.title}") → active`)
        }
      } catch (err) {
        console.error('[webhook] Auto-advance failed:', err)
      }
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
