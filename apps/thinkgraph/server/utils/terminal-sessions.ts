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
import { updateThinkgraphNode } from '~~/layers/thinkgraph/collections/nodes/server/database/queries'

// ─── Agent Event Types (structured events from Pi coding agent) ───

/** Content block within an agent message */
export interface AgentContentBlock {
  type: 'text' | 'tool_use' | 'tool_result' | 'thinking'
  text?: string
  name?: string // tool name
  input?: Record<string, unknown> // tool input params
  result?: string // tool result text
  thinking?: string
  toolCallId?: string
}

/** A structured message in the agent session */
export interface AgentMessage {
  id: string
  role: 'assistant' | 'user' | 'system'
  content: AgentContentBlock[]
  timestamp: number
  mode?: 'prompt' | 'steer' | 'follow_up' // for user messages
}

/** Extension UI request forwarded from Pi agent */
export interface ExtensionUIRequest {
  requestId: string
  uiType: 'select' | 'confirm' | 'input' | 'editor' | 'notify'
  title?: string
  message?: string
  options?: Array<{ label: string; value: string }>
  defaultValue?: string
}

// ─── Terminal Session Types ───

// Terminal output store: nodeId → { lines, listeners, status }
export interface TerminalSession {
  nodeId: string
  lines: string[]
  messages: AgentMessage[] // structured message history
  status: 'thinking' | 'working' | 'done' | 'error' | 'idle' | 'waiting_input'
  startedAt: number
  listeners: Set<(event: TerminalEvent) => void>
  pendingUIRequest?: ExtensionUIRequest
  sessionMode: 'legacy' | 'rich' // legacy = text-only, rich = structured events
}

export interface TerminalEvent {
  type: 'output' | 'status' | 'done' | 'error' | 'agent_event' | 'ui_request' | 'user_message'
  data: string
  event?: AgentContentBlock | AgentMessage | ExtensionUIRequest // structured payload
  timestamp: number
}

const terminalSessions = new Map<string, TerminalSession>()

// Track active WebSocket connections from Pi worker (nodeId → peer)
const activeWorkerConnections = new Map<string, { send: (data: string) => void }>()

/** Create a new terminal session for a node */
export function createTerminalSession(nodeId: string, mode: 'legacy' | 'rich' = 'legacy'): TerminalSession {
  const session: TerminalSession = {
    nodeId,
    lines: [],
    messages: [],
    status: 'thinking',
    startedAt: Date.now(),
    listeners: new Set(),
    sessionMode: mode,
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
  if (event.type === 'agent_event' && event.event && 'role' in event.event) {
    const msg = event.event as AgentMessage
    session.messages.push(msg)
    // Keep last 100 messages to avoid memory bloat
    if (session.messages.length > 100) {
      session.messages.splice(0, session.messages.length - 100)
    }
  }
  if (event.type === 'user_message' && event.event && 'role' in event.event) {
    const msg = event.event as AgentMessage
    session.messages.push(msg)
  }
  if (event.type === 'ui_request' && event.event) {
    session.pendingUIRequest = event.event as ExtensionUIRequest
    session.status = 'waiting_input'
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

// ─── Live Status (activity text on canvas cards) ───

/** Debounce timers for liveStatus updates per node */
const liveStatusTimers = new Map<string, ReturnType<typeof setTimeout>>()

/**
 * Extract a short activity description from an agent message.
 * Returns null if no useful activity can be extracted.
 */
export function extractActivity(msg: AgentMessage): string | null {
  if (msg.role !== 'assistant') return null
  for (const block of msg.content) {
    if (block.type === 'tool_use' && block.name) {
      // Humanize tool names: "Read" → "Reading file", "Bash" → "Running command", etc.
      const toolLabels: Record<string, string> = {
        Read: 'Reading file',
        Write: 'Writing file',
        Edit: 'Editing file',
        Bash: 'Running command',
        Grep: 'Searching code',
        Glob: 'Finding files',
        Agent: 'Delegating task',
        WebSearch: 'Searching web',
        WebFetch: 'Fetching page',
      }
      return toolLabels[block.name] || `Using ${block.name}`
    }
    if (block.type === 'thinking' && block.thinking) {
      return 'Thinking...'
    }
    if (block.type === 'text' && block.text) {
      // First 60 chars of text output
      const snippet = block.text.trim().split('\n')[0].slice(0, 60)
      if (snippet.length > 0) return snippet
    }
  }
  return null
}

/**
 * Update the liveStatus artifact on a node (debounced to avoid DB thrash).
 * Called from terminal-ws when agent events arrive.
 */
export function updateLiveStatus(
  nodeId: string,
  teamId: string,
  activity: string,
  model?: string,
) {
  // Clear existing timer
  const existing = liveStatusTimers.get(nodeId)
  if (existing) clearTimeout(existing)

  // Debounce: write at most once per 2 seconds
  const timer = setTimeout(async () => {
    liveStatusTimers.delete(nodeId)
    try {
      const { getAllThinkgraphNodes } = await import('~~/layers/thinkgraph/collections/nodes/server/database/queries')
      const items = await getAllThinkgraphNodes(teamId)
      const node = items.find((i: any) => i.id === nodeId)
      if (!node) return

      const arts = Array.isArray(node.artifacts) ? node.artifacts : []
      const filtered = arts.filter((a: any) => a?.type !== 'liveStatus')
      const liveStatus = { type: 'liveStatus', activity, model: model || null, updatedAt: new Date().toISOString() }

      await updateThinkgraphNode(nodeId, teamId, 'system', {
        artifacts: [...filtered, liveStatus],
      } as any, { role: 'admin' })
      signalCollectionChange(teamId, 'thinkgraphNodes')
    }
    catch (err) {
      console.error(`[terminal-sessions] Failed to update liveStatus for ${nodeId}:`, err)
    }
  }, 2000)

  liveStatusTimers.set(nodeId, timer)
}

/**
 * Clear liveStatus artifact when session ends.
 */
export async function clearLiveStatus(nodeId: string, teamId: string) {
  // Cancel pending debounce
  const timer = liveStatusTimers.get(nodeId)
  if (timer) {
    clearTimeout(timer)
    liveStatusTimers.delete(nodeId)
  }

  try {
    const { getAllThinkgraphNodes } = await import('~~/layers/thinkgraph/collections/nodes/server/database/queries')
    const items = await getAllThinkgraphNodes(teamId)
    const node = items.find((i: any) => i.id === nodeId)
    if (!node) return

    const arts = Array.isArray(node.artifacts) ? node.artifacts : []
    const filtered = arts.filter((a: any) => a?.type !== 'liveStatus')
    if (filtered.length !== arts.length) {
      await updateThinkgraphNode(nodeId, teamId, 'system', {
        artifacts: filtered,
      } as any, { role: 'admin' })
      signalCollectionChange(teamId, 'thinkgraphNodes')
    }
  }
  catch (err) {
    console.error(`[terminal-sessions] Failed to clear liveStatus for ${nodeId}:`, err)
  }
}

/** Map terminal statuses to work item statuses */
const TERMINAL_TO_WORKITEM_STATUS: Record<string, string> = {
  thinking: 'active',
  working: 'active',
  done: 'done',
  error: 'blocked',
  idle: 'queued',
}

/** Update node status in DB and signal collection change */
export async function updateNodeStatus(
  nodeId: string,
  teamId: string,
  status: 'thinking' | 'working' | 'done' | 'error' | 'idle',
) {
  const workItemStatus = TERMINAL_TO_WORKITEM_STATUS[status] || 'active'
  try {
    await updateThinkgraphNode(nodeId, teamId, 'system', { status: workItemStatus } as any, { role: 'admin' })
    signalCollectionChange(teamId, 'thinkgraphNodes')
  }
  catch (err) {
    console.error(`[terminal-sessions] Failed to update node status to "${status}" (→ ${workItemStatus}):`, err)
  }
}
