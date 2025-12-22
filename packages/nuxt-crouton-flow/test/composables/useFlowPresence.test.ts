/**
 * Unit Tests for useFlowPresence Composable
 *
 * Tests presence UI helpers for flow collaboration.
 */
import { describe, it, expect } from 'vitest'
import { ref, computed } from 'vue'
import { useFlowPresence } from '../../app/composables/useFlowPresence'
import type { YjsAwarenessState } from '../../app/types/yjs'

describe('useFlowPresence', () => {
  const createUser = (id: string, name: string, color: string): YjsAwarenessState => ({
    user: { id, name, color },
    cursor: null,
    selectedNodeId: null
  })

  describe('otherUsers', () => {
    it('filters out current user', () => {
      const users = ref<YjsAwarenessState[]>([
        createUser('user-1', 'Alice', '#ff0000'),
        createUser('user-2', 'Bob', '#00ff00'),
        createUser('user-3', 'Charlie', '#0000ff')
      ])

      const { otherUsers } = useFlowPresence({
        users,
        currentUserId: 'user-2'
      })

      expect(otherUsers.value).toHaveLength(2)
      expect(otherUsers.value.map(u => u.user.id)).toEqual(['user-1', 'user-3'])
    })

    it('returns all users when currentUserId is undefined', () => {
      const users = ref<YjsAwarenessState[]>([
        createUser('user-1', 'Alice', '#ff0000'),
        createUser('user-2', 'Bob', '#00ff00')
      ])

      const { otherUsers } = useFlowPresence({
        users,
        currentUserId: undefined
      })

      expect(otherUsers.value).toHaveLength(2)
    })

    it('returns empty array when no users', () => {
      const users = ref<YjsAwarenessState[]>([])

      const { otherUsers } = useFlowPresence({
        users,
        currentUserId: 'user-1'
      })

      expect(otherUsers.value).toHaveLength(0)
    })

    it('is reactive to user changes', () => {
      const users = ref<YjsAwarenessState[]>([
        createUser('user-1', 'Alice', '#ff0000')
      ])

      const { otherUsers } = useFlowPresence({
        users,
        currentUserId: 'current-user'
      })

      expect(otherUsers.value).toHaveLength(1)

      users.value.push(createUser('user-2', 'Bob', '#00ff00'))

      expect(otherUsers.value).toHaveLength(2)
    })
  })

  describe('getUsersSelectingNode', () => {
    it('returns users selecting a specific node', () => {
      const users = ref<YjsAwarenessState[]>([
        { ...createUser('user-1', 'Alice', '#ff0000'), selectedNodeId: 'node-1' },
        { ...createUser('user-2', 'Bob', '#00ff00'), selectedNodeId: 'node-2' },
        { ...createUser('user-3', 'Charlie', '#0000ff'), selectedNodeId: 'node-1' }
      ])

      const { getUsersSelectingNode } = useFlowPresence({
        users,
        currentUserId: 'current-user'
      })

      const selectingNode1 = getUsersSelectingNode('node-1')

      expect(selectingNode1.value).toHaveLength(2)
      expect(selectingNode1.value.map(u => u.user.name)).toEqual(['Alice', 'Charlie'])
    })

    it('returns empty array when no users selecting node', () => {
      const users = ref<YjsAwarenessState[]>([
        { ...createUser('user-1', 'Alice', '#ff0000'), selectedNodeId: 'node-2' }
      ])

      const { getUsersSelectingNode } = useFlowPresence({
        users,
        currentUserId: 'current-user'
      })

      const selectingNode1 = getUsersSelectingNode('node-1')

      expect(selectingNode1.value).toHaveLength(0)
    })

    it('excludes current user from selecting users', () => {
      const users = ref<YjsAwarenessState[]>([
        { ...createUser('current-user', 'Me', '#ff0000'), selectedNodeId: 'node-1' },
        { ...createUser('user-2', 'Bob', '#00ff00'), selectedNodeId: 'node-1' }
      ])

      const { getUsersSelectingNode } = useFlowPresence({
        users,
        currentUserId: 'current-user'
      })

      const selectingNode1 = getUsersSelectingNode('node-1')

      expect(selectingNode1.value).toHaveLength(1)
      expect(selectingNode1.value[0].user.name).toBe('Bob')
    })
  })

  describe('getNodePresenceStyle', () => {
    it('returns empty object when no users selecting node', () => {
      const users = ref<YjsAwarenessState[]>([
        { ...createUser('user-1', 'Alice', '#ff0000'), selectedNodeId: null }
      ])

      const { getNodePresenceStyle } = useFlowPresence({
        users,
        currentUserId: 'current-user'
      })

      const style = getNodePresenceStyle('node-1')

      expect(style.value).toEqual({})
    })

    it('returns box-shadow and border color for first selecting user', () => {
      const users = ref<YjsAwarenessState[]>([
        { ...createUser('user-1', 'Alice', '#ff0000'), selectedNodeId: 'node-1' },
        { ...createUser('user-2', 'Bob', '#00ff00'), selectedNodeId: 'node-1' }
      ])

      const { getNodePresenceStyle } = useFlowPresence({
        users,
        currentUserId: 'current-user'
      })

      const style = getNodePresenceStyle('node-1')

      expect(style.value).toEqual({
        boxShadow: '0 0 0 2px #ff0000',
        borderColor: '#ff0000'
      })
    })

    it('uses fallback color when user color is undefined', () => {
      const users = ref<YjsAwarenessState[]>([
        {
          user: { id: 'user-1', name: 'Alice', color: undefined as unknown as string },
          cursor: null,
          selectedNodeId: 'node-1'
        }
      ])

      const { getNodePresenceStyle } = useFlowPresence({
        users,
        currentUserId: 'current-user'
      })

      const style = getNodePresenceStyle('node-1')

      expect(style.value).toEqual({
        boxShadow: '0 0 0 2px #888',
        borderColor: '#888'
      })
    })

    it('is reactive to selection changes', () => {
      const users = ref<YjsAwarenessState[]>([
        { ...createUser('user-1', 'Alice', '#ff0000'), selectedNodeId: null }
      ])

      const { getNodePresenceStyle } = useFlowPresence({
        users,
        currentUserId: 'current-user'
      })

      const style = getNodePresenceStyle('node-1')

      expect(style.value).toEqual({})

      // User starts selecting node-1
      users.value[0].selectedNodeId = 'node-1'

      expect(style.value).toEqual({
        boxShadow: '0 0 0 2px #ff0000',
        borderColor: '#ff0000'
      })
    })
  })
})
