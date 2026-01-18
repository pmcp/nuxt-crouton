import { ref, computed, onMounted, watch, type Ref, type ComputedRef } from 'vue'
import type { UseCollabConnectionReturn } from './useCollabConnection'
import { generateUserColor } from './useCollabConnection'
import type { CollabUser, CollabAwarenessState } from '../types/collab'

export interface UseCollabPresenceOptions {
  /** The connection to use for presence updates */
  connection: UseCollabConnectionReturn
  /** User info for presence (auto-detected from useUserSession if not provided) */
  user?: { name: string; color?: string }
}

export interface UseCollabPresenceReturn {
  // Current user
  user: ComputedRef<CollabUser | null>

  // All users in room
  users: Ref<CollabAwarenessState[]>

  // Other users (excluding self)
  otherUsers: ComputedRef<CollabAwarenessState[]>

  // Actions
  updateCursor: (cursor: { x: number; y: number } | null) => void
  updateSelection: (selection: { anchor: number; head: number } | null) => void
  selectNode: (nodeId: string | null) => void
  updateGhostNode: (ghostNode: { id: string; position: { x: number; y: number } } | null) => void

  // Utilities
  getUsersSelectingNode: (nodeId: string) => CollabAwarenessState[]
  getUserColor: (userId: string) => string
  getNodePresenceStyle: (nodeId: string) => { boxShadow?: string; borderColor?: string }
}

/**
 * Composable for managing presence/awareness in a collaboration room
 *
 * Tracks cursor positions, selections, and node selections for all users.
 * Auto-detects user from useUserSession() if not provided.
 *
 * @example
 * ```ts
 * const connection = useCollabConnection({ roomId: 'page-123', roomType: 'page' })
 *
 * const {
 *   user,
 *   users,
 *   otherUsers,
 *   updateCursor,
 *   selectNode,
 *   getUsersSelectingNode
 * } = useCollabPresence({ connection })
 *
 * // Track mouse movement
 * function onMouseMove(event: MouseEvent) {
 *   updateCursor({ x: event.clientX, y: event.clientY })
 * }
 *
 * // Get users selecting a specific node
 * const selectingUsers = getUsersSelectingNode('node-123')
 * ```
 */
export function useCollabPresence(options: UseCollabPresenceOptions): UseCollabPresenceReturn {
  const { connection, user: providedUser } = options

  // Users in room
  const users = ref<CollabAwarenessState[]>([])

  // Current awareness state
  const currentState = ref<Partial<CollabAwarenessState>>({
    cursor: null,
    selection: null,
    selectedNodeId: null,
    ghostNode: null
  })

  // Auto-detect user from session or use provided
  const user = computed<CollabUser | null>(() => {
    console.log('[CollabPresence] user computed - providedUser:', providedUser)

    // Try to get user from session (nuxt-crouton-auth)
    if (!providedUser) {
      try {
        // @ts-expect-error - useSession may not be available if auth module not installed
        const sessionResult = useSession()
        console.log('[CollabPresence] useSession() returned:', sessionResult)
        console.log('[CollabPresence] sessionResult.user:', sessionResult?.user)
        console.log('[CollabPresence] sessionResult.user?.value:', sessionResult?.user?.value)

        const sessionUser = sessionResult?.user
        if (sessionUser?.value) {
          const userRecord = sessionUser.value as Record<string, unknown>
          console.log('[CollabPresence] userRecord keys:', Object.keys(userRecord))
          console.log('[CollabPresence] userRecord.id:', userRecord.id)
          console.log('[CollabPresence] userRecord.name:', userRecord.name)
          console.log('[CollabPresence] userRecord.email:', userRecord.email)
          console.log('[CollabPresence] userRecord.sub:', userRecord.sub)

          const userId = String(userRecord.id || userRecord.sub || 'anonymous')
          const userName = String(userRecord.name || userRecord.email || 'Anonymous')
          console.log('[CollabPresence] Resolved userId:', userId, 'userName:', userName)

          return {
            id: userId,
            name: userName,
            color: generateUserColor(userId)
          }
        } else {
          console.log('[CollabPresence] No sessionUser.value - user not logged in?')
        }
      } catch (err) {
        // useSession not available, continue with fallback
        console.log('[CollabPresence] useSession() threw error:', err)
      }
    }

    // Use provided user info
    if (providedUser) {
      console.log('[CollabPresence] Using providedUser:', providedUser)
      // Generate a random ID if we don't have one from session
      const randomId = typeof window !== 'undefined'
        ? `user-${Math.random().toString(36).slice(2, 9)}`
        : 'anonymous'

      return {
        id: randomId,
        name: providedUser.name,
        color: providedUser.color || generateUserColor(randomId)
      }
    }

    console.log('[CollabPresence] No user found, returning null')
    return null
  })

  // Other users (excluding self)
  const otherUsers = computed(() => {
    const currentUserId = user.value?.id
    if (!currentUserId) return users.value
    return users.value.filter(u => u.user?.id !== currentUserId)
  })

  // Listen for awareness updates
  connection.onAwareness((updatedUsers) => {
    users.value = updatedUsers
  })

  /**
   * Send current awareness state to server
   */
  function sendCurrentState(): void {
    console.log('[CollabPresence] sendCurrentState called, user:', user.value)
    if (!user.value) {
      console.log('[CollabPresence] No user, skipping awareness')
      return
    }

    const awarenessState: CollabAwarenessState = {
      user: user.value,
      cursor: currentState.value.cursor ?? null,
      selection: currentState.value.selection ?? null,
      selectedNodeId: currentState.value.selectedNodeId ?? null,
      ghostNode: currentState.value.ghostNode ?? null
    }

    console.log('[CollabPresence] Sending awareness:', awarenessState)
    connection.sendAwareness(awarenessState)
  }

  /**
   * Update cursor position
   */
  function updateCursor(cursor: { x: number; y: number } | null): void {
    currentState.value.cursor = cursor
    sendCurrentState()
  }

  /**
   * Update text selection (for editors)
   */
  function updateSelection(selection: { anchor: number; head: number } | null): void {
    currentState.value.selection = selection
    sendCurrentState()
  }

  /**
   * Select a node (for graphs/flows)
   */
  function selectNode(nodeId: string | null): void {
    currentState.value.selectedNodeId = nodeId
    sendCurrentState()
  }

  /**
   * Update ghost node position (for drag previews)
   */
  function updateGhostNode(ghostNode: { id: string; position: { x: number; y: number } } | null): void {
    currentState.value.ghostNode = ghostNode
    sendCurrentState()
  }

  /**
   * Get users currently selecting a specific node
   */
  function getUsersSelectingNode(nodeId: string): CollabAwarenessState[] {
    return otherUsers.value.filter(u => u.selectedNodeId === nodeId)
  }

  /**
   * Get a consistent color for a user ID
   */
  function getUserColor(userId: string): string {
    // First check if user is in the room and has a color
    const roomUser = users.value.find(u => u.user?.id === userId)
    if (roomUser?.user?.color) {
      return roomUser.user.color
    }
    // Generate consistent color from ID
    return generateUserColor(userId)
  }

  /**
   * Get CSS styles for node presence indicators
   */
  function getNodePresenceStyle(nodeId: string): { boxShadow?: string; borderColor?: string } {
    const selecting = getUsersSelectingNode(nodeId)
    if (selecting.length === 0) return {}

    const firstUser = selecting[0]
    const color = firstUser?.user?.color || '#888'
    return {
      boxShadow: `0 0 0 2px ${color}`,
      borderColor: color
    }
  }

  // Send initial awareness on mount
  onMounted(() => {
    console.log('[CollabPresence] onMounted - user:', user.value, 'connected:', connection.connected.value)
    if (user.value && connection.connected.value) {
      sendCurrentState()
    }
  })

  // Watch for connection state changes - send awareness when connected
  watch(
    () => connection.connected.value,
    (connected) => {
      console.log('[CollabPresence] connection.connected changed to:', connected, 'user:', user.value)
      if (connected && user.value) {
        // Small delay to ensure WebSocket is ready
        setTimeout(() => {
          console.log('[CollabPresence] Sending awareness after delay')
          sendCurrentState()
        }, 100)
      }
    },
    { immediate: false }
  )

  return {
    // Current user
    user,

    // All users in room
    users,

    // Other users (excluding self)
    otherUsers,

    // Actions
    updateCursor,
    updateSelection,
    selectNode,
    updateGhostNode,

    // Utilities
    getUsersSelectingNode,
    getUserColor,
    getNodePresenceStyle
  }
}
