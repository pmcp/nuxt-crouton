import * as Y from 'yjs'
import { computed, watch } from 'vue'
import type { XYPosition } from '@vue-flow/core'

interface UseFlowPositionSyncOptions {
  /** Flow config ID (used as room ID) */
  flowId: string
  /** Debounce delay is not needed — Yjs updates are immediate */
}

/**
 * Position-only Yjs sync for ephemeral mode.
 *
 * Connects to a collab room and syncs node positions via a Y.Map,
 * without storing full node data. Node content stays parent-managed
 * (e.g. from Notion or other external sources).
 *
 * This enables real-time multiplayer position sync for flows where
 * the data mode is 'ephemeral' — positions are the only shared state.
 *
 * @example
 * ```ts
 * const { positions, debouncedUpdate, connected, synced, users } =
 *   useFlowPositionSync({ flowId: 'flow-123' })
 * ```
 */
export function useFlowPositionSync(options: UseFlowPositionSyncOptions) {
  const { flowId } = options

  // Use collab sync for connection and Yjs
  // useCollabSync is auto-imported from crouton-collab
  const collab = useCollabSync({
    roomId: `positions:${flowId}`,
    roomType: 'flow-positions',
    structure: 'map',
    structureName: 'positions'
  })

  const positionsMap = collab.ymap as Y.Map<{ x: number; y: number }>

  // Auto-detect user from session (optional — useUserSession may not be available)
  let sessionUser: { value: unknown } = { value: null }
  if (typeof useUserSession === 'function') {
    const session = useUserSession()
    sessionUser = session.user
  }

  const user = computed(() => {
    if (!sessionUser.value) return null
    const userRecord = sessionUser.value as Record<string, unknown>
    const userId = String(userRecord.id || userRecord.sub || 'anonymous')
    const userName = String(userRecord.name || userRecord.email || 'Anonymous')
    return {
      id: userId,
      name: userName,
      color: generateUserColor(userId)
    }
  })

  // Send awareness when connected
  watch(
    () => collab.connected.value,
    (connected) => {
      if (connected && user.value) {
        collab.connection.sendAwareness({
          user: user.value,
          cursor: null,
        })
      }
    },
    { immediate: true }
  )

  // Reactive positions derived from Y.Map
  const positions = computed<Record<string, { x: number; y: number }>>(() => {
    return collab.data.value as Record<string, { x: number; y: number }>
  })

  // Update a single node's position — writes directly to Yjs (instant broadcast)
  const debouncedUpdate = (id: string, position: XYPosition) => {
    if (!positionsMap) return
    positionsMap.set(id, {
      x: Math.round(position.x),
      y: Math.round(position.y)
    })
  }

  return {
    /** Reactive map of all node positions `{ [nodeId]: { x, y } }` */
    positions,
    /** Update a node's position (broadcasts immediately via Yjs) */
    debouncedUpdate,
    /** Whether the WebSocket is connected */
    connected: collab.connected,
    /** Whether initial Yjs sync is complete */
    synced: collab.synced,
    /** Connection error, if any */
    error: collab.error,
    /** Users currently in the room */
    users: collab.users,
    /** Current user info */
    user,
    /** Disconnect from the room */
    disconnect: collab.disconnect,
  }
}
