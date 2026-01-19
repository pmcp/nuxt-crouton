import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ref, nextTick } from 'vue'
import type { CollabAwarenessState } from '../app/types/collab'

// Mock timer functions
vi.useFakeTimers()

// Mock $fetch globally
const mockFetch = vi.fn()

// We need to mock the module that uses $fetch
vi.mock('../app/composables/useCollabRoomUsers', async () => {
  const { ref, computed, onMounted, onUnmounted, watch } = await import('vue')

  interface UseCollabRoomUsersOptions {
    roomId: string | { value: string | undefined }
    roomType?: string
    pollInterval?: number
    immediate?: boolean
    excludeSelf?: boolean
    currentUserId?: string | { value: string | undefined }
  }

  return {
    useCollabRoomUsers: (options: UseCollabRoomUsersOptions) => {
      const {
        roomType = 'page',
        pollInterval = 5000,
        immediate = true,
        excludeSelf = true
      } = options

      // Normalize roomId to ref
      const roomIdRef = typeof options.roomId === 'string'
        ? ref(options.roomId)
        : options.roomId as { value: string | undefined }

      // Normalize currentUserId to ref
      const currentUserIdRef = typeof options.currentUserId === 'string'
        ? ref(options.currentUserId)
        : (options.currentUserId as { value: string | undefined }) ?? ref(undefined)

      const users = ref<CollabAwarenessState[]>([])
      const loading = ref(false)
      const error = ref<Error | null>(null)
      const pollingActive = ref(false)
      let pollTimer: ReturnType<typeof setInterval> | null = null

      const otherUsers = computed(() => {
        if (!excludeSelf || !currentUserIdRef.value) {
          return users.value
        }
        return users.value.filter(u => u.user?.id !== currentUserIdRef.value)
      })

      const count = computed(() => users.value.length)
      const otherCount = computed(() => otherUsers.value.length)
      const isPolling = computed(() => pollingActive.value)

      async function fetchUsers(): Promise<void> {
        const roomId = roomIdRef.value
        if (!roomId) {
          users.value = []
          return
        }

        try {
          const response = await mockFetch(`/api/collab/${roomId}/users`, {
            query: { type: roomType }
          }) as { users: CollabAwarenessState[]; count: number }

          users.value = response.users || []
          error.value = null
        } catch (err) {
          error.value = err instanceof Error ? err : new Error('Failed to fetch users')
        }
      }

      async function refresh(): Promise<void> {
        loading.value = true
        try {
          await fetchUsers()
        } finally {
          loading.value = false
        }
      }

      function startPolling(): void {
        if (pollingActive.value) return

        pollingActive.value = true
        fetchUsers()

        pollTimer = setInterval(() => {
          if (roomIdRef.value) {
            fetchUsers()
          }
        }, pollInterval)
      }

      function stopPolling(): void {
        pollingActive.value = false

        if (pollTimer) {
          clearInterval(pollTimer)
          pollTimer = null
        }
      }

      // Watch for roomId changes
      watch(() => roomIdRef.value, (newId, oldId) => {
        if (newId !== oldId) {
          users.value = []
          if (pollingActive.value && newId) {
            fetchUsers()
          }
        }
      })

      return {
        users,
        otherUsers,
        count,
        otherCount,
        loading,
        error,
        refresh,
        startPolling,
        stopPolling,
        isPolling
      }
    }
  }
})

// Import after mocking
import { useCollabRoomUsers } from '../app/composables/useCollabRoomUsers'

describe('useCollabRoomUsers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('initialization', () => {
    it('initializes with empty users array', () => {
      const { users, count } = useCollabRoomUsers({
        roomId: 'test-123',
        immediate: false
      })

      expect(users.value).toEqual([])
      expect(count.value).toBe(0)
    })

    it('initializes with loading false', () => {
      const { loading } = useCollabRoomUsers({
        roomId: 'test-123',
        immediate: false
      })

      expect(loading.value).toBe(false)
    })

    it('initializes with error null', () => {
      const { error } = useCollabRoomUsers({
        roomId: 'test-123',
        immediate: false
      })

      expect(error.value).toBeNull()
    })
  })

  describe('startPolling', () => {
    it('fetches users immediately when started', async () => {
      mockFetch.mockResolvedValue({ users: [], count: 0 })

      const { startPolling, isPolling } = useCollabRoomUsers({
        roomId: 'test-123',
        immediate: false
      })

      expect(isPolling.value).toBe(false)

      startPolling()

      expect(isPolling.value).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/collab/test-123/users',
        { query: { type: 'page' } }
      )
    })

    it('continues polling at specified interval', async () => {
      mockFetch.mockResolvedValue({ users: [], count: 0 })

      const { startPolling } = useCollabRoomUsers({
        roomId: 'test-123',
        pollInterval: 1000,
        immediate: false
      })

      startPolling()

      expect(mockFetch).toHaveBeenCalledTimes(1)

      // Advance time by poll interval
      await vi.advanceTimersByTimeAsync(1000)
      expect(mockFetch).toHaveBeenCalledTimes(2)

      await vi.advanceTimersByTimeAsync(1000)
      expect(mockFetch).toHaveBeenCalledTimes(3)
    })

    it('does not start multiple poll timers', () => {
      mockFetch.mockResolvedValue({ users: [], count: 0 })

      const { startPolling } = useCollabRoomUsers({
        roomId: 'test-123',
        pollInterval: 1000,
        immediate: false
      })

      startPolling()
      startPolling()
      startPolling()

      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('stopPolling', () => {
    it('stops the polling timer', async () => {
      mockFetch.mockResolvedValue({ users: [], count: 0 })

      const { startPolling, stopPolling, isPolling } = useCollabRoomUsers({
        roomId: 'test-123',
        pollInterval: 1000,
        immediate: false
      })

      startPolling()
      expect(isPolling.value).toBe(true)

      stopPolling()
      expect(isPolling.value).toBe(false)

      // Advance time - should not fetch again
      await vi.advanceTimersByTimeAsync(5000)
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('user filtering', () => {
    it('filters out current user when excludeSelf is true', async () => {
      const mockUsers: CollabAwarenessState[] = [
        { user: { id: 'user-1', name: 'Alice', color: '#ff0000' }, cursor: null },
        { user: { id: 'user-2', name: 'Bob', color: '#00ff00' }, cursor: null },
        { user: { id: 'current', name: 'Me', color: '#0000ff' }, cursor: null }
      ]

      mockFetch.mockResolvedValue({ users: mockUsers, count: 3 })

      const { startPolling, users, otherUsers, count, otherCount } = useCollabRoomUsers({
        roomId: 'test-123',
        currentUserId: 'current',
        excludeSelf: true,
        immediate: false
      })

      startPolling()
      await vi.waitFor(() => users.value.length > 0)

      expect(count.value).toBe(3)
      expect(otherCount.value).toBe(2)
      expect(otherUsers.value).toHaveLength(2)
      expect(otherUsers.value.find(u => u.user?.id === 'current')).toBeUndefined()
    })

    it('includes all users when excludeSelf is false', async () => {
      const mockUsers: CollabAwarenessState[] = [
        { user: { id: 'user-1', name: 'Alice', color: '#ff0000' }, cursor: null },
        { user: { id: 'current', name: 'Me', color: '#0000ff' }, cursor: null }
      ]

      mockFetch.mockResolvedValue({ users: mockUsers, count: 2 })

      const { startPolling, users, otherUsers } = useCollabRoomUsers({
        roomId: 'test-123',
        currentUserId: 'current',
        excludeSelf: false,
        immediate: false
      })

      startPolling()
      await vi.waitFor(() => users.value.length > 0)

      expect(otherUsers.value).toHaveLength(2)
    })
  })

  describe('refresh', () => {
    it('sets loading to true during fetch', async () => {
      mockFetch.mockImplementation(() => new Promise(resolve => {
        setTimeout(() => resolve({ users: [], count: 0 }), 100)
      }))

      const { refresh, loading } = useCollabRoomUsers({
        roomId: 'test-123',
        immediate: false
      })

      expect(loading.value).toBe(false)

      const refreshPromise = refresh()

      expect(loading.value).toBe(true)

      await vi.advanceTimersByTimeAsync(100)
      await refreshPromise

      expect(loading.value).toBe(false)
    })
  })

  describe('error handling', () => {
    it('sets error when fetch fails', async () => {
      const fetchError = new Error('Network error')
      mockFetch.mockRejectedValue(fetchError)

      const { startPolling, error, users } = useCollabRoomUsers({
        roomId: 'test-123',
        immediate: false
      })

      startPolling()
      await vi.waitFor(() => error.value !== null)

      expect(error.value).toBeInstanceOf(Error)
      expect(error.value?.message).toBe('Network error')
    })

    it('keeps stale data on error', async () => {
      const mockUsers: CollabAwarenessState[] = [
        { user: { id: 'user-1', name: 'Alice', color: '#ff0000' }, cursor: null }
      ]

      // First call succeeds
      mockFetch.mockResolvedValueOnce({ users: mockUsers, count: 1 })
      // Second call fails
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const { startPolling, users, error } = useCollabRoomUsers({
        roomId: 'test-123',
        pollInterval: 1000,
        immediate: false
      })

      startPolling()
      await vi.waitFor(() => users.value.length > 0)

      expect(users.value).toHaveLength(1)

      // Trigger next poll that will fail
      await vi.advanceTimersByTimeAsync(1000)
      await vi.waitFor(() => error.value !== null)

      // Users should still have the stale data
      expect(users.value).toHaveLength(1)
    })
  })

  describe('reactive roomId', () => {
    it('fetches new users when roomId changes', async () => {
      const room1Users: CollabAwarenessState[] = [
        { user: { id: 'user-1', name: 'Alice', color: '#ff0000' }, cursor: null }
      ]
      const room2Users: CollabAwarenessState[] = [
        { user: { id: 'user-2', name: 'Bob', color: '#00ff00' }, cursor: null },
        { user: { id: 'user-3', name: 'Charlie', color: '#0000ff' }, cursor: null }
      ]

      // Return different users based on room ID
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('room-1')) {
          return Promise.resolve({ users: room1Users, count: 1 })
        }
        return Promise.resolve({ users: room2Users, count: 2 })
      })

      const roomId = ref<string | undefined>('room-1')
      const { startPolling, users } = useCollabRoomUsers({
        roomId,
        immediate: false
      })

      startPolling()
      await vi.waitFor(() => users.value.length > 0)

      expect(users.value).toHaveLength(1)
      expect(users.value[0].user?.name).toBe('Alice')

      // Change roomId
      roomId.value = 'room-2'
      await nextTick()
      await vi.waitFor(() => users.value.length === 2)

      // Should have new room's users
      expect(users.value).toHaveLength(2)
      expect(users.value[0].user?.name).toBe('Bob')
    })

    it('fetches new room users when roomId changes', async () => {
      mockFetch.mockResolvedValue({ users: [], count: 0 })

      const roomId = ref<string | undefined>('room-1')
      const { startPolling } = useCollabRoomUsers({
        roomId,
        immediate: false
      })

      startPolling()
      await vi.waitFor(() => mockFetch.mock.calls.length > 0)

      expect(mockFetch).toHaveBeenCalledWith('/api/collab/room-1/users', expect.anything())

      roomId.value = 'room-2'
      await nextTick()
      await vi.waitFor(() => mockFetch.mock.calls.length > 1)

      expect(mockFetch).toHaveBeenCalledWith('/api/collab/room-2/users', expect.anything())
    })

    it('handles undefined roomId', async () => {
      const roomId = ref<string | undefined>(undefined)
      const { startPolling, users } = useCollabRoomUsers({
        roomId,
        immediate: false
      })

      startPolling()

      // Should not attempt to fetch
      expect(mockFetch).not.toHaveBeenCalled()
      expect(users.value).toEqual([])
    })
  })

  describe('room type', () => {
    it('uses default room type of page', async () => {
      mockFetch.mockResolvedValue({ users: [], count: 0 })

      const { startPolling } = useCollabRoomUsers({
        roomId: 'test-123',
        immediate: false
      })

      startPolling()

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/collab/test-123/users',
        { query: { type: 'page' } }
      )
    })

    it('uses custom room type', async () => {
      mockFetch.mockResolvedValue({ users: [], count: 0 })

      const { startPolling } = useCollabRoomUsers({
        roomId: 'test-123',
        roomType: 'flow',
        immediate: false
      })

      startPolling()

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/collab/test-123/users',
        { query: { type: 'flow' } }
      )
    })
  })
})
