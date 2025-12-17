# Yjs Integration Plan for nuxt-crouton-flow

## Overview

Integrate Yjs (CRDT-based real-time collaboration) into `nuxt-crouton-flow` to enable multiplayer flow diagram editing. This uses Cloudflare infrastructure (Durable Objects + D1).

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Clients                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │ Client A │  │ Client B │  │ Client C │                  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘                  │
│       │             │             │                         │
│       └─────────────┼─────────────┘                         │
│                     │ WebSocket                             │
│                     ▼                                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           Cloudflare Durable Object                 │   │
│  │                 (FlowRoom)                          │   │
│  │                                                     │   │
│  │  - Manages Yjs Y.Doc per flow                       │   │
│  │  - Handles WebSocket connections                    │   │
│  │  - Merges updates from all clients                  │   │
│  │  - Persists to D1 on changes                        │   │
│  │  - Syncs Yjs state → individual row records         │   │
│  └──────────────────────┬──────────────────────────────┘   │
│                         │                                   │
│                         ▼                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                 D1 (SQLite)                         │   │
│  │                                                     │   │
│  │  yjs_flow_states    │  collection tables            │   │
│  │  ┌───────────────┐  │  ┌─────────────────────────┐  │   │
│  │  │ flow_id (PK)  │  │  │ decisions / nodes / etc │  │   │
│  │  │ state (BLOB)  │  │  │ - id                    │  │   │
│  │  │ updated_at    │  │  │ - title                 │  │   │
│  │  └───────────────┘  │  │ - position (JSON)       │  │   │
│  │                     │  │ - parent_id             │  │   │
│  │  Fast Yjs reload    │  │ - ...                   │  │   │
│  │                     │  │                         │  │   │
│  │                     │  │ Queryable individual    │  │   │
│  │                     │  │ records                 │  │   │
│  │                     │  └─────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Key Decisions

1. **Yjs owns flow state** - All node CRUD and position updates go through Yjs
2. **Dual persistence** - Both Yjs blob (fast reload) AND individual rows (queryable)
3. **Durable Objects for sync** - One DO instance per flow, handles all WebSocket connections
4. **Crouton remains for non-flow data** - Only flow diagrams use Yjs; other CRUD stays as-is

---

## Phase 1: Foundation

### Task 1.1: Add Yjs Dependencies

**File:** `packages/nuxt-crouton-flow/package.json`

Add dependencies:
```json
{
  "dependencies": {
    "yjs": "^13.6.0"
  }
}
```

Note: We'll use native WebSocket, not y-websocket, since Durable Objects handle the sync protocol directly.

Run: `pnpm install`

---

### Task 1.2: Create Yjs Flow State Types

**File:** `packages/nuxt-crouton-flow/app/types/yjs.ts`

```typescript
import type { Map as YMap } from 'yjs'

/**
 * Node data stored in Yjs Y.Map
 */
export interface YjsFlowNode {
  id: string
  title: string
  position: { x: number; y: number }
  parentId: string | null
  data: Record<string, unknown>  // Additional collection fields
  createdAt: number
  updatedAt: number
}

/**
 * Awareness state for presence
 */
export interface YjsAwarenessState {
  user: {
    id: string
    name: string
    color: string
  }
  cursor: { x: number; y: number } | null
  selectedNodeId: string | null
}

/**
 * Flow sync connection state
 */
export interface FlowSyncState {
  connected: boolean
  synced: boolean
  error: Error | null
  users: YjsAwarenessState[]
}
```

---

### Task 1.3: Create D1 Schema for Yjs States

**File:** `packages/nuxt-crouton-flow/server/database/migrations/0001_yjs_flow_states.sql`

```sql
-- Store Yjs document states (for fast reload)
CREATE TABLE IF NOT EXISTS yjs_flow_states (
  flow_id TEXT PRIMARY KEY,
  collection_name TEXT NOT NULL,
  state BLOB NOT NULL,
  version INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_yjs_flow_states_updated
  ON yjs_flow_states(updated_at);
```

Note: Individual node records use existing collection tables (e.g., `decisions`). The Durable Object will update those tables when Yjs state changes.

---

## Phase 2: Durable Object Implementation

### Task 2.1: Create FlowRoom Durable Object

**File:** `packages/nuxt-crouton-flow/server/durable-objects/FlowRoom.ts`

```typescript
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
    const meta = await this.storage.get<{ flowId: string; collectionName: string }>('meta')
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
    const yjsNodeIds = new Set(nodes.keys())

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
    for (const [ws, session] of this.sessions) {
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
      return new Response(state, {
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
```

---

### Task 2.2: Configure Durable Object in Nuxt

**File:** `packages/nuxt-crouton-flow/nuxt.config.ts`

Add Durable Object configuration:

```typescript
export default defineNuxtConfig({
  // ... existing config

  nitro: {
    experimental: {
      websocket: true
    }
  },

  // Note: Actual DO binding happens at deployment via wrangler.toml
  // This is documented for the deployment step
})
```

**File:** `packages/nuxt-crouton-flow/wrangler.toml` (create if not exists)

```toml
name = "nuxt-crouton-flow"
compatibility_date = "2024-01-01"

[[durable_objects.bindings]]
name = "FLOW_ROOMS"
class_name = "FlowRoom"

[[migrations]]
tag = "v1"
new_classes = ["FlowRoom"]
```

---

### Task 2.3: Create WebSocket API Route

**File:** `packages/nuxt-crouton-flow/server/api/flow/[flowId]/ws.get.ts`

```typescript
/**
 * WebSocket endpoint that proxies to Durable Object
 *
 * Route: GET /api/flow/:flowId/ws?collection=decisions
 */
export default defineEventHandler(async (event) => {
  const flowId = getRouterParam(event, 'flowId')
  const collection = getQuery(event).collection as string

  if (!flowId || !collection) {
    throw createError({
      statusCode: 400,
      message: 'flowId and collection are required'
    })
  }

  // Get Cloudflare env from context
  const env = event.context.cloudflare?.env

  if (!env?.FLOW_ROOMS) {
    throw createError({
      statusCode: 500,
      message: 'Durable Objects not configured'
    })
  }

  // Get or create Durable Object for this flow
  const id = env.FLOW_ROOMS.idFromName(flowId)
  const stub = env.FLOW_ROOMS.get(id)

  // Forward request to Durable Object
  const url = new URL(event.node.req.url!, 'https://placeholder')
  url.pathname = '/ws'
  url.searchParams.set('flowId', flowId)
  url.searchParams.set('collection', collection)

  return stub.fetch(url.toString(), {
    headers: event.node.req.headers as HeadersInit,
  })
})
```

---

## Phase 3: Client Composables

### Task 3.1: Create useFlowSync Composable

**File:** `packages/nuxt-crouton-flow/app/composables/useFlowSync.ts`

```typescript
import * as Y from 'yjs'
import type { YjsFlowNode, YjsAwarenessState, FlowSyncState } from '../types/yjs'

interface UseFlowSyncOptions {
  flowId: string
  collection: string
}

/**
 * Composable for real-time flow synchronization via Yjs
 *
 * Handles:
 * - WebSocket connection to Durable Object
 * - Yjs document state management
 * - Node CRUD operations
 * - Presence/awareness
 * - Reconnection logic
 *
 * @example
 * ```ts
 * const {
 *   nodes,
 *   connected,
 *   createNode,
 *   updatePosition,
 *   users
 * } = useFlowSync({
 *   flowId: 'flow-123',
 *   collection: 'decisions'
 * })
 * ```
 */
export function useFlowSync(options: UseFlowSyncOptions) {
  const { flowId, collection } = options

  // Auto-detect user from session
  const { user: sessionUser } = useUserSession()
  const user = computed(() => {
    if (!sessionUser.value) return null
    return {
      id: sessionUser.value.id,
      name: sessionUser.value.name || sessionUser.value.email || 'Anonymous',
      color: generateUserColor(sessionUser.value.id)
    }
  })

  // Yjs document
  const ydoc = new Y.Doc()
  const nodesMap = ydoc.getMap<YjsFlowNode>('nodes')

  // Reactive state
  const state = reactive<FlowSyncState>({
    connected: false,
    synced: false,
    error: null,
    users: []
  })

  // Reactive nodes array (derived from Y.Map)
  const nodes = ref<YjsFlowNode[]>([])

  // WebSocket connection
  let ws: WebSocket | null = null
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null
  let reconnectAttempts = 0
  const MAX_RECONNECT_ATTEMPTS = 10
  const RECONNECT_DELAY = 1000

  // Observe Yjs changes
  nodesMap.observe(() => {
    nodes.value = Array.from(nodesMap.values())
  })

  // Connect to Durable Object
  const connect = () => {
    if (import.meta.server) return // Skip on SSR

    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const url = `${protocol}//${location.host}/api/flow/${flowId}/ws?collection=${collection}`

    ws = new WebSocket(url)
    ws.binaryType = 'arraybuffer'

    ws.onopen = () => {
      state.connected = true
      state.error = null
      reconnectAttempts = 0

      // Send awareness (user auto-detected from session)
      if (user.value) {
        sendAwareness({
          user: user.value,
          cursor: null,
          selectedNodeId: null
        })
      }
    }

    ws.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        // Yjs update
        const update = new Uint8Array(event.data)
        Y.applyUpdate(ydoc, update, 'remote')
        state.synced = true
      } else if (typeof event.data === 'string') {
        // JSON message
        try {
          const message = JSON.parse(event.data)
          handleMessage(message)
        } catch (e) {
          console.error('[useFlowSync] Invalid message:', e)
        }
      }
    }

    ws.onclose = () => {
      state.connected = false
      scheduleReconnect()
    }

    ws.onerror = (error) => {
      console.error('[useFlowSync] WebSocket error:', error)
      state.error = new Error('WebSocket connection failed')
    }

    // Send local Yjs updates to server
    ydoc.on('update', (update: Uint8Array, origin: unknown) => {
      if (origin !== 'remote' && ws?.readyState === WebSocket.OPEN) {
        ws.send(update)
      }
    })
  }

  const scheduleReconnect = () => {
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      state.error = new Error('Max reconnection attempts reached')
      return
    }

    reconnectTimeout = setTimeout(() => {
      reconnectAttempts++
      connect()
    }, RECONNECT_DELAY * Math.pow(2, reconnectAttempts))
  }

  const handleMessage = (message: Record<string, unknown>) => {
    switch (message.type) {
      case 'awareness':
        state.users = message.users as YjsAwarenessState[]
        break
      case 'pong':
        // Heartbeat response
        break
    }
  }

  const sendAwareness = (awarenessState: YjsAwarenessState) => {
    if (ws?.readyState === WebSocket.OPEN && user.value) {
      ws.send(JSON.stringify({
        type: 'awareness',
        userId: user.value.id,
        state: awarenessState
      }))
    }
  }

  // Node operations
  const createNode = (data: Partial<YjsFlowNode>): string => {
    const id = data.id || crypto.randomUUID()
    const now = Date.now()

    const node: YjsFlowNode = {
      id,
      title: data.title || 'New Node',
      position: data.position || { x: 0, y: 0 },
      parentId: data.parentId || null,
      data: data.data || {},
      createdAt: now,
      updatedAt: now
    }

    nodesMap.set(id, node)
    return id
  }

  const updateNode = (id: string, updates: Partial<YjsFlowNode>): void => {
    const existing = nodesMap.get(id)
    if (!existing) {
      console.warn(`[useFlowSync] Node ${id} not found`)
      return
    }

    nodesMap.set(id, {
      ...existing,
      ...updates,
      updatedAt: Date.now()
    })
  }

  const updatePosition = (id: string, position: { x: number; y: number }): void => {
    updateNode(id, {
      position: {
        x: Math.round(position.x),
        y: Math.round(position.y)
      }
    })
  }

  const deleteNode = (id: string): void => {
    nodesMap.delete(id)
  }

  const getNode = (id: string): YjsFlowNode | undefined => {
    return nodesMap.get(id)
  }

  // Cursor tracking for presence
  const updateCursor = (cursor: { x: number; y: number } | null) => {
    if (user.value) {
      sendAwareness({
        user: user.value,
        cursor,
        selectedNodeId: null
      })
    }
  }

  const selectNode = (nodeId: string | null) => {
    if (user.value) {
      sendAwareness({
        user: user.value,
        cursor: null,
        selectedNodeId: nodeId
      })
    }
  }

  // Lifecycle
  onMounted(() => {
    connect()
  })

  onUnmounted(() => {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout)
    }
    ws?.close()
    ydoc.destroy()
  })

  return {
    // State
    nodes: readonly(nodes),
    connected: computed(() => state.connected),
    synced: computed(() => state.synced),
    error: computed(() => state.error),
    users: computed(() => state.users),

    // Node operations
    createNode,
    updateNode,
    updatePosition,
    deleteNode,
    getNode,

    // Presence
    updateCursor,
    selectNode,

    // Advanced
    ydoc,
    nodesMap
  }
}

// Helper to generate consistent color from user ID
function generateUserColor(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = hash % 360
  return `hsl(${hue}, 70%, 50%)`
}
```

---

### Task 3.2: Create useFlowPresence Composable

**File:** `packages/nuxt-crouton-flow/app/composables/useFlowPresence.ts`

```typescript
import type { YjsAwarenessState } from '../types/yjs'

interface UseFlowPresenceOptions {
  users: Ref<YjsAwarenessState[]>
  currentUserId?: string
}

/**
 * Composable for flow presence UI helpers
 *
 * Provides utilities for rendering user presence indicators
 */
export function useFlowPresence(options: UseFlowPresenceOptions) {
  const { users, currentUserId } = options

  // Other users (not current user)
  const otherUsers = computed(() =>
    users.value.filter(u => u.user.id !== currentUserId)
  )

  // Users currently selecting a specific node
  const getUsersSelectingNode = (nodeId: string) => {
    return computed(() =>
      otherUsers.value.filter(u => u.selectedNodeId === nodeId)
    )
  }

  // Get node border style for presence indicators
  const getNodePresenceStyle = (nodeId: string) => {
    return computed(() => {
      const selecting = otherUsers.value.filter(u => u.selectedNodeId === nodeId)
      if (selecting.length === 0) return {}

      // Use first user's color for border
      const color = selecting[0].user.color
      return {
        boxShadow: `0 0 0 2px ${color}`,
        borderColor: color
      }
    })
  }

  return {
    otherUsers,
    getUsersSelectingNode,
    getNodePresenceStyle
  }
}
```

---

## Phase 4: Flow.vue Integration

### Task 4.1: Update Flow.vue to Support Yjs Mode

**File:** `packages/nuxt-crouton-flow/app/components/Flow.vue`

Update the component to support both modes:
1. **Legacy mode** (current): Props-based with crouton mutation
2. **Sync mode** (new): Yjs-based real-time sync

Add new props:
```typescript
interface Props {
  // ... existing props

  /** Enable real-time sync mode */
  sync?: boolean
  /** Flow ID for sync mode (required if sync=true) */
  flowId?: string
  // Note: user is auto-detected from useUserSession(), no prop needed
}
```

Usage example:
```vue
<!-- Without sync (existing behavior) -->
<CroutonFlow
  :rows="decisions"
  collection="decisions"
/>

<!-- With sync (multiplayer mode) -->
<CroutonFlow
  collection="decisions"
  sync
  :flow-id="projectId"
/>
```

When `sync` is true:
- Use `useFlowSync` instead of props-based nodes
- Replace `useDebouncedPositionUpdate` with Yjs `updatePosition`
- Render presence indicators from other users
- Show connection status indicator

Key changes:
1. Conditionally use `useFlowSync` or existing `useFlowData`
2. Update `onNodeDragStop` to use Yjs when in sync mode
3. Add presence avatars/cursors layer
4. Add connection status indicator

---

### Task 4.2: Create Presence Overlay Component

**File:** `packages/nuxt-crouton-flow/app/components/FlowPresence.vue`

```vue
<script setup lang="ts">
import type { YjsAwarenessState } from '../types/yjs'

const props = defineProps<{
  users: YjsAwarenessState[]
  currentUserId?: string
}>()

const otherUsers = computed(() =>
  props.users.filter(u => u.user.id !== props.currentUserId)
)
</script>

<template>
  <div class="flow-presence">
    <!-- User avatars in corner -->
    <div class="flow-presence-avatars">
      <div
        v-for="user in otherUsers"
        :key="user.user.id"
        class="flow-presence-avatar"
        :style="{ backgroundColor: user.user.color }"
        :title="user.user.name"
      >
        {{ user.user.name.charAt(0).toUpperCase() }}
      </div>
    </div>

    <!-- Cursors on canvas (if cursor tracking enabled) -->
    <template v-for="user in otherUsers" :key="`cursor-${user.user.id}`">
      <div
        v-if="user.cursor"
        class="flow-presence-cursor"
        :style="{
          left: `${user.cursor.x}px`,
          top: `${user.cursor.y}px`,
          borderColor: user.user.color
        }"
      >
        <span
          class="flow-presence-cursor-label"
          :style="{ backgroundColor: user.user.color }"
        >
          {{ user.user.name }}
        </span>
      </div>
    </template>
  </div>
</template>

<style scoped>
.flow-presence {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 100;
}

.flow-presence-avatars {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  gap: -8px;
}

.flow-presence-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 14px;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.flow-presence-cursor {
  position: absolute;
  width: 20px;
  height: 20px;
  border-left: 2px solid;
  border-top: 2px solid;
  transform: rotate(-45deg);
  transform-origin: top left;
}

.flow-presence-cursor-label {
  position: absolute;
  left: 16px;
  top: -4px;
  transform: rotate(45deg);
  padding: 2px 8px;
  border-radius: 4px;
  color: white;
  font-size: 12px;
  white-space: nowrap;
}
</style>
```

---

### Task 4.3: Create Connection Status Component

**File:** `packages/nuxt-crouton-flow/app/components/FlowConnectionStatus.vue`

```vue
<script setup lang="ts">
const props = defineProps<{
  connected: boolean
  synced: boolean
  error: Error | null
}>()
</script>

<template>
  <div class="flow-connection-status">
    <div
      class="flow-connection-indicator"
      :class="{
        'connected': connected && synced,
        'connecting': connected && !synced,
        'disconnected': !connected
      }"
    />
    <span v-if="error" class="flow-connection-error">
      {{ error.message }}
    </span>
  </div>
</template>

<style scoped>
.flow-connection-status {
  position: absolute;
  bottom: 12px;
  left: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 100;
}

.flow-connection-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  transition: background-color 0.2s;
}

.flow-connection-indicator.connected {
  background-color: #22c55e;
}

.flow-connection-indicator.connecting {
  background-color: #eab308;
  animation: pulse 1s infinite;
}

.flow-connection-indicator.disconnected {
  background-color: #ef4444;
}

.flow-connection-error {
  font-size: 12px;
  color: #ef4444;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
```

---

## Phase 5: Migration & Compatibility

### Task 5.1: Create Migration Utility

**File:** `packages/nuxt-crouton-flow/server/utils/yjs-migration.ts`

```typescript
import * as Y from 'yjs'

/**
 * Migrate existing collection rows to Yjs state
 *
 * Run once per flow to bootstrap Yjs from existing data
 */
export async function migrateFlowToYjs(
  db: D1Database,
  flowId: string,
  collection: string,
  options: {
    positionField?: string
    parentField?: string
    titleField?: string
  } = {}
): Promise<Uint8Array> {
  const {
    positionField = 'position',
    parentField = 'parentId',
    titleField = 'title'
  } = options

  // Fetch existing rows
  const { results } = await db
    .prepare(`SELECT * FROM ${collection} WHERE flow_id = ?`)
    .bind(flowId)
    .all()

  // Create Yjs doc
  const ydoc = new Y.Doc()
  const nodes = ydoc.getMap('nodes')

  // Populate nodes
  for (const row of results) {
    const position = typeof row[positionField] === 'string'
      ? JSON.parse(row[positionField] as string)
      : row[positionField] || { x: 0, y: 0 }

    nodes.set(row.id as string, {
      id: row.id,
      title: row[titleField] || '',
      position,
      parentId: row[parentField] || null,
      data: row,
      createdAt: Date.now(),
      updatedAt: Date.now()
    })
  }

  // Return encoded state
  return Y.encodeStateAsUpdate(ydoc)
}
```

---

### Task 5.2: Create Migration API Endpoint

**File:** `packages/nuxt-crouton-flow/server/api/flow/[flowId]/migrate.post.ts`

```typescript
import { migrateFlowToYjs } from '../../utils/yjs-migration'

/**
 * One-time migration endpoint to bootstrap Yjs from existing data
 *
 * POST /api/flow/:flowId/migrate
 * Body: { collection: string, positionField?: string, ... }
 */
export default defineEventHandler(async (event) => {
  const flowId = getRouterParam(event, 'flowId')
  const body = await readBody(event)

  if (!flowId || !body.collection) {
    throw createError({
      statusCode: 400,
      message: 'flowId and collection are required'
    })
  }

  const db = hubDatabase()

  // Generate Yjs state from existing data
  const state = await migrateFlowToYjs(db, flowId, body.collection, {
    positionField: body.positionField,
    parentField: body.parentField,
    titleField: body.titleField
  })

  // Save to yjs_flow_states table
  await db.prepare(`
    INSERT INTO yjs_flow_states (flow_id, collection_name, state, updated_at)
    VALUES (?, ?, ?, unixepoch())
    ON CONFLICT(flow_id) DO UPDATE SET
      state = excluded.state,
      updated_at = excluded.updated_at
  `).bind(flowId, body.collection, state).run()

  return {
    success: true,
    nodeCount: new Y.Doc().getMap('nodes').size
  }
})
```

---

## Phase 6: Testing

### Task 6.1: Unit Tests for useFlowSync

**File:** `packages/nuxt-crouton-flow/test/composables/useFlowSync.test.ts`

Test cases:
- Node CRUD operations update Yjs doc
- Position updates are reflected in nodes
- Multiple createNode calls produce unique IDs
- deleteNode removes from Y.Map
- State is reactive (Vue reactivity works)

### Task 6.2: Integration Tests

**File:** `packages/nuxt-crouton-flow/test/integration/flow-sync.test.ts`

Test cases:
- Two clients see each other's changes
- Position updates sync in real-time
- Reconnection restores state
- Presence updates broadcast correctly

### Task 6.3: E2E Tests with Playwright

**File:** `packages/nuxt-crouton-flow/test/e2e/multiplayer-flow.spec.ts`

Test scenarios:
- Open flow in two browser windows
- Drag node in window A, see update in window B
- Create node in window A, appears in window B
- Delete node, removed from both
- Presence avatars show correctly

---

## Phase 7: Documentation

### Task 7.1: Update Package README

Document:
- New `sync` mode usage
- Required environment setup (Durable Objects)
- Migration from non-sync mode
- Presence features

### Task 7.2: Add JSDoc to All Public APIs

Ensure all exported functions and types have comprehensive JSDoc.

---

## Implementation Order

1. **Phase 1** (Foundation) - 2 hours
2. **Phase 2** (Durable Object) - 4 hours
3. **Phase 3** (Client Composables) - 3 hours
4. **Phase 4** (Flow.vue Integration) - 3 hours
5. ~~**Phase 5** (Migration)~~ - SKIPPED (greenfield)
6. **Phase 6** (Testing) - 4 hours
7. **Phase 7** (Documentation) - 1 hour

**Total estimated effort: ~17 hours**

---

## Critical Notes for Agent

1. **Run `npx nuxt typecheck` after every file change** - This is mandatory per CLAUDE.md
2. **Test locally with `wrangler dev`** - Durable Objects need wrangler for local testing
3. **Preserve existing non-sync functionality** - The component must work in both modes
4. **Don't break SSR** - Yjs must only initialize on client side
5. **Handle edge cases**:
   - What if WebSocket never connects?
   - What if D1 persistence fails?
   - What if user has stale data on reconnect?

---

## Resolved Design Decisions

1. **Flow ID source**: `flowId` is a **required prop when `sync` is enabled**. The consumer provides it - could be a project ID, record ID, or any unique string. The component doesn't auto-detect it.

2. **Auth integration**: Auto-detect from `useUserSession()`. Users are always logged in when using flows. The composable extracts `{ id, name, email }` automatically for presence.

3. **Scope**: **Opt-in** via `sync` prop. Existing usage unchanged. New sync mode requires explicit `sync` + `flowId` props.

4. **Existing data**: **No migration needed** - greenfield project. Skip Phase 5 (Migration) entirely.
