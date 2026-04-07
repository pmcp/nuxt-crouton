/**
 * Yjs flow room client for the Pi worker.
 *
 * Connects directly to the CollabRoom Durable Object (via the collab worker
 * in production, or same-origin crossws in dev) and operates as a full Yjs
 * collaborator — same as a browser tab.
 *
 * Capabilities:
 * - Full Y.Map<YjsFlowNode> CRUD (create/update/delete nodes)
 * - Presence awareness (shows "Pi Agent" on the canvas)
 * - Observes node changes for bidirectional control (steer, prompt, abort)
 * - Agent output written to node data fields (no separate terminal stream)
 *
 * Wire protocol (matches CollabRoom DO):
 * - Binary messages: Yjs updates (Uint8Array)
 * - JSON messages: awareness, ping/pong
 */
import WebSocket from 'ws'
import * as Y from 'yjs'
import { createHmac } from 'node:crypto'
import { ofetch } from 'ofetch'
import type { WorkerConfig } from './config.js'

/** Mirrors YjsFlowNode from crouton-flow/app/types/yjs.ts */
export interface YjsFlowNode {
  id: string
  title: string
  position: { x: number; y: number }
  parentId: string | null
  /** Row mirror — managed by useFlowSyncBridge from the DB row. Do NOT write Yjs-only state here. */
  data: Record<string, unknown>
  /** Yjs-only ephemeral state (agent activity, control signals). Survives row refetches. */
  ephemeral?: Record<string, unknown>
  createdAt: number
  updatedAt: number
  nodeType?: string
  containerId?: string | null
  dimensions?: { width: number; height: number }
  style?: Record<string, string>
}

/** Agent log entry stored on node.ephemeral.agentLog */
export interface AgentLogEntry {
  type: 'thinking' | 'text' | 'tool_use' | 'tool_result' | 'status' | 'error'
  text?: string
  name?: string
  input?: Record<string, unknown>
  result?: string
  ts: number
}

/** Awareness state for the Pi agent presence */
export interface PiAgentAwareness {
  user: {
    id: string
    name: string
    color: string
  }
  cursor: null
  selectedNodeId: string | null
  agentStatus?: 'idle' | 'thinking' | 'working' | 'done' | 'error'
}

export interface YjsFlowClientOptions {
  config: WorkerConfig
  flowId: string
  /** Called when a node's data.userPrompt changes (bidirectional control) */
  onUserPrompt?: (nodeId: string, prompt: string) => void
  /** Called when a node's data.userAbort is set */
  onUserAbort?: (nodeId: string) => void
  /** Called when a node's data.userSteer changes */
  onUserSteer?: (nodeId: string, message: string) => void
}

export class YjsFlowClient {
  private ws: WebSocket | null = null
  private doc: Y.Doc
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private pingTimer: ReturnType<typeof setInterval> | null = null
  private connected = false
  private synced = false
  private config: WorkerConfig
  private flowId: string
  private onUserPrompt?: (nodeId: string, prompt: string) => void
  private onUserAbort?: (nodeId: string) => void
  private onUserSteer?: (nodeId: string, message: string) => void
  private intentionalClose = false
  /** Track userPrompt values we've already processed to avoid re-firing */
  private processedPrompts = new Map<string, string>()

  constructor(options: YjsFlowClientOptions) {
    this.config = options.config
    this.flowId = options.flowId
    this.onUserPrompt = options.onUserPrompt
    this.onUserAbort = options.onUserAbort
    this.onUserSteer = options.onUserSteer
    this.doc = new Y.Doc()

    // Observe the nodes map for bidirectional control fields.
    // Control signals live on `node.ephemeral` (Yjs-only namespace), not on
    // `node.data` (DB row mirror that gets stomped on row refetches).
    this.nodesMap.observe((event) => {
      for (const [nodeId, change] of event.changes.keys) {
        if (change.action === 'update' || change.action === 'add') {
          const node = this.nodesMap.get(nodeId)
          if (!node) continue

          const eph = node.ephemeral || {}

          // Check for user prompt
          if (eph.userPrompt && typeof eph.userPrompt === 'string') {
            const prev = this.processedPrompts.get(nodeId)
            if (prev !== eph.userPrompt) {
              this.processedPrompts.set(nodeId, eph.userPrompt)
              this.onUserPrompt?.(nodeId, eph.userPrompt)
              // Clear the prompt field after processing
              this.updateEphemeral(nodeId, { userPrompt: null })
            }
          }

          // Check for abort signal
          if (eph.userAbort === true) {
            this.onUserAbort?.(nodeId)
            this.updateEphemeral(nodeId, { userAbort: null })
          }

          // Check for steer message
          if (eph.userSteer && typeof eph.userSteer === 'string') {
            this.onUserSteer?.(nodeId, eph.userSteer)
            this.updateEphemeral(nodeId, { userSteer: null })
          }
        }
      }
    })
  }

  /** The Y.Map that holds all flow nodes — same as browser's useFlowSync */
  get nodesMap(): Y.Map<YjsFlowNode> {
    return this.doc.getMap<YjsFlowNode>('nodes')
  }

  get isConnected(): boolean {
    return this.connected
  }

  get isSynced(): boolean {
    return this.synced
  }

  // ── Connection ──────────────────────────────────────────────

  /**
   * Connect to the flow room.
   * Returns a promise that resolves when the initial Yjs state is synced.
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.intentionalClose = false
      const url = this.buildWsUrl()

      console.log(`[yjs-flow] Connecting to flow room: ${this.flowId}`)

      this.ws = new WebSocket(url, { headers: this.buildHeaders() })
      this.ws.binaryType = 'arraybuffer'

      let resolved = false

      this.ws.on('open', () => {
        this.connected = true
        console.log('[yjs-flow] Connected')

        // Start ping keepalive
        this.pingTimer = setInterval(() => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'ping' }))
          }
        }, 25_000)

        // Send initial awareness
        this.sendAwareness('idle', null)
      })

      this.ws.on('message', (data) => {
        // Normalize to Uint8Array or string
        let bytes: Uint8Array | null = null
        if (data instanceof ArrayBuffer) {
          bytes = new Uint8Array(data)
        } else if (Buffer.isBuffer(data)) {
          bytes = new Uint8Array(data)
        } else if (typeof data === 'string') {
          this.handleJsonMessage(data)
          return
        }

        if (!bytes) return

        // Check if the binary message is actually JSON (awareness, pong, etc.)
        // JSON starts with { (123) or [ (91)
        if (bytes[0] === 123 || bytes[0] === 91) {
          this.handleJsonMessage(new TextDecoder().decode(bytes))
          return
        }

        // Binary Yjs update
        if (!this.synced) {
          Y.applyUpdate(this.doc, bytes, 'remote')
          this.synced = true
          console.log(`[yjs-flow] Synced — ${this.nodesMap.size} nodes in room`)
          if (!resolved) {
            resolved = true
            resolve()
          }
          return
        }

        Y.applyUpdate(this.doc, bytes, 'remote')
      })

      this.ws.on('close', () => {
        this.connected = false
        this.synced = false
        this.clearPing()
        console.log('[yjs-flow] Disconnected')

        if (!resolved) {
          resolved = true
          reject(new Error('WebSocket closed before sync'))
        }

        if (!this.intentionalClose) {
          this.reconnectTimer = setTimeout(() => this.connect(), 5000)
        }
      })

      this.ws.on('error', (err) => {
        console.error('[yjs-flow] WebSocket error:', err.message)
        if (!resolved) {
          resolved = true
          reject(err)
        }
      })

      // Broadcast local Yjs changes to the server
      this.doc.on('update', (update: Uint8Array, origin: unknown) => {
        // Only send updates that originated locally (not from remote)
        if (origin === 'remote') return
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(update)
        }
      })
    })
  }

  disconnect(): void {
    this.intentionalClose = true
    this.clearPing()
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.connected = false
    this.synced = false
  }

  // ── Node Operations (write to Y.Map → synced to all clients) ──

  /** Create a new node on the canvas */
  createNode(node: Partial<YjsFlowNode> & { id: string; title: string }): string {
    const now = Date.now()
    const full: YjsFlowNode = {
      position: { x: 0, y: 0 },
      parentId: null,
      data: {},
      createdAt: now,
      updatedAt: now,
      ...node,
    }
    this.nodesMap.set(node.id, full)
    return node.id
  }

  /** Update an existing node (merges fields) */
  updateNode(nodeId: string, updates: Partial<YjsFlowNode>): void {
    const existing = this.nodesMap.get(nodeId)
    if (!existing) {
      console.warn(`[yjs-flow] Node ${nodeId} not found for update`)
      return
    }
    this.nodesMap.set(nodeId, {
      ...existing,
      ...updates,
      updatedAt: Date.now(),
    })
  }

  /** Update only the data bag on a node (merges into existing data) */
  updateNodeData(nodeId: string, dataUpdates: Record<string, unknown>): void {
    const existing = this.nodesMap.get(nodeId)
    if (!existing) return
    this.nodesMap.set(nodeId, {
      ...existing,
      data: { ...existing.data, ...dataUpdates },
      updatedAt: Date.now(),
    })
  }

  /**
   * Merge a patch into the Yjs-only `ephemeral` bag.
   * Use this for any field that doesn't have a DB column to mirror against —
   * agent activity, control signals, anything ephemeral. Survives row refetches.
   */
  updateEphemeral(nodeId: string, patch: Record<string, unknown>): void {
    const existing = this.nodesMap.get(nodeId)
    if (!existing) return
    this.nodesMap.set(nodeId, {
      ...existing,
      ephemeral: { ...(existing.ephemeral || {}), ...patch },
      updatedAt: Date.now(),
    })
  }

  /** Delete a node from the canvas */
  deleteNode(nodeId: string): void {
    this.nodesMap.delete(nodeId)
  }

  /** Get a node by ID */
  getNode(nodeId: string): YjsFlowNode | undefined {
    return this.nodesMap.get(nodeId)
  }

  /** Get all nodes as an array */
  getAllNodes(): YjsFlowNode[] {
    return Array.from(this.nodesMap.values())
  }

  // ── Agent Output (written to node data fields) ──

  /** Append an entry to a node's agent log (stored under node.ephemeral.agentLog) */
  appendAgentLog(nodeId: string, entry: Omit<AgentLogEntry, 'ts'>): void {
    const existing = this.nodesMap.get(nodeId)
    if (!existing) return

    const eph = existing.ephemeral || {}
    const log = Array.isArray(eph.agentLog)
      ? eph.agentLog as AgentLogEntry[]
      : []

    // Keep log bounded — trim old entries if over 200
    const trimmed = log.length >= 200 ? log.slice(-150) : log
    trimmed.push({ ...entry, ts: Date.now() })

    this.nodesMap.set(nodeId, {
      ...existing,
      ephemeral: {
        ...eph,
        agentLog: trimmed,
      },
      updatedAt: Date.now(),
    })
  }

  /** Set the agent status on a node (stored under node.ephemeral.agentStatus) */
  setAgentStatus(nodeId: string, status: string): void {
    this.updateEphemeral(nodeId, { agentStatus: status })
  }

  /** Clear agent log and status (e.g., on session end) */
  clearAgentState(nodeId: string): void {
    this.updateEphemeral(nodeId, { agentStatus: null })
    // Keep agentLog for history
  }

  // ── Presence ──────────────────────────────────────────────

  /** Send awareness update — shows Pi agent on the canvas */
  sendAwareness(agentStatus: PiAgentAwareness['agentStatus'], selectedNodeId: string | null): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    this.ws.send(JSON.stringify({
      type: 'awareness',
      userId: 'pi-agent',
      state: {
        user: {
          id: 'pi-agent',
          name: 'Pi Agent',
          color: '#10b981', // Emerald green
        },
        cursor: null,
        selectedNodeId,
        agentStatus,
      } satisfies PiAgentAwareness,
    }))
  }

  // ── HTTP Fallback (for operations that need server-side logic) ──

  /**
   * HTTP API call to ThinkGraph — used for operations that must trigger
   * server-side logic (stage progression, webhook callbacks, artifact storage).
   */
  async httpPatch(nodeId: string, updates: Record<string, unknown>): Promise<void> {
    const teamId = this.config.teamId
    const baseUrl = `${this.config.thinkgraphUrl}/api/teams/${teamId}/thinkgraph-nodes`
    await ofetch(`${baseUrl}/${nodeId}`, {
      method: 'PATCH',
      headers: {
        'Cookie': this.config.serviceToken,
        'Content-Type': 'application/json',
      },
      body: updates,
    })
  }

  async httpPost(body: Record<string, unknown>): Promise<Record<string, unknown>> {
    const teamId = this.config.teamId
    const baseUrl = `${this.config.thinkgraphUrl}/api/teams/${teamId}/thinkgraph-nodes`
    return await ofetch(baseUrl, {
      method: 'POST',
      headers: {
        'Cookie': this.config.serviceToken,
        'Content-Type': 'application/json',
      },
      body,
    })
  }

  async httpGet(query?: Record<string, string>): Promise<unknown[]> {
    const teamId = this.config.teamId
    const baseUrl = `${this.config.thinkgraphUrl}/api/teams/${teamId}/thinkgraph-nodes`
    const result = await ofetch(baseUrl, {
      headers: { 'Cookie': this.config.serviceToken },
      query,
    })
    return Array.isArray(result) ? result : (result as any).data || []
  }

  // ── Private ──────────────────────────────────────────────

  private buildWsUrl(): string {
    const { collabWorkerUrl, thinkgraphUrl, teamId } = this.config
    const flowId = this.flowId
    const roomType = 'flow'

    const params = new URLSearchParams({
      type: roomType,
      roomId: flowId,
      teamId,
    })

    if (collabWorkerUrl) {
      // Production: connect directly to the collab worker
      // Worker expects: /{roomKey}/{action}?{params}
      const roomKey = encodeURIComponent(`${roomType}:${flowId}`)
      const wsUrl = collabWorkerUrl.replace(/^https?:/, 'wss:')

      // Generate HMAC token (same algorithm as /api/collab/token)
      const token = this.generateCollabToken()
      if (token) {
        params.set('token', token)
      }

      return `${wsUrl}/${roomKey}/ws?${params.toString()}`
    }

    // Dev: connect to same-origin Nitro crossws handler
    const wsUrl = thinkgraphUrl.replace(/^http/, 'ws')
    return `${wsUrl}/api/collab/${flowId}/ws?${params.toString()}`
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {}
    // For dev mode (same-origin), pass the session cookie
    if (!this.config.collabWorkerUrl && this.config.serviceToken) {
      headers['Cookie'] = this.config.serviceToken
    }
    return headers
  }

  /**
   * Generate an HMAC-signed collab token — mirrors /api/collab/token.get.ts
   * Token format: base64(JSON payload).base64(HMAC signature)
   */
  private generateCollabToken(): string | null {
    const secret = this.config.betterAuthSecret
    if (!secret) return null

    const payload = JSON.stringify({
      userId: 'pi-agent',
      exp: Date.now() + 60_000, // 60 seconds
    })

    const payloadB64 = Buffer.from(payload).toString('base64')
    const signature = createHmac('sha256', secret)
      .update(payload)
      .digest('base64')

    return `${payloadB64}.${signature}`
  }

  private handleJsonMessage(text: string): void {
    try {
      const msg = JSON.parse(text)
      if (msg.type === 'pong') return
      // Awareness broadcasts from other users — we could track them but
      // the Pi worker doesn't need to react to browser presence
    } catch {
      // Ignore non-JSON
    }
  }

  private clearPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer)
      this.pingTimer = null
    }
  }
}
