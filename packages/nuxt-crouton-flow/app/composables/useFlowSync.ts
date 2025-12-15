import * as Y from 'yjs'
import { ref, reactive, computed, readonly, onMounted, onUnmounted } from 'vue'
import type { YjsFlowNode, YjsAwarenessState, YjsGhostNode, FlowSyncState } from '../types/yjs'

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
    // User type varies by auth provider - access properties safely
    const userRecord = sessionUser.value as Record<string, unknown>
    const userId = String(userRecord.id || userRecord.sub || 'anonymous')
    const userName = String(userRecord.name || userRecord.email || 'Anonymous')
    return {
      id: userId,
      name: userName,
      color: generateUserColor(userId),
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
    users: [],
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
          selectedNodeId: null,
        })
      }
    }

    ws.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        // Yjs update
        const update = new Uint8Array(event.data)
        Y.applyUpdate(ydoc, update, 'remote')
        state.synced = true
      }
      else if (typeof event.data === 'string') {
        // JSON message
        try {
          const message = JSON.parse(event.data)
          handleMessage(message)
        }
        catch (e) {
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
        state: awarenessState,
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
      updatedAt: now,
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
      updatedAt: Date.now(),
    })
  }

  const updatePosition = (id: string, position: { x: number; y: number }): void => {
    updateNode(id, {
      position: {
        x: Math.round(position.x),
        y: Math.round(position.y),
      },
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
        selectedNodeId: null,
      })
    }
  }

  const selectNode = (nodeId: string | null) => {
    if (user.value) {
      sendAwareness({
        user: user.value,
        cursor: null,
        selectedNodeId: nodeId,
      })
    }
  }

  // Ghost node for drag-and-drop preview
  const updateGhostNode = (ghostNode: YjsGhostNode | null) => {
    if (user.value) {
      sendAwareness({
        user: user.value,
        cursor: null,
        selectedNodeId: null,
        ghostNode,
      })
    }
  }

  const clearGhostNode = () => {
    updateGhostNode(null)
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
    user,

    // Node operations
    createNode,
    updateNode,
    updatePosition,
    deleteNode,
    getNode,

    // Presence
    updateCursor,
    selectNode,

    // Ghost node (drag preview)
    updateGhostNode,
    clearGhostNode,

    // Advanced
    ydoc,
    nodesMap,
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
