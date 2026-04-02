import { eq, and } from 'drizzle-orm'
import { updateThinkgraphNode, createThinkgraphNode, getAllThinkgraphNodes } from '~~/layers/thinkgraph/collections/nodes/server/database/queries'
import * as tables from '~~/layers/thinkgraph/collections/nodes/server/database/schema'

/**
 * CI Webhook for receiving typecheck/CI results from GitHub Actions.
 *
 * POST /api/teams/[id]/dispatch/ci-webhook
 * Headers: X-Webhook-Secret: <shared secret>
 * Body: {
 *   branch: string,         // Git branch name (maps to workItem.worktree)
 *   status: 'pass' | 'fail',
 *   check: string,          // e.g. 'typecheck', 'lint', 'test'
 *   error?: string,         // Error output if failed
 *   runUrl?: string,        // GitHub Actions run URL
 * }
 *
 * On pass: updates work item artifacts with { type: 'ci', check, status: 'pass' }
 * On fail: creates a child work item with the error details
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
  const { branch, status, check, error: errorOutput, runUrl } = body

  if (!branch || !status || !check) {
    throw createError({ status: 400, statusText: 'Missing required fields: branch, status, check' })
  }

  if (!['pass', 'fail'].includes(status)) {
    throw createError({ status: 400, statusText: 'Status must be "pass" or "fail"' })
  }

  // Find work item by worktree (branch name)
  const db = useDB()
  const [workItem] = await (db as any)
    .select()
    .from(tables.thinkgraphNodes)
    .where(
      and(
        eq(tables.thinkgraphNodes.teamId, teamId),
        eq(tables.thinkgraphNodes.worktree, branch),
      ),
    )
    .limit(1)

  if (!workItem) {
    // Not an error — branch may not be associated with a work item
    return {
      success: false,
      message: `No work item found for branch "${branch}"`,
    }
  }

  const ciArtifact = {
    type: 'ci',
    check,
    status,
    runUrl: runUrl || null,
    timestamp: new Date().toISOString(),
  }

  // Helper: parse existing artifacts safely
  const parseArtifacts = (raw: any): any[] => {
    if (Array.isArray(raw)) return raw
    if (typeof raw === 'string') { try { return JSON.parse(raw) } catch { return [] } }
    return []
  }

  if (status === 'pass') {
    const existingArtifacts = parseArtifacts(workItem.artifacts)

    // Remove previous CI artifacts for the same check, then add new one
    const filteredArtifacts = existingArtifacts.filter(
      (a: any) => !(a.type === 'ci' && a.check === check),
    )
    filteredArtifacts.push(ciArtifact)

    const updates: Record<string, any> = { artifacts: filteredArtifacts }

    // Launcher stage integration: if work item is at launcher stage, CI pass → green signal
    if (workItem.stage === 'launcher' && workItem.status === 'waiting') {
      updates.signal = 'green'
      updates.status = 'done'
      updates.output = `CI ${check} passed ✅${runUrl ? ` — [Run](${runUrl})` : ''}`
      console.log(`[ci-webhook] Launcher gate passed for ${workItem.id} (${check})`)
    }

    await updateThinkgraphNode(
      workItem.id,
      teamId,
      'system',
      updates,
      { role: 'admin' },
    )

    // If we just completed the launcher stage, trigger the main webhook to advance pipeline
    if (updates.signal === 'green') {
      try {
        const siteUrl = config.public?.siteUrl || `https://${getHeader(event, 'host') || 'localhost:3004'}`
        console.log(`[ci-webhook] Triggering pipeline advance at ${siteUrl}/api/teams/${teamId}/dispatch/webhook`)
        await $fetch(`${siteUrl}/api/teams/${teamId}/dispatch/webhook`, {
          method: 'POST',
          headers: expectedSecret ? { 'x-webhook-secret': expectedSecret } : {},
          body: {
            workItemId: workItem.id,
            status: 'done',
            signal: 'green',
          },
        })
        console.log(`[ci-webhook] Triggered pipeline advance for ${workItem.id} → reviewer`)
      }
      catch (err: any) {
        console.error('[ci-webhook] Failed to trigger pipeline advance:', err.message, err.data || '')
      }
    }

    return {
      success: true,
      workItemId: workItem.id,
      action: updates.signal === 'green' ? 'launcher_passed' : 'artifact_updated',
      artifact: ciArtifact,
    }
  }
  else {
    // status === 'fail'
    const existingArtifacts = parseArtifacts(workItem.artifacts)
    const filteredArtifacts = existingArtifacts.filter(
      (a: any) => !(a.type === 'ci' && a.check === check),
    )
    filteredArtifacts.push(ciArtifact)

    // Launcher stage integration: CI fail → dispatch back to builder
    if (workItem.stage === 'launcher') {
      const truncatedError = errorOutput
        ? (errorOutput.length > 4000 ? errorOutput.slice(-4000) : errorOutput)
        : `${check} failed (no error output captured)`

      // Set signal red and revert to builder stage
      await updateThinkgraphNode(
        workItem.id,
        teamId,
        'system',
        {
          artifacts: filteredArtifacts,
          stage: 'builder',
          signal: null,
          status: 'queued',
          assignee: 'pi',
          output: `CI ${check} failed — sending back to builder.\n\n**Error:**\n\`\`\`\n${truncatedError}\n\`\`\`${runUrl ? `\n\n**Run URL:** ${runUrl}` : ''}`,
        },
        { role: 'admin' },
      )
      console.log(`[ci-webhook] Launcher gate failed for ${workItem.id} (${check}) — reverting to builder`)

      // Auto-dispatch to Pi worker to fix
      try {
        const piWorkerUrl = config.piWorkerUrl || 'https://pi-api.pmcp.dev'
        const siteUrl = config.public?.siteUrl || `http://${getHeader(event, 'host') || 'localhost:3004'}`
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
          workItem.id,
        )

        await $fetch(`${piWorkerUrl}/dispatch`, {
          method: 'POST',
          body: {
            workItemId: workItem.id,
            projectId: workItem.projectId,
            prompt: `CI ${check} failed. Fix the errors and push to the branch.\n\n\`\`\`\n${truncatedError}\n\`\`\``,
            context: contextPayload.markdown,
            skill: workItem.skill || workItem.template,
            workItemType: workItem.template,
            stage: 'builder',
            teamId,
            teamSlug: teamId,
            callbackUrl: `${siteUrl}/api/teams/${teamId}/dispatch/webhook`,
          },
        })
        await updateThinkgraphNode(workItem.id, teamId, 'system', { status: 'active' }, { role: 'admin' })
        console.log(`[ci-webhook] Auto-dispatched ${workItem.id} back to builder to fix ${check}`)
      }
      catch (err: any) {
        console.error('[ci-webhook] Failed to auto-dispatch builder fix:', err.message)
      }

      return {
        success: true,
        workItemId: workItem.id,
        action: 'launcher_failed_redispatch',
        artifact: ciArtifact,
      }
    }

    // Non-launcher CI failure: create child work item (existing behavior)
    const truncatedError = errorOutput
      ? (errorOutput.length > 4000 ? errorOutput.slice(-4000) : errorOutput)
      : 'Typecheck failed (no error output captured)'

    const childWorkItem = await createThinkgraphNode({
      id: crypto.randomUUID().replace(/-/g, '').slice(0, 21),
      teamId,
      projectId: workItem.projectId,
      parentId: workItem.id,
      title: `CI ${check} failed on branch ${branch}`,
      type: 'fix',
      status: 'queued',
      assignee: workItem.assignee || 'pi',
      brief: `The \`${check}\` CI check failed on branch \`${branch}\`.\n\n**Run URL:** ${runUrl || 'N/A'}\n\n**Error output:**\n\`\`\`\n${truncatedError}\n\`\`\`\n\nFix the errors and push to the branch.`,
      output: null,
      worktree: branch,
      skill: 'generate',
      artifacts: JSON.stringify([ciArtifact]),
      path: `${workItem.path}`,
      depth: (workItem.depth || 0) + 1,
      order: Date.now(),
      owner: workItem.owner,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as any)

    // Also update the parent's artifacts with the failure
    await updateThinkgraphNode(
      workItem.id,
      teamId,
      'system',
      { artifacts: filteredArtifacts },
      { role: 'admin' },
    )

    return {
      success: true,
      workItemId: workItem.id,
      action: 'child_created',
      childWorkItemId: childWorkItem.id,
      artifact: ciArtifact,
    }
  }
})
