/// <reference types="@cloudflare/workers-types" />

import * as Y from 'yjs'

interface Env {
  DB: D1Database
}

interface Session {
  ws: WebSocket
  userId?: string
  awarenessState?: Record<string, unknown>
}

/**
 * @deprecated Use CollabRoom from @friendlyinternet/nuxt-crouton-collab instead.
 *
 * This Durable Object is kept for backward compatibility with existing deployments.
 * New flows should use CollabRoom via useFlowSync which now wraps useCollabSync.
 *
 * Migration path:
 * 1. useFlowSync now uses `/api/collab/[roomId]/ws?type=flow` (from crouton-collab)
 * 2. CollabRoom stores state in `yjs_collab_states` table with room_type='flow'
 * 3. Existing flows using this FlowRoom will continue to work until migration
 *
 * ---
 *
 * Durable Object that manages a single flow's Yjs document
 *
 * Responsibilities:
 * - Maintain Y.Doc state in memory
 * - Handle WebSocket connections from clients
 * - Merge updates from all clients
 * - Persist state to D1 (both blob and individual rows)
 * - Broadcast updates to all connected clients
 */
export class FlowRoom implements DurableObject {
  private ydoc: Y.Doc
  private sessions: Map<WebSocket, Session> = new Map()
  private storage: DurableObjectStorage
  private env: Env
  private flowId: string = ''
  private collectionName: string = ''
  private persistTimeout: ReturnType<typeof setTimeout> | null = null

  constructor(state: DurableObjectState, env: Env) {
    this.storage = state.storage
    this.env = env
    this.ydoc = new Y.Doc()

    // Load persisted state on startup
    state.blockConcurrencyWhile(async () => {
      await this.loadState()
    })

    // Set up update handler
    this.ydoc.on('update', (update: Uint8Array, origin: unknown) => {
      // Don't persist updates that came from loading storage
      if (origin === 'storage') return

      // Broadcast to all clients except origin
      this.broadcast(update, origin as WebSocket | undefined)

      // Debounced persistence
      this.schedulePersist()
    })
  }

  private async loadState(): Promise<void> {
    const stored = await this.storage.get<Uint8Array>('yjs-state')
    if (stored) {
      Y.applyUpdate(this.ydoc, stored, 'storage')
    }

    // Also load metadata
    const meta = await this.storage.get<{ flowId: string, collectionName: string }>('meta')
    if (meta) {
      this.flowId = meta.flowId
      this.collectionName = meta.collectionName
    }
  }

  private schedulePersist(): void {
    if (this.persistTimeout) {
      clearTimeout(this.persistTimeout)
    }

    // Debounce persistence by 1 second
    this.persistTimeout = setTimeout(() => {
      this.persist()
    }, 1000)
  }

  private async persist(): Promise<void> {
    const state = Y.encodeStateAsUpdate(this.ydoc)

    // 1. Save to Durable Object storage (fast, local)
    await this.storage.put('yjs-state', state)

    // 2. Save to D1 (durable, queryable)
    await this.persistToD1(state)
  }

  private async persistToD1(state: Uint8Array): Promise<void> {
    if (!this.flowId || !this.collectionName) return

    try {
      // Save Yjs blob state
      await this.env.DB.prepare(`
        INSERT INTO yjs_flow_states (flow_id, collection_name, state, updated_at)
        VALUES (?, ?, ?, unixepoch())
        ON CONFLICT(flow_id) DO UPDATE SET
          state = excluded.state,
          version = yjs_flow_states.version + 1,
          updated_at = excluded.updated_at
      `).bind(this.flowId, this.collectionName, state).run()

      // Sync individual nodes to collection table
      await this.syncNodesToCollection()
    } catch (error) {
      console.error('[FlowRoom] D1 persistence error:', error)
    }
  }

  private async syncNodesToCollection(): Promise<void> {
    const nodes = this.ydoc.getMap<Record<string, unknown>>('nodes')

    // Get all node IDs from Yjs
    const _yjsNodeIds = new Set(nodes.keys())

    // Batch upsert all nodes
    const batch: D1PreparedStatement[] = []

    for (const [id, node] of nodes.entries()) {
      // Build upsert for this node
      // Note: Actual SQL depends on collection schema
      batch.push(
        this.env.DB.prepare(`
          INSERT INTO ${this.collectionName} (id, title, position, parent_id, data, updated_at)
          VALUES (?, ?, ?, ?, ?, unixepoch())
          ON CONFLICT(id) DO UPDATE SET
            title = excluded.title,
            position = excluded.position,
            parent_id = excluded.parent_id,
            data = excluded.data,
            updated_at = excluded.updated_at
        `).bind(
          id,
          node.title || '',
          JSON.stringify(node.position || { x: 0, y: 0 }),
          node.parentId || null,
          JSON.stringify(node.data || {})
        )
      )
    }

    // Execute batch
    if (batch.length > 0) {
      await this.env.DB.batch(batch)
    }

    // TODO: Handle deletions - nodes in DB but not in Yjs
    // This requires querying existing IDs and comparing
  }

  private broadcast(update: Uint8Array, origin?: WebSocket): void {
    for (const [ws, _session] of this.sessions) {
      if (ws !== origin && ws.readyState === WebSocket.OPEN) {
        ws.send(update)
      }
    }
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    // Extract flow metadata from query params (set on first connect)
    const flowId = url.searchParams.get('flowId')
    const collectionName = url.searchParams.get('collection')

    if (flowId && collectionName && !this.flowId) {
      this.flowId = flowId
      this.collectionName = collectionName
      await this.storage.put('meta', { flowId, collectionName })
    }

    if (url.pathname === '/ws') {
      // WebSocket upgrade
      const pair = new WebSocketPair()
      const [client, server] = Object.values(pair)

      await this.handleSession(server)

      return new Response(null, {
        status: 101,
        webSocket: client
      })
    }

    if (url.pathname === '/state') {
      // HTTP endpoint to get current state (for SSR/initial load)
      const state = Y.encodeStateAsUpdate(this.ydoc)
      return new Response(state.buffer as ArrayBuffer, {
        headers: { 'Content-Type': 'application/octet-stream' }
      })
    }

    return new Response('Not found', { status: 404 })
  }

  private async handleSession(ws: WebSocket): Promise<void> {
    ws.accept()

    const session: Session = { ws }
    this.sessions.set(ws, session)

    // Send current state to new client
    const state = Y.encodeStateAsUpdate(this.ydoc)
    ws.send(state)

    ws.addEventListener('message', async (event) => {
      try {
        const data = event.data

        if (data instanceof ArrayBuffer) {
          // Yjs update
          const update = new Uint8Array(data)
          Y.applyUpdate(this.ydoc, update, ws)
        } else if (typeof data === 'string') {
          // JSON message (awareness, etc.)
          const message = JSON.parse(data)
          await this.handleMessage(ws, session, message)
        }
      } catch (error) {
        console.error('[FlowRoom] Message handling error:', error)
      }
    })

    ws.addEventListener('close', () => {
      this.sessions.delete(ws)

      // Broadcast user left
      if (session.userId) {
        this.broadcastAwareness()
      }
    })

    ws.addEventListener('error', (error) => {
      console.error('[FlowRoom] WebSocket error:', error)
      this.sessions.delete(ws)
    })
  }

  private async handleMessage(
    ws: WebSocket,
    session: Session,
    message: Record<string, unknown>
  ): Promise<void> {
    switch (message.type) {
      case 'awareness':
        session.userId = message.userId as string
        session.awarenessState = message.state as Record<string, unknown>
        this.broadcastAwareness()
        break

      case 'ping':
        ws.send(JSON.stringify({ type: 'pong' }))
        break
    }
  }

  private broadcastAwareness(): void {
    const users = Array.from(this.sessions.values())
      .filter(s => s.awarenessState)
      .map(s => s.awarenessState)

    const message = JSON.stringify({ type: 'awareness', users })

    for (const [ws] of this.sessions) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message)
      }
    }
  }
}
