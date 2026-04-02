import { updateThinkgraphNode, getAllThinkgraphNodes, getThinkgraphNodesByIds } from '~~/layers/thinkgraph/collections/nodes/server/database/queries'
import { generateNodeSummaryAsync } from '~~/server/utils/summary-generator'
import { buildNodeMarkdown, extractStageOutputs } from '~~/server/utils/node-markdown'

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

  const { workItemId, status, output, artifacts, error, signal: callbackSignal } = body
  if (!workItemId) {
    throw createError({ status: 400, statusText: 'Missing workItemId' })
  }

  const updates: Record<string, any> = {}

  // Read current item state
  const [currentState] = await getThinkgraphNodesByIds(teamId, [workItemId])

  // Use signal from callback body (forwarded by Pi worker) or fall back to DB
  const agentSignal = callbackSignal || currentState?.signal
  console.log(`[webhook] ${workItemId}: status=${status}, callbackSignal=${callbackSignal}, dbSignal=${currentState?.signal}, agentSignal=${agentSignal}`)

  // Respect the agent's signal — don't let session completion override it
  if (status === 'done' && (agentSignal === 'orange' || agentSignal === 'red')) {
    console.log(`[webhook] ${workItemId}: preserving ${agentSignal} signal, NOT setting status to done`)
  }
  else if (status === 'done' || status === 'error' || status === 'blocked' || status === 'waiting') {
    updates.status = status
  }

  // Don't overwrite agent-set output with empty callback output
  if (output && !(agentSignal && currentState?.output)) {
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
    await updateThinkgraphNode(workItemId, teamId, 'system', updates, { role: 'admin' })
  }

  // Pipeline stage progression
  const DEFAULT_STAGE_ORDER = ['analyst', 'builder', 'launcher', 'reviewer', 'merger']
  let stageAdvanced = false
  let advancedItemId: string | null = null

  if (updates.status === 'done') {
    // Re-read current item for stage/artifacts (already have signal from agentSignal)
    const [currentItem] = await getThinkgraphNodesByIds(teamId, [workItemId])

    // Store stage output as artifact before advancing
    if (currentItem?.stage && (output || currentItem?.output)) {
      const existingArtifacts = Array.isArray(currentItem.artifacts) ? currentItem.artifacts : []
      const stageOutputArtifact = {
        type: 'stage-output',
        stage: currentItem.stage,
        signal: agentSignal || null,
        output: output || currentItem.output,
        timestamp: new Date().toISOString(),
      }
      await updateThinkgraphNode(workItemId, teamId, 'system', {
        artifacts: [...existingArtifacts, stageOutputArtifact],
      }, { role: 'admin' })

      // Auto-generate summary from latest output (non-blocking)
      const summaryContent = output || currentItem?.output || currentItem?.brief
      if (summaryContent) {
        generateNodeSummaryAsync(workItemId, teamId, summaryContent)
      }

      // Generate node markdown and store as artifact for worker to commit
      const [freshItem] = await getThinkgraphNodesByIds(teamId, [workItemId])
      if (freshItem) {
        const allArtifacts = Array.isArray(freshItem.artifacts) ? freshItem.artifacts : []
        const stageOutputs = extractStageOutputs(allArtifacts)
        const conversationLogs = allArtifacts
          .filter((a: any) => a?.type === 'conversation-log')
          .map((a: any) => ({ stage: a.stage, log: a.log }))

        const markdown = buildNodeMarkdown({
          id: freshItem.id,
          title: freshItem.title,
          summary: freshItem.summary || undefined,
          template: freshItem.template || undefined,
          steps: Array.isArray(freshItem.steps) ? freshItem.steps : undefined,
          signal: agentSignal || freshItem.signal || undefined,
          brief: freshItem.brief || undefined,
          stageOutputs,
          conversationLogs,
        })

        // Replace existing node-markdown artifact with updated version
        const cleanedForMd = allArtifacts.filter((a: any) => a?.type !== 'node-markdown')
        cleanedForMd.push({
          type: 'node-markdown',
          path: `.thinkgraph/nodes/${freshItem.id}.md`,
          content: markdown,
          timestamp: new Date().toISOString(),
        })
        await updateThinkgraphNode(workItemId, teamId, 'system', {
          artifacts: cleanedForMd,
        }, { role: 'admin' })
      }
    }

    if (agentSignal === 'green' && currentItem?.stage) {
      // Read stage-meta artifact for verdict/skipTo
      const artifacts = Array.isArray(currentItem.artifacts) ? currentItem.artifacts : []
      const stageMeta = artifacts.find((a: any) => a?.type === 'stage-meta') || {}
      const verdict = stageMeta.verdict as string | undefined
      const skipTo = stageMeta.skipTo as string | undefined

      // Use node's configured steps array, fall back to default order
      const nodeSteps: string[] = Array.isArray(currentItem.steps) && currentItem.steps.length > 0
        ? currentItem.steps
        : DEFAULT_STAGE_ORDER

      // Determine next stage based on current stage, verdict, and skipTo
      let nextStage: string | null = null

      if (currentItem.stage === 'reviewer' && verdict) {
        // Structured review verdicts
        switch (verdict) {
          case 'APPROVE':
            // Advance to merger (next in sequence after reviewer)
            nextStage = getNextInSteps(nodeSteps, 'reviewer')
            console.log(`[webhook] Reviewer verdict APPROVE → ${nextStage}`)
            break
          case 'REVISE': {
            // Check loop counter — max 3 builder↔reviewer cycles
            const loopCount = countLoopIterations(artifacts, 'builder', 'reviewer')
            if (loopCount >= 3) {
              // Max iterations reached — orange signal for human
              await updateThinkgraphNode(workItemId, teamId, 'system', {
                signal: 'orange',
                status: 'waiting',
                assignee: 'human',
                output: `Loop limit reached (${loopCount} builder↔reviewer cycles). Human intervention needed.\n\nLatest reviewer feedback:\n${currentItem.output || output || '(none)'}`,
              }, { role: 'admin' })
              console.log(`[webhook] Loop limit reached for ${workItemId} after ${loopCount} cycles`)
              stageAdvanced = true // prevent child auto-advance
              break
            }
            // Route back to builder with reviewer feedback
            nextStage = 'builder'
            // Store loop iteration marker
            const loopArtifact = { type: 'loop-iteration', from: 'reviewer', to: 'builder', iteration: loopCount + 1, timestamp: new Date().toISOString() }
            const currentArtifacts = Array.isArray(currentItem.artifacts) ? currentItem.artifacts : []
            await updateThinkgraphNode(workItemId, teamId, 'system', {
              artifacts: [...currentArtifacts, loopArtifact],
            }, { role: 'admin' })
            console.log(`[webhook] Reviewer verdict REVISE → builder (iteration ${loopCount + 1}/3)`)
            break
          }
          case 'RETHINK':
            // Route back to analyst — the approach needs changing
            nextStage = 'analyst'
            console.log(`[webhook] Reviewer verdict RETHINK → analyst`)
            break
          case 'UNAVAILABLE':
            // Orange signal for human intervention
            await updateThinkgraphNode(workItemId, teamId, 'system', {
              signal: 'orange',
              status: 'waiting',
              assignee: 'human',
            }, { role: 'admin' })
            console.log(`[webhook] Reviewer verdict UNAVAILABLE → orange signal`)
            stageAdvanced = true
            break
        }
      }
      else if (currentItem.stage === 'analyst' && skipTo) {
        // Analyst recommended skipping to a specific stage
        if (nodeSteps.includes(skipTo)) {
          nextStage = skipTo
          console.log(`[webhook] Analyst skipTo → ${skipTo}`)
        } else {
          // Invalid skipTo target, fall through to normal progression
          nextStage = getNextInSteps(nodeSteps, currentItem.stage)
          console.log(`[webhook] Analyst skipTo "${skipTo}" not in steps, falling through to ${nextStage}`)
        }
      }
      else {
        // Normal linear progression using node's steps array
        nextStage = getNextInSteps(nodeSteps, currentItem.stage)
      }

      if (nextStage && !stageAdvanced) {
        try {
          // Clean up stage-meta artifact before advancing (verdict/skipTo consumed)
          const latestArtifacts = Array.isArray(currentItem.artifacts) ? currentItem.artifacts : []
          const cleanedArtifacts = latestArtifacts.filter((a: any) => a?.type !== 'stage-meta')

          if (nextStage === 'launcher') {
            // Launcher stage: wait for CI results, don't dispatch to Pi
            await updateThinkgraphNode(workItemId, teamId, 'system', {
              stage: 'launcher',
              signal: null,
              status: 'waiting',
              assignee: 'ci',
              artifacts: cleanedArtifacts,
            }, { role: 'admin' })
            stageAdvanced = true
            console.log(`[webhook] Stage advanced: ${workItemId} → launcher (waiting for CI)`)
          }
          else {
            // Normal stage: advance and dispatch to Pi
            await updateThinkgraphNode(workItemId, teamId, 'system', {
              stage: nextStage,
              signal: null,
              status: 'queued',
              assignee: 'pi',
              artifacts: cleanedArtifacts,
            }, { role: 'admin' })
            stageAdvanced = true
            console.log(`[webhook] Stage advanced: ${workItemId} → ${nextStage} (queued)`)

            // Auto-dispatch to Pi worker
            await dispatchToWorker(event, config, teamId, workItemId, nextStage)
          }
        } catch (err: any) {
          console.error('[webhook] Stage advance/dispatch failed:', err.message)
        }
      }
    }

    // Auto-advance children: when done and no stage progression, find next queued child
    if (!stageAdvanced) {
      try {
        const allItems = await getAllThinkgraphNodes(teamId)
        const queuedChildren = allItems
          .filter((item: any) => item.parentId === workItemId && item.status === 'queued' && item.assignee === 'pi')
          .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))

        if (queuedChildren.length > 0) {
          const nextItem = queuedChildren[0]
          await updateThinkgraphNode(nextItem.id, teamId, 'system', { status: 'active' }, { role: 'admin' })
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

/** Get the next stage in the node's steps array */
function getNextInSteps(steps: string[], currentStage: string): string | null {
  const idx = steps.indexOf(currentStage)
  if (idx >= 0 && idx < steps.length - 1) {
    return steps[idx + 1]
  }
  return null
}

/** Count completed builder↔reviewer loop iterations from artifacts */
function countLoopIterations(artifacts: any[], from: string, to: string): number {
  if (!Array.isArray(artifacts)) return 0
  return artifacts.filter(
    (a: any) => a?.type === 'loop-iteration' && a.from === to && a.to === from,
  ).length
}

/** Dispatch a work item to the Pi worker */
async function dispatchToWorker(event: any, config: any, teamId: string, workItemId: string, stage: string) {
  const piWorkerUrl = config.piWorkerUrl || 'https://pi-api.pmcp.dev'
  const [targetItem] = await getThinkgraphNodesByIds(teamId, [workItemId])
  if (!targetItem) return

  const { buildNodeContext } = await import('~~/server/utils/context-builder')
  const allItems = await getAllThinkgraphNodes(teamId)
  const contextPayload = buildNodeContext(
    allItems.map((item: any) => ({
      id: item.id,
      parentId: item.parentId,
      title: item.title,
      nodeType: item.template,
      status: item.status,
      summary: item.summary,
      brief: item.brief,
      output: item.output,
      pinned: item.pinned,
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
      skill: targetItem.skill || targetItem.template,
      workItemType: targetItem.template,
      stage,
      teamId,
      teamSlug: teamId,
      callbackUrl: `${config.public?.siteUrl || `https://${getHeader(event, 'host') || 'localhost:3004'}`}/api/teams/${teamId}/dispatch/webhook`,
    },
  })
  await updateThinkgraphNode(workItemId, teamId, 'system', { status: 'active' }, { role: 'admin' })
  console.log(`[webhook] Auto-dispatched ${workItemId} at stage ${stage}`)
}
