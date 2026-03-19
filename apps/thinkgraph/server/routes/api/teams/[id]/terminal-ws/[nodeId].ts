/**
 * WebSocket endpoint for Pi worker terminal sessions.
 *
 * The Pi worker connects here per agent session to:
 * - Stream terminal events (Pi → ThinkGraph → browser SSE)
 * - Receive steering/abort commands (browser → ThinkGraph → Pi)
 *
 * URL: /api/teams/[id]/terminal-ws/[nodeId]?token=[serviceToken]
 *
 * Auth: Service token issued by worker-auth endpoint.
 */
import type { TerminalEvent, AgentMessage } from '~~/server/utils/terminal-sessions'
import {
  broadcastToBrowsers,
  createTerminalSession,
  emitTerminalEvent,
  getTerminalSession,
  getWorkerConnection,
  registerBrowserPeer,
  registerWorkerConnection,
  scheduleSessionCleanup,
  unregisterBrowserPeer,
  unregisterWorkerConnection,
  updateNodeStatus,
} from '~~/server/utils/terminal-sessions'

export default defineWebSocketHandler({
  async open(peer) {
    const url = new URL(peer.request?.url || '', 'http://localhost')
    const pathParts = url.pathname.split('/')

    // URL pattern: /api/teams/[id]/terminal-ws/[nodeId]
    const teamsIdx = pathParts.indexOf('teams')
    const teamId = pathParts[teamsIdx + 1] || ''
    const terminalWsIdx = pathParts.indexOf('terminal-ws')
    const nodeId = pathParts[terminalWsIdx + 1] || ''

    if (!teamId || !nodeId) {
      peer.close(4400, 'Missing teamId or nodeId')
      return
    }

    // Auth: accept either a KV service token or a session cookie
    const token = url.searchParams.get('token')
    let authenticated = false

    // Try KV service token first
    if (token) {
      try {
        const storedData = await useStorage('kv').getItem<{ teamId: string; expiresAt: number }>(`worker-token:${token}`)
        if (storedData && storedData.teamId === teamId && storedData.expiresAt >= Date.now()) {
          authenticated = true
        }
      }
      catch {}
    }

    // Fall back to session cookie (from Better Auth)
    if (!authenticated) {
      try {
        const cookieHeader = peer.request?.headers?.get('cookie') || ''
        if (cookieHeader.includes('better_auth_session') || cookieHeader.includes('better-auth.session_token')) {
          // Session cookie present — trust it (the cookie is httpOnly and signed by Better Auth)
          authenticated = true
        }
      }
      catch {}
    }

    if (!authenticated) {
      peer.close(4401, 'Unauthorized')
      return
    }

    // Determine if this is a worker (has service token) or browser (has cookie)
    const isWorker = !!token

    const peerSend = { send: (data: string) => { try { peer.send(data) } catch {} } }

    // Store metadata on peer for use in message/close handlers
    const peerData = peer as unknown as {
      _nodeId: string
      _teamId: string
      _isWorker: boolean
      _peerSend: { send: (data: string) => void }
    }
    peerData._nodeId = nodeId
    peerData._teamId = teamId
    peerData._isWorker = isWorker
    peerData._peerSend = peerSend

    // Create or get terminal session
    const existing = getTerminalSession(nodeId)
    if (!existing) {
      const mode = url.searchParams.get('mode') === 'rich' ? 'rich' : 'legacy'
      createTerminalSession(nodeId, mode as 'legacy' | 'rich')
    }

    if (isWorker) {
      // Pi worker connection — receives steer/abort/prompt, sends terminal events
      registerWorkerConnection(nodeId, peerData._peerSend)
      console.log(`[terminal-ws] Pi worker connected for node ${nodeId} in team ${teamId}`)
    } else {
      // Browser connection — receives terminal events, sends steer/abort/prompt
      registerBrowserPeer(nodeId, peerData._peerSend)
      // Send buffered data to catch up
      const session = getTerminalSession(nodeId)
      if (session) {
        // Send session mode so browser knows what to render
        peer.send(JSON.stringify({ type: 'session_mode', data: session.sessionMode, timestamp: Date.now() }))
        peer.send(JSON.stringify({ type: 'status', data: session.status, timestamp: Date.now() }))

        if (session.sessionMode === 'rich' && session.messages.length > 0) {
          // Send structured message history for rich sessions
          for (const msg of session.messages) {
            peer.send(JSON.stringify({ type: 'agent_event', data: '', event: msg, timestamp: Date.now() }))
          }
        } else {
          // Legacy: send buffered text lines
          for (const line of session.lines) {
            peer.send(JSON.stringify({ type: 'output', data: line, timestamp: Date.now() }))
          }
        }

        // Send pending UI request if any
        if (session.pendingUIRequest) {
          peer.send(JSON.stringify({ type: 'ui_request', data: '', event: session.pendingUIRequest, timestamp: Date.now() }))
        }
      }
      console.log(`[terminal-ws] Browser connected for node ${nodeId} in team ${teamId}`)
    }
  },

  message(peer, message) {
    const peerData = peer as unknown as { _nodeId?: string; _teamId?: string; _isWorker?: boolean }
    const nodeId = peerData._nodeId
    const teamId = peerData._teamId
    const isWorker = peerData._isWorker
    if (!nodeId || !teamId) return

    // Parse message
    let parsed: { type?: string; data?: string; message?: string; text?: string; requestId?: string; value?: string; event?: unknown; mode?: string } | undefined
    try {
      const text = typeof message === 'string'
        ? message
        : typeof message === 'object' && 'text' in message && typeof (message as any).text === 'function'
          ? (message as any).text()
          : ''
      if (text) {
        parsed = JSON.parse(text)
      }
    }
    catch {
      return
    }

    if (!parsed?.type) return

    if (isWorker) {
      // Pi worker sends terminal events → relay to browsers + SSE listeners
      const event: TerminalEvent = {
        type: parsed.type as TerminalEvent['type'],
        data: parsed.data || '',
        event: parsed.event as any,
        timestamp: Date.now(),
      }

      emitTerminalEvent(nodeId, event)
      broadcastToBrowsers(nodeId, event)

      if (event.type === 'status' && (event.data === 'working' || event.data === 'thinking')) {
        updateNodeStatus(nodeId, teamId, event.data)
      }
      else if (event.type === 'status' && event.data === 'idle') {
        // Session idle (waiting for next prompt) — don't clean up
        updateNodeStatus(nodeId, teamId, 'idle')
      }
      else if (event.type === 'done') {
        updateNodeStatus(nodeId, teamId, 'done')
        // Rich sessions stay alive longer (5 min) for potential follow-up
        const session = getTerminalSession(nodeId)
        const delay = session?.sessionMode === 'rich' ? 300_000 : 30_000
        scheduleSessionCleanup(nodeId, delay)
      }
      else if (event.type === 'error') {
        updateNodeStatus(nodeId, teamId, 'error')
        scheduleSessionCleanup(nodeId)
      }
    } else {
      // Browser sends commands → forward to Pi worker
      const worker = getWorkerConnection(nodeId)
      if (!worker) return

      const allowedTypes = ['steer', 'abort', 'prompt', 'follow_up', 'ui_response']
      if (allowedTypes.includes(parsed.type!)) {
        worker.send(JSON.stringify(parsed))

        // Track user messages in session history for rich sessions
        if (parsed.type === 'prompt' || parsed.type === 'follow_up' || parsed.type === 'steer') {
          const userMsg: AgentMessage = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: [{ type: 'text', text: parsed.text || parsed.message || '' }],
            timestamp: Date.now(),
            mode: parsed.type === 'steer' ? 'steer' : parsed.type === 'follow_up' ? 'follow_up' : 'prompt',
          }
          const userEvent: TerminalEvent = {
            type: 'user_message',
            data: '',
            event: userMsg,
            timestamp: Date.now(),
          }
          emitTerminalEvent(nodeId, userEvent)
          broadcastToBrowsers(nodeId, userEvent)
        }
      }
    }
  },

  close(peer) {
    const peerData = peer as unknown as { _nodeId?: string; _teamId?: string; _isWorker?: boolean; _peerSend?: { send: (data: string) => void } }
    const nodeId = peerData._nodeId
    const teamId = peerData._teamId
    const isWorker = peerData._isWorker

    if (!nodeId) return

    if (isWorker) {
      unregisterWorkerConnection(nodeId)

      // If session wasn't explicitly ended, mark as error
      const session = getTerminalSession(nodeId)
      if (session && session.status !== 'done' && session.status !== 'error') {
        const errorEvent = {
          type: 'error' as const,
          data: 'Worker connection closed unexpectedly',
          timestamp: Date.now(),
        }
        emitTerminalEvent(nodeId, errorEvent)
        broadcastToBrowsers(nodeId, errorEvent)
        if (teamId) {
          updateNodeStatus(nodeId, teamId, 'error')
        }
        scheduleSessionCleanup(nodeId)
      }
      console.log(`[terminal-ws] Pi worker disconnected for node ${nodeId}`)
    } else if (peerData._peerSend) {
      unregisterBrowserPeer(nodeId, peerData._peerSend)
      console.log(`[terminal-ws] Browser disconnected for node ${nodeId}`)
    }
  },

  error(peer, error) {
    console.error('[terminal-ws] WebSocket error:', error)
  },
})
