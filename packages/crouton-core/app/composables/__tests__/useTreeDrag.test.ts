import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'

// State store for useState mock
const stateStore: Record<string, any> = {}

// Set up global mocks
vi.stubGlobal('ref', ref)
vi.stubGlobal('readonly', (val: any) => val)

vi.stubGlobal('useState', (key: string, init: () => any) => {
  if (!stateStore[key]) {
    stateStore[key] = ref(init())
  }
  return stateStore[key]
})

// Import after mocking
import { useTreeDrag } from '../useTreeDrag'

describe('useTreeDrag', () => {
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
      const drag = useTreeDrag()

      // State
      expect(drag.draggingId).toBeDefined()
      expect(drag.dropTargetId).toBeDefined()

      // Drag operations
      expect(typeof drag.startDrag).toBe('function')
      expect(typeof drag.endDrag).toBe('function')
      expect(typeof drag.isDragging).toBe('function')
      expect(typeof drag.getDraggingId).toBe('function')

      // Drop target
      expect(typeof drag.setDropTarget).toBe('function')
      expect(typeof drag.isDropTarget).toBe('function')

      // Expanded state
      expect(typeof drag.isExpanded).toBe('function')
      expect(typeof drag.setExpanded).toBe('function')
      expect(typeof drag.toggle).toBe('function')
      expect(typeof drag.initExpanded).toBe('function')

      // Auto-expand
      expect(typeof drag.scheduleAutoExpand).toBe('function')
      expect(typeof drag.cancelAutoExpand).toBe('function')

      // Move blocking
      expect(typeof drag.setMoveBlocked).toBe('function')
      expect(typeof drag.isMoveBlocked).toBe('function')

      // Validation
      expect(typeof drag.isDescendantDrop).toBe('function')
    })
  })

  describe('drag state', () => {
    describe('startDrag()', () => {
      it('sets draggingId', () => {
        const { startDrag, getDraggingId } = useTreeDrag()

        startDrag('item-1')

        expect(getDraggingId()).toBe('item-1')
      })

      it('can change dragging item', () => {
        const { startDrag, getDraggingId } = useTreeDrag()

        startDrag('item-1')
        startDrag('item-2')

        expect(getDraggingId()).toBe('item-2')
      })
    })

    describe('endDrag()', () => {
      it('clears draggingId', () => {
        const { startDrag, endDrag, getDraggingId, isDragging } = useTreeDrag()

        startDrag('item-1')
        expect(getDraggingId()).toBe('item-1')

        endDrag()

        expect(getDraggingId()).toBeNull()
        expect(isDragging()).toBe(false)
      })

      it('clears dropTargetId', () => {
        const { startDrag, setDropTarget, endDrag, isDropTarget } = useTreeDrag()

        startDrag('item-1')
        setDropTarget('parent-1')
        expect(isDropTarget('parent-1')).toBe(true)

        endDrag()

        expect(isDropTarget('parent-1')).toBe(false)
      })

      it('collapses auto-expanded items', () => {
        const { startDrag, setExpanded, scheduleAutoExpand, endDrag, isExpanded } = useTreeDrag()

        startDrag('item-1')
        scheduleAutoExpand('parent-1')
        vi.advanceTimersByTime(500) // Trigger auto-expand

        expect(isExpanded('parent-1')).toBe(true)

        endDrag()

        expect(isExpanded('parent-1')).toBe(false)
      })
    })

    describe('isDragging()', () => {
      it('returns false when not dragging', () => {
        const { isDragging } = useTreeDrag()

        expect(isDragging()).toBe(false)
      })

      it('returns true when dragging (no id)', () => {
        const { startDrag, isDragging } = useTreeDrag()

        startDrag('item-1')

        expect(isDragging()).toBe(true)
      })

      it('returns true for specific id when that item is dragging', () => {
        const { startDrag, isDragging } = useTreeDrag()

        startDrag('item-1')

        expect(isDragging('item-1')).toBe(true)
        expect(isDragging('item-2')).toBe(false)
      })
    })
  })

  describe('drop target', () => {
    describe('setDropTarget()', () => {
      it('sets drop target id', () => {
        const { setDropTarget, isDropTarget } = useTreeDrag()

        setDropTarget('target-1')

        expect(isDropTarget('target-1')).toBe(true)
      })

      it('clears previous target when setting new one', () => {
        const { setDropTarget, isDropTarget } = useTreeDrag()

        setDropTarget('target-1')
        setDropTarget('target-2')

        expect(isDropTarget('target-1')).toBe(false)
        expect(isDropTarget('target-2')).toBe(true)
      })

      it('can clear with null', () => {
        const { setDropTarget, isDropTarget } = useTreeDrag()

        setDropTarget('target-1')
        setDropTarget(null)

        expect(isDropTarget('target-1')).toBe(false)
      })
    })

    describe('isDropTarget()', () => {
      it('returns false for non-targets', () => {
        const { isDropTarget } = useTreeDrag()

        expect(isDropTarget('unknown')).toBe(false)
      })
    })
  })

  describe('expanded state', () => {
    describe('setExpanded()', () => {
      it('sets expanded state to true', () => {
        const { setExpanded, isExpanded } = useTreeDrag()

        setExpanded('item-1', true)

        expect(isExpanded('item-1')).toBe(true)
      })

      it('sets expanded state to false', () => {
        const { setExpanded, isExpanded } = useTreeDrag()

        setExpanded('item-1', true)
        setExpanded('item-1', false)

        expect(isExpanded('item-1')).toBe(false)
      })
    })

    describe('toggle()', () => {
      it('toggles from false to true', () => {
        const { toggle, isExpanded } = useTreeDrag()

        toggle('item-1')

        expect(isExpanded('item-1')).toBe(true)
      })

      it('toggles from true to false', () => {
        const { setExpanded, toggle, isExpanded } = useTreeDrag()

        setExpanded('item-1', true)
        toggle('item-1')

        expect(isExpanded('item-1')).toBe(false)
      })
    })

    describe('initExpanded()', () => {
      it('initializes with default value if not set', () => {
        const { initExpanded, isExpanded } = useTreeDrag()

        initExpanded('item-1', true)

        expect(isExpanded('item-1')).toBe(true)
      })

      it('preserves existing value', () => {
        const { setExpanded, initExpanded, isExpanded } = useTreeDrag()

        setExpanded('item-1', false)
        initExpanded('item-1', true) // Should not override

        expect(isExpanded('item-1')).toBe(false)
      })
    })

    describe('isExpanded()', () => {
      it('returns false for unknown items', () => {
        const { isExpanded } = useTreeDrag()

        expect(isExpanded('unknown')).toBe(false)
      })
    })
  })

  describe('auto-expand', () => {
    describe('scheduleAutoExpand()', () => {
      it('expands item after delay', () => {
        const { startDrag, scheduleAutoExpand, isExpanded } = useTreeDrag()

        startDrag('item-1')
        scheduleAutoExpand('parent-1')

        expect(isExpanded('parent-1')).toBe(false)

        vi.advanceTimersByTime(500)

        expect(isExpanded('parent-1')).toBe(true)
      })

      it('does nothing if not dragging', () => {
        const { scheduleAutoExpand, isExpanded } = useTreeDrag()

        scheduleAutoExpand('parent-1')
        vi.advanceTimersByTime(500)

        expect(isExpanded('parent-1')).toBe(false)
      })

      it('does not expand self', () => {
        const { startDrag, scheduleAutoExpand, isExpanded } = useTreeDrag()

        startDrag('item-1')
        scheduleAutoExpand('item-1') // Same as dragging item
        vi.advanceTimersByTime(500)

        expect(isExpanded('item-1')).toBe(false)
      })

      it('does not schedule if already expanded', () => {
        const { startDrag, setExpanded, scheduleAutoExpand, isExpanded } = useTreeDrag()

        startDrag('item-1')
        setExpanded('parent-1', true)

        scheduleAutoExpand('parent-1')
        // Should still be expanded after timeout (no change)
        vi.advanceTimersByTime(500)

        expect(isExpanded('parent-1')).toBe(true)
      })

      it('uses custom delay', () => {
        const { startDrag, scheduleAutoExpand, isExpanded } = useTreeDrag()

        startDrag('item-1')
        scheduleAutoExpand('parent-1', 1000)

        vi.advanceTimersByTime(500)
        expect(isExpanded('parent-1')).toBe(false)

        vi.advanceTimersByTime(500)
        expect(isExpanded('parent-1')).toBe(true)
      })

      it('cancels previous pending expand when scheduling new one', () => {
        const { startDrag, scheduleAutoExpand, isExpanded } = useTreeDrag()

        startDrag('item-1')
        scheduleAutoExpand('parent-1')

        vi.advanceTimersByTime(250)
        scheduleAutoExpand('parent-2') // Should cancel parent-1

        vi.advanceTimersByTime(250) // Total 500ms from parent-1 start
        expect(isExpanded('parent-1')).toBe(false)

        vi.advanceTimersByTime(250) // 500ms from parent-2 start
        expect(isExpanded('parent-2')).toBe(true)
      })
    })

    describe('cancelAutoExpand()', () => {
      it('cancels pending expand', () => {
        const { startDrag, scheduleAutoExpand, cancelAutoExpand, isExpanded } = useTreeDrag()

        startDrag('item-1')
        scheduleAutoExpand('parent-1')

        vi.advanceTimersByTime(250)
        cancelAutoExpand('parent-1')

        vi.advanceTimersByTime(250)
        expect(isExpanded('parent-1')).toBe(false)
      })

      it('does nothing for non-pending items', () => {
        const { cancelAutoExpand } = useTreeDrag()

        // Should not throw
        expect(() => cancelAutoExpand('unknown')).not.toThrow()
      })
    })
  })

  describe('move blocking', () => {
    describe('setMoveBlocked()', () => {
      it('sets move blocked to true', () => {
        const { setMoveBlocked, isMoveBlocked } = useTreeDrag()

        setMoveBlocked(true)

        expect(isMoveBlocked()).toBe(true)
      })

      it('sets move blocked to false', () => {
        const { setMoveBlocked, isMoveBlocked } = useTreeDrag()

        setMoveBlocked(true)
        setMoveBlocked(false)

        expect(isMoveBlocked()).toBe(false)
      })
    })

    describe('isMoveBlocked()', () => {
      it('returns false by default', () => {
        const { isMoveBlocked } = useTreeDrag()

        expect(isMoveBlocked()).toBe(false)
      })
    })

    it('endDrag clears move blocked', () => {
      const { startDrag, setMoveBlocked, endDrag, isMoveBlocked } = useTreeDrag()

      startDrag('item-1')
      setMoveBlocked(true)
      endDrag()

      expect(isMoveBlocked()).toBe(false)
    })
  })

  describe('isDescendantDrop()', () => {
    // These tests need DOM mocking which is more complex
    // We'll test the basic logic paths

    it('returns false when not dragging', () => {
      const { isDescendantDrop } = useTreeDrag()

      const mockElement = { dataset: { parentId: 'parent-1' } } as unknown as HTMLElement

      expect(isDescendantDrop(mockElement)).toBe(false)
    })

    it('returns false when dropping to root (no parentId)', () => {
      const { startDrag, isDescendantDrop } = useTreeDrag()

      startDrag('item-1')
      const mockElement = { dataset: {} } as unknown as HTMLElement

      expect(isDescendantDrop(mockElement)).toBe(false)
    })

    it('returns true when dropping into own children', () => {
      const { startDrag, isDescendantDrop } = useTreeDrag()

      startDrag('item-1')
      const mockElement = { dataset: { parentId: 'item-1' } } as unknown as HTMLElement

      expect(isDescendantDrop(mockElement)).toBe(true)
    })
  })

  describe('shared state', () => {
    it('state is shared between multiple useTreeDrag calls', () => {
      const drag1 = useTreeDrag()
      const drag2 = useTreeDrag()

      drag1.startDrag('item-1')

      expect(drag2.getDraggingId()).toBe('item-1')
      expect(drag2.isDragging('item-1')).toBe(true)
    })

    it('expanded state is shared', () => {
      const drag1 = useTreeDrag()
      const drag2 = useTreeDrag()

      drag1.setExpanded('item-1', true)

      expect(drag2.isExpanded('item-1')).toBe(true)
    })
  })

  describe('workflow: complete drag cycle', () => {
    it('handles full drag and drop cycle', () => {
      const { startDrag, setDropTarget, setExpanded, endDrag, isDragging, isDropTarget, isExpanded } = useTreeDrag()

      // Start dragging
      startDrag('item-1')
      expect(isDragging('item-1')).toBe(true)

      // Hover over potential target
      setDropTarget('parent-1')
      expect(isDropTarget('parent-1')).toBe(true)

      // Target expands
      setExpanded('parent-1', true)
      expect(isExpanded('parent-1')).toBe(true)

      // Complete the drop
      endDrag()
      expect(isDragging()).toBe(false)
      expect(isDropTarget('parent-1')).toBe(false)
    })
  })
})
