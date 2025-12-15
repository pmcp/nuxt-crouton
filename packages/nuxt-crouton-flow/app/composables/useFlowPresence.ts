import { computed, type Ref } from 'vue'
import type { YjsAwarenessState } from '../types/yjs'

interface UseFlowPresenceOptions {
  users: Ref<YjsAwarenessState[]>
  currentUserId?: string
}

/**
 * Composable for flow presence UI helpers
 *
 * Provides utilities for rendering user presence indicators
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
    users.value.filter(u => u.user.id !== currentUserId),
  )

  // Users currently selecting a specific node
  const getUsersSelectingNode = (nodeId: string) => {
    return computed(() =>
      otherUsers.value.filter(u => u.selectedNodeId === nodeId),
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
        borderColor: color,
      }
    })
  }

  return {
    otherUsers,
    getUsersSelectingNode,
    getNodePresenceStyle,
  }
}
