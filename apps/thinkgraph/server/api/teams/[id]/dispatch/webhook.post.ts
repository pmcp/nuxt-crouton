import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { updateThinkgraphWorkItem } from '~~/layers/thinkgraph/collections/workitems/server/database/queries'

/**
 * Webhook for receiving dispatch results from Pi.dev or other providers.
 *
 * POST /api/teams/[id]/dispatch/webhook
 * Body: { workItemId, status, output?, artifacts?, error? }
 *
 * Called by the Pi worker (or API provider callback) when work completes.
 */
export default defineEventHandler(async (event) => {
  const { team, user, membership } = await resolveTeamAndCheckMembership(event)
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
    team.id,
    user.id,
    updates,
    { role: membership.role },
  )

  return { success: true, workItemId, status: updates.status }
})
