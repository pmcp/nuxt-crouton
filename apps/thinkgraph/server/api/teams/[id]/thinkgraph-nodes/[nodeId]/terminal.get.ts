import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { getTerminalSession, subscribeTerminal } from '~~/server/utils/terminal-sessions'
import type { TerminalEvent } from '~~/server/utils/terminal-sessions'

/**
 * SSE endpoint that streams Claude Code terminal output for a node.
 *
 * GET /api/teams/:id/thinkgraph-decisions/:nodeId/terminal
 *
 * Sends existing buffered lines immediately, then streams new events.
 * Events: output, status, done, error
 */
export default defineEventHandler(async (event) => {
  await resolveTeamAndCheckMembership(event)
  const nodeId = getRouterParam(event, 'nodeId')

  if (!nodeId) {
    throw createError({ status: 400, statusText: 'Decision ID required' })
  }

  const session = getTerminalSession(nodeId)

  // If no active session, return a quick "no session" event and close
  if (!session) {
    setResponseHeader(event, 'Content-Type', 'text/event-stream')
    setResponseHeader(event, 'Cache-Control', 'no-cache')
    setResponseHeader(event, 'Connection', 'keep-alive')
    const body = `data: ${JSON.stringify({ type: 'error', data: 'No active session', timestamp: Date.now() })}\n\n`
    return body
  }

  // Set up SSE
  setResponseHeader(event, 'Content-Type', 'text/event-stream')
  setResponseHeader(event, 'Cache-Control', 'no-cache')
  setResponseHeader(event, 'Connection', 'keep-alive')

  const responseStream = event.node.res

  // Helper to send SSE event
  function send(evt: TerminalEvent) {
    try {
      responseStream.write(`data: ${JSON.stringify(evt)}\n\n`)
    }
    catch {
      // Client disconnected
    }
  }

  // Send current status
  send({ type: 'status', data: session.status, timestamp: Date.now() })

  // Send buffered lines
  for (const line of session.lines) {
    send({ type: 'output', data: line, timestamp: Date.now() })
  }

  // Subscribe to new events
  const unsubscribe = subscribeTerminal(nodeId, (evt) => {
    send(evt)
    // Close stream on terminal events
    if (evt.type === 'done' || evt.type === 'error') {
      setTimeout(() => {
        try { responseStream.end() } catch {}
      }, 500)
    }
  })

  // If session is already done/error, close after sending buffer
  if (session.status === 'done' || session.status === 'error') {
    send({ type: session.status === 'done' ? 'done' : 'error', data: session.status, timestamp: Date.now() })
    setTimeout(() => {
      try { responseStream.end() } catch {}
    }, 100)
    return
  }

  // Clean up on client disconnect
  event.node.req.on('close', () => {
    unsubscribe()
  })

  // Keep connection open — the stream will close on done/error
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  return new Promise(() => {})
})
