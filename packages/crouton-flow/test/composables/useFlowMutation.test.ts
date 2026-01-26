/**
 * Unit Tests for useFlowMutation Composable
 *
 * Tests mutation utilities for flow node positions.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'

// Mock Nuxt composables
const mockGetConfig = vi.fn()
const mockGetTeamId = vi.fn()
const mockRoute = { path: '/dashboard' }
let mockFetch: ReturnType<typeof vi.fn>

vi.stubGlobal('useCollections', () => ({
  getConfig: mockGetConfig
}))

vi.stubGlobal('useTeamContext', () => ({
  getTeamId: mockGetTeamId
}))

vi.stubGlobal('useRoute', () => mockRoute)

// Import after mocking
import { useFlowMutation, useDebouncedPositionUpdate } from '../../app/composables/useFlowMutation'

describe('useFlowMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch = vi.fn().mockResolvedValue({ success: true })
    vi.stubGlobal('$fetch', mockFetch)
    mockGetConfig.mockReturnValue({ apiPath: 'decisions' })
    mockGetTeamId.mockReturnValue('team-123')
    mockRoute.path = '/dashboard'
  })

  describe('initialization', () => {
    it('throws error when collection not found', () => {
      mockGetConfig.mockReturnValue(undefined)

      expect(() => useFlowMutation('unknown-collection'))
        .toThrow('Collection "unknown-collection" not registered')
    })

    it('initializes with pending false and no error', () => {
      const { pending, error } = useFlowMutation('decisions')

      expect(pending.value).toBe(false)
      expect(error.value).toBe(null)
    })
  })

  describe('updatePosition', () => {
    it('makes PATCH request with rounded position', async () => {
      const { updatePosition } = useFlowMutation('decisions')

      await updatePosition('node-1', { x: 100.7, y: 200.3 })

      expect(mockFetch).toHaveBeenCalledWith('/api/teams/team-123/decisions/node-1', {
        method: 'PATCH',
        body: {
          position: { x: 101, y: 200 }
        },
        credentials: 'include'
      })
    })

    it('uses custom positionField', async () => {
      const { updatePosition } = useFlowMutation('decisions', 'coords')

      await updatePosition('node-1', { x: 100, y: 200 })

      expect(mockFetch).toHaveBeenCalledWith('/api/teams/team-123/decisions/node-1', {
        method: 'PATCH',
        body: {
          coords: { x: 100, y: 200 }
        },
        credentials: 'include'
      })
    })

    it('uses super-admin path when on super-admin route', async () => {
      mockRoute.path = '/super-admin/decisions'
      const { updatePosition } = useFlowMutation('decisions')

      await updatePosition('node-1', { x: 100, y: 200 })

      expect(mockFetch).toHaveBeenCalledWith('/api/super-admin/decisions/node-1', {
        method: 'PATCH',
        body: {
          position: { x: 100, y: 200 }
        },
        credentials: 'include'
      })
    })

    it('throws error when team context not available (non-super-admin)', async () => {
      mockGetTeamId.mockReturnValue(null)
      const { updatePosition } = useFlowMutation('decisions')

      await expect(updatePosition('node-1', { x: 100, y: 200 }))
        .rejects.toThrow('Team context required for this operation')
    })

    it('sets pending during request', async () => {
      let resolveFetch: (value: unknown) => void
      mockFetch.mockImplementation(() => new Promise(resolve => { resolveFetch = resolve }))

      const { updatePosition, pending } = useFlowMutation('decisions')

      expect(pending.value).toBe(false)

      const promise = updatePosition('node-1', { x: 100, y: 200 })

      expect(pending.value).toBe(true)

      resolveFetch!({ success: true })
      await promise

      expect(pending.value).toBe(false)
    })

    it('sets error on failure', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      const { updatePosition, error } = useFlowMutation('decisions')

      await expect(updatePosition('node-1', { x: 100, y: 200 }))
        .rejects.toThrow('Network error')

      expect(error.value?.message).toBe('Network error')
    })

    it('wraps non-Error failures', async () => {
      mockFetch.mockRejectedValue('string error')

      const { updatePosition, error } = useFlowMutation('decisions')

      await expect(updatePosition('node-1', { x: 100, y: 200 }))
        .rejects.toThrow('Failed to update position')

      expect(error.value?.message).toBe('Failed to update position')
    })

    it('clears error on successful request', async () => {
      const { updatePosition, error } = useFlowMutation('decisions')

      // First, fail a request
      mockFetch.mockRejectedValueOnce(new Error('First error'))
      await expect(updatePosition('node-1', { x: 100, y: 200 })).rejects.toThrow()
      expect(error.value).not.toBe(null)

      // Then succeed
      mockFetch.mockResolvedValueOnce({ success: true })
      await updatePosition('node-1', { x: 100, y: 200 })
      expect(error.value).toBe(null)
    })
  })

  describe('updatePositions', () => {
    it('updates multiple positions in parallel', async () => {
      const { updatePositions } = useFlowMutation('decisions')

      await updatePositions([
        { id: 'node-1', position: { x: 100, y: 200 } },
        { id: 'node-2', position: { x: 300, y: 400 } }
      ])

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(mockFetch).toHaveBeenCalledWith('/api/teams/team-123/decisions/node-1', expect.any(Object))
      expect(mockFetch).toHaveBeenCalledWith('/api/teams/team-123/decisions/node-2', expect.any(Object))
    })

    it('rounds positions in batch update', async () => {
      const { updatePositions } = useFlowMutation('decisions')

      await updatePositions([
        { id: 'node-1', position: { x: 100.7, y: 200.3 } }
      ])

      expect(mockFetch).toHaveBeenCalledWith('/api/teams/team-123/decisions/node-1', {
        method: 'PATCH',
        body: {
          position: { x: 101, y: 200 }
        },
        credentials: 'include'
      })
    })

    it('sets error when any request fails', async () => {
      mockFetch
        .mockResolvedValueOnce({ success: true })
        .mockRejectedValueOnce(new Error('Second failed'))

      const { updatePositions, error } = useFlowMutation('decisions')

      await expect(updatePositions([
        { id: 'node-1', position: { x: 100, y: 200 } },
        { id: 'node-2', position: { x: 300, y: 400 } }
      ])).rejects.toThrow('Second failed')

      expect(error.value?.message).toBe('Second failed')
    })
  })
})

describe('useDebouncedPositionUpdate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    mockFetch = vi.fn().mockResolvedValue({ success: true })
    vi.stubGlobal('$fetch', mockFetch)
    mockGetConfig.mockReturnValue({ apiPath: 'decisions' })
    mockGetTeamId.mockReturnValue('team-123')
    mockRoute.path = '/dashboard'
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('debounces position updates', async () => {
    const { debouncedUpdate } = useDebouncedPositionUpdate('decisions', 'position', 500)

    debouncedUpdate('node-1', { x: 100, y: 200 })
    debouncedUpdate('node-1', { x: 150, y: 250 })
    debouncedUpdate('node-1', { x: 200, y: 300 })

    expect(mockFetch).not.toHaveBeenCalled()

    vi.advanceTimersByTime(500)
    await Promise.resolve() // Allow promises to resolve

    expect(mockFetch).toHaveBeenCalledTimes(1)
    // Should use the latest position
    expect(mockFetch).toHaveBeenCalledWith('/api/teams/team-123/decisions/node-1', {
      method: 'PATCH',
      body: {
        position: { x: 200, y: 300 }
      },
      credentials: 'include'
    })
  })

  it('batches updates for multiple nodes', async () => {
    const { debouncedUpdate } = useDebouncedPositionUpdate('decisions', 'position', 500)

    debouncedUpdate('node-1', { x: 100, y: 200 })
    debouncedUpdate('node-2', { x: 300, y: 400 })

    vi.advanceTimersByTime(500)
    await Promise.resolve()

    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('resets debounce timer on new update', async () => {
    const { debouncedUpdate } = useDebouncedPositionUpdate('decisions', 'position', 500)

    debouncedUpdate('node-1', { x: 100, y: 200 })

    vi.advanceTimersByTime(300) // Not yet triggered
    expect(mockFetch).not.toHaveBeenCalled()

    debouncedUpdate('node-1', { x: 150, y: 250 }) // Reset timer

    vi.advanceTimersByTime(300) // Still not triggered (total 300ms since reset)
    expect(mockFetch).not.toHaveBeenCalled()

    vi.advanceTimersByTime(200) // Now triggered (500ms since reset)
    await Promise.resolve()

    expect(mockFetch).toHaveBeenCalledTimes(1)
  })
})
