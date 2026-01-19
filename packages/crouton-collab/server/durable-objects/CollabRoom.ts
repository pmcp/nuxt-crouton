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
 * Generic Durable Object that manages a single collaborative Yjs document
 *
 * Unlike FlowRoom, this is generic and can be used for any room type:
 * - pages: Y.XmlFragment for TipTap editor content
 * - flows: Y.Map for node graphs
 * - documents: Y.Text for plain text
 *
 * Responsibilities:
 * - Maintain Y.Doc state in memory
 * - Handle WebSocket connections from clients
 * - Merge updates from all clients via Yjs CRDTs
 * - Persist state to D1 (blob only - consumer handles domain syncing)
 * - Broadcast updates to all connected clients
 * - Track awareness/presence for all connected users
 *
 * Note: This DO does NOT sync to collection tables. That responsibility
 * belongs to the consumer (e.g., crouton-pages, crouton-flow) who can
 * observe Y.Doc changes and sync to their own tables.
 */
export class CollabRoom implements DurableObject {
  private ydoc: Y.Doc
  private sessions: Map<WebSocket, Session> = new Map()
  private storage: DurableObjectStorage
  private env: Env
  private roomType: string = ''
  private roomId: string = ''
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
    // Load Yjs state from DO storage (fast, local)
    const stored = await this.storage.get<Uint8Array>('yjs-state')
    if (stored) {
      Y.applyUpdate(this.ydoc, stored, 'storage')
    }

    // Load metadata
    const meta = await this.storage.get<{ roomType: string; roomId: string }>('meta')
    if (meta) {
      this.roomType = meta.roomType
      this.roomId = meta.roomId
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
    if (!this.roomType || !this.roomId) return

    try {
      // Save Yjs blob state to generic table
      // Note: We don't sync to collection tables - that's the consumer's job
      await this.env.DB.prepare(`
        INSERT INTO yjs_collab_states (room_type, room_id, state, updated_at)
        VALUES (?, ?, ?, unixepoch())
        ON CONFLICT(room_type, room_id) DO UPDATE SET
          state = excluded.state,
          version = yjs_collab_states.version + 1,
          updated_at = excluded.updated_at
      `).bind(this.roomType, this.roomId, state).run()
    } catch (error) {
      console.error('[CollabRoom] D1 persistence error:', error)
    }
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

    // Extract room metadata from query params (set on first connect)
    const roomType = url.searchParams.get('type') || 'generic'
    const roomId = url.searchParams.get('roomId')

    if (roomType && roomId && !this.roomId) {
      this.roomType = roomType
      this.roomId = roomId
      await this.storage.put('meta', { roomType, roomId })
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

    if (url.pathname === '/users') {
      // HTTP endpoint to get current users (for Phase 6 global presence)
      const users = Array.from(this.sessions.values())
        .filter(s => s.awarenessState)
        .map(s => s.awarenessState)

      return new Response(JSON.stringify({ users, count: users.length }), {
        headers: { 'Content-Type': 'application/json' }
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

    // Also send current awareness state
    this.broadcastAwareness()

    ws.addEventListener('message', async (event) => {
      try {
        const data = event.data

        if (data instanceof ArrayBuffer) {
          // Yjs update (binary)
          const update = new Uint8Array(data)
          Y.applyUpdate(this.ydoc, update, ws)
        } else if (typeof data === 'string') {
          // JSON message (awareness, ping, etc.)
          const message = JSON.parse(data)
          await this.handleMessage(ws, session, message)
        }
      } catch (error) {
        console.error('[CollabRoom] Message handling error:', error)
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
      console.error('[CollabRoom] WebSocket error:', error)
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
