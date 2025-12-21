import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'

// Mock dependencies
const mockToastAdd = vi.fn()
const mockMarkSaving = vi.fn()
const mockMarkSaved = vi.fn()
const mockMarkError = vi.fn()
const mockTriggerCountFlash = vi.fn()
const mockCallHook = vi.fn()
const mockRefreshNuxtData = vi.fn()
const mockFetch = vi.fn()

// Set up global mocks
vi.stubGlobal('ref', ref)
vi.stubGlobal('readonly', (val: any) => val)

vi.stubGlobal('useRoute', () => ({
  path: '/teams/test-team/pages'
}))

vi.stubGlobal('useToast', () => ({
  add: mockToastAdd
}))

let mockCollectionConfig = {
  apiPath: 'pages',
  sortable: { enabled: false },
  hierarchy: { enabled: true }
}

vi.stubGlobal('useCollections', () => ({
  getConfig: (name: string) => name === 'pages' ? mockCollectionConfig : null
}))

vi.stubGlobal('useTeamContext', () => ({
  getTeamId: () => 'team-123'
}))

vi.stubGlobal('useTreeItemState', () => ({
  markSaving: mockMarkSaving,
  markSaved: mockMarkSaved,
  markError: mockMarkError,
  triggerCountFlash: mockTriggerCountFlash
}))

vi.stubGlobal('useNuxtApp', () => ({
  hooks: { callHook: mockCallHook }
}))

vi.stubGlobal('refreshNuxtData', mockRefreshNuxtData)
vi.stubGlobal('$fetch', mockFetch)

// Mock console
vi.stubGlobal('console', {
  ...console,
  log: vi.fn(),
  error: vi.fn(),
  group: vi.fn(),
  groupEnd: vi.fn()
})

// Import after mocking
import { useTreeMutation } from '../useTreeMutation'

describe('useTreeMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockResolvedValue(undefined)
    mockRefreshNuxtData.mockResolvedValue(undefined)
    mockCallHook.mockResolvedValue(undefined)
    mockCollectionConfig = {
      apiPath: 'pages',
      sortable: { enabled: false },
      hierarchy: { enabled: true }
    }
  })

  describe('initialization', () => {
    it('returns moveNode, reorderSiblings, moving, and reordering', () => {
      const mutation = useTreeMutation('pages')

      expect(mutation.moveNode).toBeDefined()
      expect(typeof mutation.moveNode).toBe('function')
      expect(mutation.reorderSiblings).toBeDefined()
      expect(typeof mutation.reorderSiblings).toBe('function')
      expect(mutation.moving).toBeDefined()
      expect(mutation.reordering).toBeDefined()
    })

    it('throws error for unregistered collection', () => {
      expect(() => useTreeMutation('unknown')).toThrow('Collection "unknown" not registered')
    })
  })

  describe('moveNode() - hierarchy mode', () => {
    it('calls PATCH to move endpoint', async () => {
      const { moveNode } = useTreeMutation('pages')

      await moveNode('page-1', 'parent-1', 2)

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/teams/team-123/pages/page-1/move',
        expect.objectContaining({
          method: 'PATCH',
          body: { parentId: 'parent-1', order: 2 },
          credentials: 'include'
        })
      )
    })

    it('handles null parentId for root level', async () => {
      const { moveNode } = useTreeMutation('pages')

      await moveNode('page-1', null, 0)

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/teams/team-123/pages/page-1/move',
        expect.objectContaining({
          body: { parentId: null, order: 0 }
        })
      )
    })

    it('marks item as saving during mutation', async () => {
      const { moveNode } = useTreeMutation('pages')

      await moveNode('page-1', 'parent-1', 0)

      expect(mockMarkSaving).toHaveBeenCalledWith('page-1')
    })

    it('marks item as saved on success', async () => {
      const { moveNode } = useTreeMutation('pages')

      await moveNode('page-1', 'parent-1', 0)

      expect(mockMarkSaved).toHaveBeenCalledWith('page-1')
    })

    it('triggers count flash on parent', async () => {
      const { moveNode } = useTreeMutation('pages')

      await moveNode('page-1', 'parent-1', 0)

      expect(mockTriggerCountFlash).toHaveBeenCalledWith('parent-1')
    })

    it('does not flash count for root level moves', async () => {
      const { moveNode } = useTreeMutation('pages')

      await moveNode('page-1', null, 0)

      expect(mockTriggerCountFlash).not.toHaveBeenCalled()
    })

    it('emits crouton:mutation hook', async () => {
      const { moveNode } = useTreeMutation('pages')

      await moveNode('page-1', 'parent-1', 2)

      expect(mockCallHook).toHaveBeenCalledWith('crouton:mutation', {
        operation: 'move',
        collection: 'pages',
        itemId: 'page-1',
        data: { parentId: 'parent-1', order: 2 }
      })
    })

    it('invalidates cache after success', async () => {
      const { moveNode } = useTreeMutation('pages')

      await moveNode('page-1', 'parent-1', 0)

      expect(mockRefreshNuxtData).toHaveBeenCalledWith('collection:pages:{}')
    })

    it('marks error on failure', async () => {
      mockFetch.mockRejectedValue(new Error('Move failed'))
      const { moveNode } = useTreeMutation('pages')

      await expect(moveNode('page-1', 'parent-1', 0)).rejects.toThrow('Move failed')
      expect(mockMarkError).toHaveBeenCalledWith('page-1')
    })

    it('shows toast on failure', async () => {
      mockFetch.mockRejectedValue({ data: { message: 'Invalid move' } })
      const { moveNode } = useTreeMutation('pages')

      await expect(moveNode('page-1', 'parent-1', 0)).rejects.toBeDefined()
      expect(mockToastAdd).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Move failed',
        color: 'error'
      }))
    })
  })

  describe('moveNode() - sortable-only mode', () => {
    beforeEach(() => {
      mockCollectionConfig = {
        apiPath: 'pages',
        sortable: { enabled: true },
        hierarchy: { enabled: false }
      }
    })

    it('fetches current items to calculate order', async () => {
      mockFetch.mockResolvedValueOnce([
        { id: 'a', order: 0 },
        { id: 'b', order: 1 },
        { id: 'c', order: 2 }
      ])

      const { moveNode } = useTreeMutation('pages')

      await moveNode('c', null, 0) // Move 'c' to first position

      // Should fetch current items
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/teams/team-123/pages',
        expect.objectContaining({ credentials: 'include' })
      )

      // Should call reorder endpoint
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/teams/team-123/pages/reorder',
        expect.objectContaining({
          method: 'PATCH',
          body: {
            updates: [
              { id: 'c', order: 0 },
              { id: 'a', order: 1 },
              { id: 'b', order: 2 }
            ]
          }
        })
      )
    })

    it('ignores parentId in sortable-only mode', async () => {
      mockFetch.mockResolvedValueOnce([
        { id: 'a', order: 0 },
        { id: 'b', order: 1 }
      ])

      const { moveNode } = useTreeMutation('pages')

      await moveNode('b', 'some-parent', 0) // parentId should be ignored

      // Should use reorder endpoint, not move
      expect(mockFetch).toHaveBeenLastCalledWith(
        '/api/teams/team-123/pages/reorder',
        expect.any(Object)
      )
    })
  })

  describe('reorderSiblings()', () => {
    it('calls PATCH to reorder endpoint', async () => {
      const { reorderSiblings } = useTreeMutation('pages')
      const updates = [
        { id: 'page-1', order: 0 },
        { id: 'page-2', order: 1 },
        { id: 'page-3', order: 2 }
      ]

      await reorderSiblings(updates)

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/teams/team-123/pages/reorder',
        expect.objectContaining({
          method: 'PATCH',
          body: { updates },
          credentials: 'include'
        })
      )
    })

    it('emits crouton:mutation hook with reorder operation', async () => {
      const { reorderSiblings } = useTreeMutation('pages')
      const updates = [{ id: 'page-1', order: 0 }]

      await reorderSiblings(updates)

      expect(mockCallHook).toHaveBeenCalledWith('crouton:mutation', {
        operation: 'reorder',
        collection: 'pages',
        data: { updates }
      })
    })

    it('invalidates cache after success', async () => {
      const { reorderSiblings } = useTreeMutation('pages')

      await reorderSiblings([{ id: 'page-1', order: 0 }])

      expect(mockRefreshNuxtData).toHaveBeenCalledWith('collection:pages:{}')
    })

    it('marks all items as saved', async () => {
      const { reorderSiblings } = useTreeMutation('pages')
      const updates = [
        { id: 'page-1', order: 0 },
        { id: 'page-2', order: 1 }
      ]

      await reorderSiblings(updates)

      expect(mockMarkSaved).toHaveBeenCalledWith('page-1')
      expect(mockMarkSaved).toHaveBeenCalledWith('page-2')
    })

    it('shows toast on failure', async () => {
      mockFetch.mockRejectedValue({ data: 'Reorder failed' })
      const { reorderSiblings } = useTreeMutation('pages')

      await expect(reorderSiblings([{ id: 'page-1', order: 0 }])).rejects.toBeDefined()
      expect(mockToastAdd).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Reorder failed',
        color: 'error'
      }))
    })
  })

  describe('super-admin routes', () => {
    beforeEach(() => {
      vi.stubGlobal('useRoute', () => ({
        path: '/super-admin/pages'
      }))
    })

    afterEach(() => {
      vi.stubGlobal('useRoute', () => ({
        path: '/teams/test-team/pages'
      }))
    })

    it('uses super-admin path for moveNode', async () => {
      const { moveNode } = useTreeMutation('pages')

      await moveNode('page-1', null, 0)

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/super-admin/pages/page-1/move',
        expect.any(Object)
      )
    })

    it('uses super-admin path for reorderSiblings', async () => {
      const { reorderSiblings } = useTreeMutation('pages')

      await reorderSiblings([{ id: 'page-1', order: 0 }])

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/super-admin/pages/reorder',
        expect.any(Object)
      )
    })
  })

  describe('team context error handling', () => {
    beforeEach(() => {
      vi.stubGlobal('useTeamContext', () => ({
        getTeamId: () => undefined
      }))
      vi.stubGlobal('useRoute', () => ({
        path: '/teams/unknown/pages' // Not super-admin, needs team
      }))
    })

    afterEach(() => {
      vi.stubGlobal('useTeamContext', () => ({
        getTeamId: () => 'team-123'
      }))
      vi.stubGlobal('useRoute', () => ({
        path: '/teams/test-team/pages'
      }))
    })

    it('throws when team context is required but missing', async () => {
      const { moveNode } = useTreeMutation('pages')

      await expect(moveNode('page-1', null, 0)).rejects.toThrow('Team context required')
    })
  })

  describe('loading states', () => {
    it('moving is true during moveNode', async () => {
      let resolvePromise: () => void
      mockFetch.mockReturnValue(new Promise(resolve => { resolvePromise = resolve }))

      const { moveNode, moving } = useTreeMutation('pages')

      expect(moving.value).toBe(false)

      const promise = moveNode('page-1', null, 0)

      // Note: Due to how the mock works, we need to wait for the promise to be created
      await Promise.resolve()
      expect(moving.value).toBe(true)

      resolvePromise!()
      await promise

      expect(moving.value).toBe(false)
    })

    it('reordering is true during reorderSiblings', async () => {
      let resolvePromise: () => void
      mockFetch.mockReturnValue(new Promise(resolve => { resolvePromise = resolve }))

      const { reorderSiblings, reordering } = useTreeMutation('pages')

      expect(reordering.value).toBe(false)

      const promise = reorderSiblings([{ id: 'page-1', order: 0 }])

      await Promise.resolve()
      expect(reordering.value).toBe(true)

      resolvePromise!()
      await promise

      expect(reordering.value).toBe(false)
    })
  })

  describe('custom apiPath', () => {
    beforeEach(() => {
      mockCollectionConfig = {
        apiPath: 'custom-pages-path',
        sortable: { enabled: false },
        hierarchy: { enabled: true }
      }
    })

    it('uses custom apiPath in URL', async () => {
      const { moveNode } = useTreeMutation('pages')

      await moveNode('page-1', null, 0)

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/teams/team-123/custom-pages-path/page-1/move',
        expect.any(Object)
      )
    })
  })
})
