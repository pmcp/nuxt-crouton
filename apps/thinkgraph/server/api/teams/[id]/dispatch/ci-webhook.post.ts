import { eq, and } from 'drizzle-orm'
import { updateThinkgraphWorkItem, createThinkgraphWorkItem } from '~~/layers/thinkgraph/collections/workitems/server/database/queries'
import * as tables from '~~/layers/thinkgraph/collections/workitems/server/database/schema'

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
    .from(tables.thinkgraphWorkItems)
    .where(
      and(
        eq(tables.thinkgraphWorkItems.teamId, teamId),
        eq(tables.thinkgraphWorkItems.worktree, branch),
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

  if (status === 'pass') {
    // Merge CI artifact into existing artifacts
    const existingArtifacts = Array.isArray(workItem.artifacts)
      ? workItem.artifacts
      : (typeof workItem.artifacts === 'string' ? (() => { try { return JSON.parse(workItem.artifacts) } catch { return [] } })() : [])

    // Remove previous CI artifacts for the same check, then add new one
    const filteredArtifacts = existingArtifacts.filter(
      (a: any) => !(a.type === 'ci' && a.check === check),
    )
    filteredArtifacts.push(ciArtifact)

    await updateThinkgraphWorkItem(
      workItem.id,
      teamId,
      'system',
      { artifacts: filteredArtifacts },
      { role: 'admin' },
    )

    return {
      success: true,
      workItemId: workItem.id,
      action: 'artifact_updated',
      artifact: ciArtifact,
    }
  }
  else {
    // status === 'fail' — create a child work item with the error
    const truncatedError = errorOutput
      ? (errorOutput.length > 4000 ? errorOutput.slice(-4000) : errorOutput)
      : 'Typecheck failed (no error output captured)'

    const childWorkItem = await createThinkgraphWorkItem({
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
    const existingArtifacts = Array.isArray(workItem.artifacts)
      ? workItem.artifacts
      : (typeof workItem.artifacts === 'string' ? (() => { try { return JSON.parse(workItem.artifacts) } catch { return [] } })() : [])

    const filteredArtifacts = existingArtifacts.filter(
      (a: any) => !(a.type === 'ci' && a.check === check),
    )
    filteredArtifacts.push(ciArtifact)

    await updateThinkgraphWorkItem(
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
