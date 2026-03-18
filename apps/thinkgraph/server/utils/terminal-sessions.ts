/**
 * Terminal Sessions — manages terminal output streaming for agent sessions.
 *
 * Extracted from claude-responder.ts. This is the session management layer only.
 * The actual agent execution happens on the Pi worker, which connects via
 * WebSocket to push terminal events.
 *
 * Status lifecycle: thinking → working → done/error
 * Terminal output: streamed to browser clients via SSE (terminal.get.ts)
 */
import { updateThinkgraphDecision } from '~~/layers/thinkgraph/collections/decisions/server/database/queries'

// Terminal output store: nodeId → { lines, listeners, status }
export interface TerminalSession {
  nodeId: string
  lines: string[]
  status: 'thinking' | 'working' | 'done' | 'error'
  startedAt: number
  listeners: Set<(event: TerminalEvent) => void>
}

export interface TerminalEvent {
  type: 'output' | 'status' | 'done' | 'error'
  data: string
  timestamp: number
}

const terminalSessions = new Map<string, TerminalSession>()

// Track active WebSocket connections from Pi worker (nodeId → peer)
const activeWorkerConnections = new Map<string, { send: (data: string) => void }>()

/** Create a new terminal session for a node */
export function createTerminalSession(nodeId: string): TerminalSession {
  const session: TerminalSession = {
    nodeId,
    lines: [],
    status: 'thinking',
    startedAt: Date.now(),
    listeners: new Set(),
  }
  terminalSessions.set(nodeId, session)
  return session
}

/** Get an active terminal session for a node */
export function getTerminalSession(nodeId: string): TerminalSession | undefined {
  return terminalSessions.get(nodeId)
}

/** Get all active terminal sessions */
export function getActiveTerminalSessions(): Map<string, TerminalSession> {
  return terminalSessions
}

/** Subscribe to terminal events for a node */
export function subscribeTerminal(nodeId: string, listener: (event: TerminalEvent) => void): () => void {
  const session = terminalSessions.get(nodeId)
  if (!session) return () => {}
  session.listeners.add(listener)
  return () => session.listeners.delete(listener)
}

/** Emit a terminal event to all listeners */
export function emitTerminalEvent(nodeId: string, event: TerminalEvent) {
  const session = terminalSessions.get(nodeId)
  if (!session) return
  if (event.type === 'output') {
    session.lines.push(event.data)
    // Keep last 200 lines to avoid memory bloat
    if (session.lines.length > 200) {
      session.lines.splice(0, session.lines.length - 200)
    }
  }
  if (event.type === 'status') {
    session.status = event.data as TerminalSession['status']
  }
  if (event.type === 'done') {
    session.status = 'done'
  }
  if (event.type === 'error') {
    session.status = 'error'
  }
  for (const listener of session.listeners) {
    try { listener(event) } catch {}
  }
}

/** Clean up a terminal session after a delay */
export function scheduleSessionCleanup(nodeId: string, delayMs = 30_000) {
  setTimeout(() => terminalSessions.delete(nodeId), delayMs)
}

/** Register a Pi worker WebSocket connection for a node */
export function registerWorkerConnection(nodeId: string, peer: { send: (data: string) => void }) {
  activeWorkerConnections.set(nodeId, peer)
}

/** Unregister a Pi worker WebSocket connection */
export function unregisterWorkerConnection(nodeId: string) {
  activeWorkerConnections.delete(nodeId)
}

/** Get the active Pi worker WebSocket for a node (for sending steer/abort) */
export function getWorkerConnection(nodeId: string): { send: (data: string) => void } | undefined {
  return activeWorkerConnections.get(nodeId)
}

// Browser WebSocket peers (for relaying terminal events directly to browsers)
const browserPeers = new Map<string, Set<{ send: (data: string) => void }>>()

/** Register a browser WebSocket peer for a node */
export function registerBrowserPeer(nodeId: string, peer: { send: (data: string) => void }) {
  if (!browserPeers.has(nodeId)) {
    browserPeers.set(nodeId, new Set())
  }
  browserPeers.get(nodeId)!.add(peer)
}

/** Unregister a browser WebSocket peer */
export function unregisterBrowserPeer(nodeId: string, peer: { send: (data: string) => void }) {
  browserPeers.get(nodeId)?.delete(peer)
  if (browserPeers.get(nodeId)?.size === 0) {
    browserPeers.delete(nodeId)
  }
}

/** Broadcast a terminal event to all browser peers for a node */
export function broadcastToBrowsers(nodeId: string, event: TerminalEvent) {
  const peers = browserPeers.get(nodeId)
  if (!peers) return
  const msg = JSON.stringify(event)
  for (const peer of peers) {
    try { peer.send(msg) } catch {}
  }
}

/** Update node status in DB and signal collection change */
export async function updateNodeStatus(
  nodeId: string,
  teamId: string,
  status: 'thinking' | 'working' | 'done' | 'error' | 'idle',
) {
  try {
    await updateThinkgraphDecision(nodeId, teamId, 'system', { status } as any, { role: 'admin' })
    signalCollectionChange(teamId, 'thinkgraphDecisions')
  }
  catch (err) {
    console.error(`[terminal-sessions] Failed to update node status to "${status}":`, err)
  }
}
