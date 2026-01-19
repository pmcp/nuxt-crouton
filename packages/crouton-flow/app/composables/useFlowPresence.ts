import { computed, type Ref } from 'vue'
// Type is re-exported from our local types file
import type { CollabAwarenessState } from '../types/yjs'

interface UseFlowPresenceOptions {
  users: Ref<CollabAwarenessState[]>
  currentUserId?: string
}

/**
 * Composable for flow presence UI helpers
 *
 * Provides utilities for rendering user presence indicators in flow graphs.
 * Uses the same CollabAwarenessState type as crouton-collab for consistency.
 *
 * @example
 * ```ts
 * const { otherUsers, getUsersSelectingNode, getNodePresenceStyle } = useFlowPresence({
 *   users: computed(() => syncState.users),
 *   currentUserId: currentUser.id
 * })
 * ```
 */
export function useFlowPresence(options: UseFlowPresenceOptions) {
  const { users, currentUserId } = options

  // Other users (not current user)
  const otherUsers = computed(() =>
    users.value.filter(u => u.user?.id !== currentUserId)
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
      const firstUser = selecting[0]
      const color = firstUser?.user?.color || '#888'
      return {
        boxShadow: `0 0 0 2px ${color}`,
        borderColor: color
      }
    })
  }

  // Get a consistent color for a user ID
  const getUserColor = (userId: string): string => {
    // Check if user is in the room and has a color
    const roomUser = users.value.find(u => u.user?.id === userId)
    if (roomUser?.user?.color) {
      return roomUser.user.color
    }
    // Generate consistent color from ID
    return generateUserColor(userId)
  }

  return {
    otherUsers,
    getUsersSelectingNode,
    getNodePresenceStyle,
    getUserColor
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
