import { readonly } from 'vue'

/**
 * Simplified tree drag state management
 *
 * Handles:
 * - Track which item is being dragged (for UI feedback)
 * - Track expanded state (persists across moves)
 * - Auto-expand on hover during drag
 */

// Module-level timeout tracker (shared across all useTreeDrag() calls)
const expandTimeouts: Record<string, ReturnType<typeof setTimeout>> = {}

export function useTreeDrag() {
  // Currently dragging item ID
  const draggingId = useState<string | null>('tree-drag-id', () => null)

  // Expanded state per item - persists across drag operations
  const expandedItems = useState<Record<string, boolean>>('tree-expanded', () => ({}))

  // ============ Drag State ============

  function startDrag(id: string) {
    draggingId.value = id
  }

  function endDrag() {
    draggingId.value = null
    // Clear any pending expand timeouts
    Object.values(expandTimeouts).forEach((timeout) => clearTimeout(timeout))
    Object.keys(expandTimeouts).forEach((key) => delete expandTimeouts[key])
  }

  function isDragging(id?: string) {
    if (id) return draggingId.value === id
    return draggingId.value !== null
  }

  function getDraggingId() {
    return draggingId.value
  }

  // ============ Expanded State ============

  function isExpanded(id: string) {
    return expandedItems.value[id] === true
  }

  function setExpanded(id: string, expanded: boolean) {
    expandedItems.value[id] = expanded
  }

  function toggle(id: string) {
    expandedItems.value[id] = !expandedItems.value[id]
  }

  /**
   * Initialize expanded state for a new item
   * Only sets if not already tracked (preserves user preference)
   */
  function initExpanded(id: string, defaultExpanded: boolean) {
    if (!(id in expandedItems.value)) {
      expandedItems.value[id] = defaultExpanded
    }
  }

  // ============ Auto-Expand on Hover ============

  /**
   * Schedule auto-expand when dragging over a collapsed node
   * Cancels if drag leaves before timeout
   */
  function scheduleAutoExpand(id: string, delay = 400) {
    // Already expanded or already scheduled
    if (isExpanded(id) || expandTimeouts[id]) return

    // Not currently dragging - ignore
    if (!draggingId.value) return

    // Can't expand self
    if (draggingId.value === id) return

    expandTimeouts[id] = setTimeout(() => {
      setExpanded(id, true)
      delete expandTimeouts[id]
    }, delay)
  }

  function cancelAutoExpand(id: string) {
    if (expandTimeouts[id]) {
      clearTimeout(expandTimeouts[id])
      delete expandTimeouts[id]
    }
  }

  return {
    // State (reactive, for template bindings)
    draggingId: readonly(draggingId),

    // Drag operations
    startDrag,
    endDrag,
    isDragging,
    getDraggingId,

    // Expanded state
    isExpanded,
    setExpanded,
    toggle,
    initExpanded,

    // Auto-expand
    scheduleAutoExpand,
    cancelAutoExpand,
  }
}
