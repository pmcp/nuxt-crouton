import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'

// State store for useState mock
const stateStore: Record<string, any> = {}

// Set up global mocks
vi.stubGlobal('ref', ref)

vi.stubGlobal('useState', (key: string, init: () => any) => {
  if (!stateStore[key]) {
    stateStore[key] = ref(init())
  }
  return stateStore[key]
})

// Import after mocking
import { useTreeItemState } from '../useTreeItemState'

describe('useTreeItemState', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // Clear state store
    Object.keys(stateStore).forEach(key => delete stateStore[key])
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('initialization', () => {
    it('returns all expected functions and state', () => {
      const state = useTreeItemState()

      expect(state.markSaving).toBeDefined()
      expect(typeof state.markSaving).toBe('function')
      expect(state.markSaved).toBeDefined()
      expect(typeof state.markSaved).toBe('function')
      expect(state.markError).toBeDefined()
      expect(typeof state.markError).toBe('function')
      expect(state.isSaving).toBeDefined()
      expect(typeof state.isSaving).toBe('function')
      expect(state.wasSaved).toBeDefined()
      expect(typeof state.wasSaved).toBe('function')
      expect(state.flashingCounts).toBeDefined()
      expect(state.triggerCountFlash).toBeDefined()
      expect(typeof state.triggerCountFlash).toBe('function')
    })
  })

  describe('markSaving()', () => {
    it('marks an item as saving', () => {
      const { markSaving, isSaving } = useTreeItemState()

      markSaving('item-1')

      expect(isSaving('item-1')).toBe(true)
    })

    it('can mark multiple items as saving', () => {
      const { markSaving, isSaving } = useTreeItemState()

      markSaving('item-1')
      markSaving('item-2')

      expect(isSaving('item-1')).toBe(true)
      expect(isSaving('item-2')).toBe(true)
    })
  })

  describe('markSaved()', () => {
    it('removes item from saving state', () => {
      const { markSaving, markSaved, isSaving } = useTreeItemState()

      markSaving('item-1')
      expect(isSaving('item-1')).toBe(true)

      markSaved('item-1')
      expect(isSaving('item-1')).toBe(false)
    })

    it('marks item as saved for animation', () => {
      const { markSaved, wasSaved } = useTreeItemState()

      markSaved('item-1')

      expect(wasSaved('item-1')).toBe(true)
    })

    it('clears saved state after 1000ms', () => {
      const { markSaved, wasSaved } = useTreeItemState()

      markSaved('item-1')
      expect(wasSaved('item-1')).toBe(true)

      vi.advanceTimersByTime(1000)

      expect(wasSaved('item-1')).toBe(false)
    })

    it('saved state persists until timeout', () => {
      const { markSaved, wasSaved } = useTreeItemState()

      markSaved('item-1')

      vi.advanceTimersByTime(500)
      expect(wasSaved('item-1')).toBe(true)

      vi.advanceTimersByTime(400)
      expect(wasSaved('item-1')).toBe(true)

      vi.advanceTimersByTime(100)
      expect(wasSaved('item-1')).toBe(false)
    })
  })

  describe('markError()', () => {
    it('removes item from saving state', () => {
      const { markSaving, markError, isSaving } = useTreeItemState()

      markSaving('item-1')
      expect(isSaving('item-1')).toBe(true)

      markError('item-1')
      expect(isSaving('item-1')).toBe(false)
    })

    it('does not mark item as saved', () => {
      const { markSaving, markError, wasSaved } = useTreeItemState()

      markSaving('item-1')
      markError('item-1')

      expect(wasSaved('item-1')).toBe(false)
    })
  })

  describe('isSaving()', () => {
    it('returns false for non-saving items', () => {
      const { isSaving } = useTreeItemState()

      expect(isSaving('unknown-item')).toBe(false)
    })

    it('returns true for saving items', () => {
      const { markSaving, isSaving } = useTreeItemState()

      markSaving('item-1')

      expect(isSaving('item-1')).toBe(true)
    })

    it('returns false after item is saved', () => {
      const { markSaving, markSaved, isSaving } = useTreeItemState()

      markSaving('item-1')
      markSaved('item-1')

      expect(isSaving('item-1')).toBe(false)
    })
  })

  describe('wasSaved()', () => {
    it('returns false for items never saved', () => {
      const { wasSaved } = useTreeItemState()

      expect(wasSaved('unknown-item')).toBe(false)
    })

    it('returns true immediately after saving', () => {
      const { markSaved, wasSaved } = useTreeItemState()

      markSaved('item-1')

      expect(wasSaved('item-1')).toBe(true)
    })

    it('returns false after 1 second', () => {
      const { markSaved, wasSaved } = useTreeItemState()

      markSaved('item-1')
      vi.advanceTimersByTime(1001)

      expect(wasSaved('item-1')).toBe(false)
    })
  })

  describe('triggerCountFlash()', () => {
    it('sets flashingCounts for the item', () => {
      const { triggerCountFlash, flashingCounts } = useTreeItemState()

      triggerCountFlash('item-1')

      expect(flashingCounts.value['item-1']).toBe(true)
    })

    it('clears flashingCounts after 600ms', () => {
      const { triggerCountFlash, flashingCounts } = useTreeItemState()

      triggerCountFlash('item-1')
      expect(flashingCounts.value['item-1']).toBe(true)

      vi.advanceTimersByTime(600)

      expect(flashingCounts.value['item-1']).toBeUndefined()
    })

    it('can flash multiple items independently', () => {
      const { triggerCountFlash, flashingCounts } = useTreeItemState()

      triggerCountFlash('item-1')
      vi.advanceTimersByTime(300)
      triggerCountFlash('item-2')

      expect(flashingCounts.value['item-1']).toBe(true)
      expect(flashingCounts.value['item-2']).toBe(true)

      vi.advanceTimersByTime(300) // item-1 should clear

      expect(flashingCounts.value['item-1']).toBeUndefined()
      expect(flashingCounts.value['item-2']).toBe(true)

      vi.advanceTimersByTime(300) // item-2 should clear

      expect(flashingCounts.value['item-2']).toBeUndefined()
    })
  })

  describe('shared state', () => {
    it('state is shared between multiple calls', () => {
      const state1 = useTreeItemState()
      const state2 = useTreeItemState()

      state1.markSaving('shared-item')

      expect(state2.isSaving('shared-item')).toBe(true)
    })

    it('saved state is shared between calls', () => {
      const state1 = useTreeItemState()
      const state2 = useTreeItemState()

      state1.markSaved('shared-item')

      expect(state2.wasSaved('shared-item')).toBe(true)
    })
  })

  describe('workflow: full save cycle', () => {
    it('handles complete save cycle', () => {
      const { markSaving, markSaved, isSaving, wasSaved } = useTreeItemState()

      // Start saving
      markSaving('item-1')
      expect(isSaving('item-1')).toBe(true)
      expect(wasSaved('item-1')).toBe(false)

      // Save completes
      markSaved('item-1')
      expect(isSaving('item-1')).toBe(false)
      expect(wasSaved('item-1')).toBe(true)

      // Animation completes
      vi.advanceTimersByTime(1000)
      expect(wasSaved('item-1')).toBe(false)
    })

    it('handles save error cycle', () => {
      const { markSaving, markError, isSaving, wasSaved } = useTreeItemState()

      // Start saving
      markSaving('item-1')
      expect(isSaving('item-1')).toBe(true)

      // Save fails
      markError('item-1')
      expect(isSaving('item-1')).toBe(false)
      expect(wasSaved('item-1')).toBe(false)
    })
  })
})
