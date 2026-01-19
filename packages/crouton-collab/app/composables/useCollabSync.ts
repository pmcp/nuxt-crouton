import * as Y from 'yjs'
import { ref, computed, watch, onUnmounted, type Ref, type ComputedRef } from 'vue'
import { useCollabConnection, type UseCollabConnectionReturn } from './useCollabConnection'
import type { CollabStructure, CollabAwarenessState } from '../types/collab'

export interface UseCollabSyncOptions {
  /** Unique room identifier */
  roomId: string
  /** Room type (e.g., 'page', 'flow', 'document') */
  roomType: string
  /** Yjs data structure to use */
  structure: CollabStructure
  /** Name for the structure in Y.Doc (default: roomType) */
  structureName?: string
  /** Auto-connect on mount (default: true) */
  autoConnect?: boolean
}

export interface UseCollabSyncReturn {
  // Connection state (from useCollabConnection)
  connected: ComputedRef<boolean>
  synced: ComputedRef<boolean>
  error: ComputedRef<Error | null>

  // Yjs structures (one will be populated based on structure option)
  ymap: Y.Map<unknown> | null
  yarray: Y.Array<unknown> | null
  yxmlFragment: Y.XmlFragment | null
  ytext: Y.Text | null

  // Reactive data (for Y.Map - updates automatically on changes)
  data: Ref<Record<string, unknown>>

  // Reactive array data (for Y.Array - updates automatically on changes)
  arrayData: Ref<unknown[]>

  // Raw Yjs access
  ydoc: Y.Doc

  // Users in room
  users: Ref<CollabAwarenessState[]>

  // Connection from low-level composable
  connection: UseCollabConnectionReturn

  // Actions
  connect: () => void
  disconnect: () => void
}

/**
 * High-level composable for syncing Yjs data structures
 *
 * Wraps useCollabConnection and provides typed access to Yjs structures.
 *
 * @example
 * ```ts
 * // For a Y.Map (key-value data like flows)
 * const { ymap, data, connected } = useCollabSync({
 *   roomId: 'flow-123',
 *   roomType: 'flow',
 *   structure: 'map'
 * })
 *
 * // For a Y.XmlFragment (rich text like TipTap)
 * const { yxmlFragment, connected } = useCollabSync({
 *   roomId: 'page-123',
 *   roomType: 'page',
 *   structure: 'xmlFragment'
 * })
 * ```
 */
export function useCollabSync(options: UseCollabSyncOptions): UseCollabSyncReturn {
  const {
    roomId,
    roomType,
    structure,
    structureName = roomType,
    autoConnect = true
  } = options

  // Get the low-level connection
  const connection = useCollabConnection({
    roomId,
    roomType,
    autoConnect
  })

  const { ydoc, connected, synced, error, connect, disconnect } = connection

  // Initialize Yjs structures based on structure option
  let ymap: Y.Map<unknown> | null = null
  let yarray: Y.Array<unknown> | null = null
  let yxmlFragment: Y.XmlFragment | null = null
  let ytext: Y.Text | null = null

  switch (structure) {
    case 'map':
      ymap = ydoc.getMap<unknown>(structureName)
      break
    case 'array':
      yarray = ydoc.getArray<unknown>(structureName)
      break
    case 'xmlFragment':
      yxmlFragment = ydoc.getXmlFragment(structureName)
      break
    case 'text':
      ytext = ydoc.getText(structureName)
      break
  }

  // Reactive data for Y.Map
  const data = ref<Record<string, unknown>>({})

  // Reactive array data for Y.Array
  const arrayData = ref<unknown[]>([])

  // Users in room
  const users = ref<CollabAwarenessState[]>([])

  // Observe Y.Map changes and update reactive data
  if (ymap) {
    const updateMapData = () => {
      const result: Record<string, unknown> = {}
      ymap!.forEach((value, key) => {
        result[key] = value
      })
      data.value = result
    }

    ymap.observe(updateMapData)

    // Initial sync
    updateMapData()
  }

  // Observe Y.Array changes and update reactive array data
  if (yarray) {
    const updateArrayData = () => {
      arrayData.value = yarray!.toArray()
    }

    yarray.observe(updateArrayData)

    // Initial sync
    updateArrayData()
  }

  // Listen for awareness updates
  connection.onAwareness((updatedUsers) => {
    users.value = updatedUsers
  })

  return {
    // Connection state
    connected,
    synced,
    error,

    // Yjs structures
    ymap,
    yarray,
    yxmlFragment,
    ytext,

    // Reactive data
    data,
    arrayData,

    // Raw Yjs access
    ydoc,

    // Users
    users,

    // Connection
    connection,

    // Actions
    connect,
    disconnect
  }
}
