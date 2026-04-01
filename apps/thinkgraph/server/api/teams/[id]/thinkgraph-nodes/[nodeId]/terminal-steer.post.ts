import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { getWorkerConnection } from '~~/server/utils/terminal-sessions'

/**
 * POST /api/teams/:id/thinkgraph-decisions/:nodeId/terminal-steer
 *
 * Sends a steering message or abort command to the Pi worker
 * via the active WebSocket connection.
 *
 * Body: { message: string } for steering, { abort: true } for abort
 */
export default defineEventHandler(async (event) => {
  await resolveTeamAndCheckMembership(event)
  const nodeId = getRouterParam(event, 'nodeId')

  if (!nodeId) {
    throw createError({ status: 400, statusText: 'Decision ID required' })
  }

  const body = await readBody<{ message?: string; abort?: boolean }>(event)

  const ws = getWorkerConnection(nodeId)
  if (!ws) {
    throw createError({ status: 404, statusText: 'No active worker session for this node' })
  }

  if (body.abort) {
    ws.send(JSON.stringify({ type: 'abort' }))
    return { ok: true, action: 'abort' }
  }

  if (body.message) {
    ws.send(JSON.stringify({ type: 'steer', message: body.message }))
    return { ok: true, action: 'steer' }
  }

  throw createError({ status: 400, statusText: 'Provide message or abort: true' })
})
