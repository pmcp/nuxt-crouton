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
import {
  createTerminalSession,
  emitTerminalEvent,
  getTerminalSession,
  registerWorkerConnection,
  scheduleSessionCleanup,
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

    // Auth: validate service token from query param
    const token = url.searchParams.get('token')
    if (!token) {
      peer.close(4401, 'Missing service token')
      return
    }

    // Validate token against KV store
    try {
      const storedData = await useStorage('kv').getItem<{ teamId: string; expiresAt: number }>(`worker-token:${token}`)
      if (!storedData || storedData.teamId !== teamId || storedData.expiresAt < Date.now()) {
        peer.close(4401, 'Invalid or expired service token')
        return
      }
    }
    catch {
      peer.close(4500, 'Token validation failed')
      return
    }

    // Store metadata on peer for use in message/close handlers
    const peerData = peer as unknown as {
      _nodeId: string
      _teamId: string
    }
    peerData._nodeId = nodeId
    peerData._teamId = teamId

    // Create or get terminal session
    const existing = getTerminalSession(nodeId)
    if (!existing) {
      createTerminalSession(nodeId)
    }

    // Register this WebSocket so steer/abort commands can be forwarded
    registerWorkerConnection(nodeId, {
      send: (data: string) => {
        try { peer.send(data) } catch {}
      },
    })

    console.log(`[terminal-ws] Pi worker connected for node ${nodeId} in team ${teamId}`)
  },

  message(peer, message) {
    const peerData = peer as unknown as { _nodeId?: string; _teamId?: string }
    const nodeId = peerData._nodeId
    const teamId = peerData._teamId
    if (!nodeId || !teamId) return

    // Parse message — Pi worker sends JSON terminal events
    let parsed: { type?: string; data?: string } | undefined
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

    const event = {
      type: parsed.type as 'output' | 'status' | 'done' | 'error',
      data: parsed.data || '',
      timestamp: Date.now(),
    }

    // Emit to SSE listeners (browser clients)
    emitTerminalEvent(nodeId, event)

    // Update node status in DB for status-changing events
    if (event.type === 'status' && (event.data === 'working' || event.data === 'thinking')) {
      updateNodeStatus(nodeId, teamId, event.data)
    }
    else if (event.type === 'done') {
      updateNodeStatus(nodeId, teamId, 'done')
      scheduleSessionCleanup(nodeId)
    }
    else if (event.type === 'error') {
      updateNodeStatus(nodeId, teamId, 'error')
      scheduleSessionCleanup(nodeId)
    }
  },

  close(peer) {
    const peerData = peer as unknown as { _nodeId?: string; _teamId?: string }
    const nodeId = peerData._nodeId
    const teamId = peerData._teamId

    if (nodeId) {
      unregisterWorkerConnection(nodeId)

      // If session wasn't explicitly ended, mark as error
      const session = getTerminalSession(nodeId)
      if (session && session.status !== 'done' && session.status !== 'error') {
        emitTerminalEvent(nodeId, {
          type: 'error',
          data: 'Worker connection closed unexpectedly',
          timestamp: Date.now(),
        })
        if (teamId) {
          updateNodeStatus(nodeId, teamId, 'error')
        }
        scheduleSessionCleanup(nodeId)
      }

      console.log(`[terminal-ws] Pi worker disconnected for node ${nodeId}`)
    }
  },

  error(peer, error) {
    console.error('[terminal-ws] WebSocket error:', error)
  },
})
