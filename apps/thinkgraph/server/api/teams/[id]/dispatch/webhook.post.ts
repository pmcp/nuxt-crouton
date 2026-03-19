import { updateThinkgraphWorkItem } from '~~/layers/thinkgraph/collections/workitems/server/database/queries'

/**
 * Webhook for receiving dispatch results from Pi.dev or other providers.
 *
 * POST /api/teams/[id]/dispatch/webhook
 * Body: { workItemId, status, output?, artifacts?, error? }
 *
 * No auth required — this is a server-to-server callback.
 * The team ID in the URL path provides scoping.
 */
export default defineEventHandler(async (event) => {
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

  return { success: true, workItemId, status: updates.status }
})
