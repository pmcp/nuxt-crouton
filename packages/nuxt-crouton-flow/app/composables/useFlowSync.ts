import * as Y from 'yjs'
import { ref, computed, readonly, watch } from 'vue'
import type { YjsFlowNode, YjsGhostNode } from '../types/yjs'
// Type is re-exported from our local types file
import type { CollabAwarenessState } from '../types/yjs'

interface UseFlowSyncOptions {
  flowId: string
  collection: string
}

/**
 * Composable for real-time flow synchronization via Yjs
 *
 * Uses crouton-collab infrastructure for WebSocket connections and Yjs sync.
 * Provides flow-specific operations on top of the generic collab sync.
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

  // Use collab sync for connection and Yjs
  // useCollabSync is auto-imported from crouton-collab
  const collab = useCollabSync({
    roomId: flowId,
    roomType: 'flow',
    structure: 'map',
    structureName: 'nodes'
  })

  // Type the Y.Map to our flow node type
  const nodesMap = collab.ymap as Y.Map<YjsFlowNode>

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
      color: generateUserColor(userId)
    }
  })

  // Reactive nodes array (derived from Y.Map via collab.data)
  const nodes = computed<YjsFlowNode[]>(() => {
    return Object.values(collab.data.value) as YjsFlowNode[]
  })

  // Send awareness update helper
  const sendAwareness = (state: Partial<CollabAwarenessState>) => {
    if (!user.value) return
    collab.connection.sendAwareness({
      user: user.value,
      cursor: null,
      selectedNodeId: null,
      ...state
    })
  }

  // Send initial awareness when connected
  watch(
    () => collab.connected.value,
    (connected) => {
      if (connected && user.value) {
        sendAwareness({
          user: user.value,
          cursor: null,
          selectedNodeId: null
        })
      }
    },
    { immediate: true }
  )

  // Node operations
  const createNode = (data: Partial<YjsFlowNode>): string => {
    if (!nodesMap) {
      console.warn('[useFlowSync] Not connected, cannot create node')
      return ''
    }

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
    if (!nodesMap) return

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

  const updatePosition = (id: string, position: { x: number, y: number }): void => {
    updateNode(id, {
      position: {
        x: Math.round(position.x),
        y: Math.round(position.y)
      }
    })
  }

  const deleteNode = (id: string): void => {
    if (!nodesMap) return
    nodesMap.delete(id)
  }

  const getNode = (id: string): YjsFlowNode | undefined => {
    if (!nodesMap) return undefined
    return nodesMap.get(id)
  }

  // Cursor tracking for presence
  const updateCursor = (cursor: { x: number, y: number } | null) => {
    sendAwareness({ cursor, selectedNodeId: null })
  }

  const selectNode = (nodeId: string | null) => {
    sendAwareness({ cursor: null, selectedNodeId: nodeId })
  }

  // Ghost node for drag-and-drop preview
  // Flow-specific ghost node includes title and collection beyond the base collab ghost node
  const updateGhostNode = (ghostNode: YjsGhostNode | null) => {
    // Store title and collection as top-level properties in awareness state
    // since they don't fit in the base ghostNode type
    sendAwareness({
      cursor: null,
      selectedNodeId: null,
      ghostNode: ghostNode ? {
        id: ghostNode.id,
        position: ghostNode.position
      } : null,
      // Flow-specific properties (extensible via index signature)
      ghostNodeTitle: ghostNode?.title ?? null,
      ghostNodeCollection: ghostNode?.collection ?? null
    })
  }

  const clearGhostNode = () => {
    updateGhostNode(null)
  }

  return {
    // State (from collab)
    nodes: readonly(nodes),
    connected: collab.connected,
    synced: collab.synced,
    error: collab.error,
    users: collab.users,
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

    // Advanced - expose raw Yjs for power users
    ydoc: collab.ydoc,
    nodesMap,

    // Connection actions
    connect: collab.connect,
    disconnect: collab.disconnect
  }
}

// Helper to generate consistent color from user ID
function generateUserColor(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 70%, 50%)`
}
