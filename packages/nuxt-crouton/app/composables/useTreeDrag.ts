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

// Track which items were auto-expanded during this drag (to collapse them later)
let autoExpandedIds: Set<string> = new Set()

// Track whether the move is blocked (set by onMove, read by onEnd)
let moveBlocked = false

export function useTreeDrag() {
  // Currently dragging item ID
  const draggingId = useState<string | null>('tree-drag-id', () => null)

  // Current drop target parent ID (for highlighting the target line)
  const dropTargetId = useState<string | null>('tree-drop-target', () => null)

  // Expanded state per item - persists across drag operations
  const expandedItems = useState<Record<string, boolean>>('tree-expanded', () => ({}))

  // ============ Drag State ============

  function startDrag(id: string) {
    draggingId.value = id
  }

  function endDrag() {
    draggingId.value = null
    dropTargetId.value = null
    moveBlocked = false
    // Clear any pending expand timeouts
    Object.values(expandTimeouts).forEach((timeout) => clearTimeout(timeout))
    Object.keys(expandTimeouts).forEach((key) => delete expandTimeouts[key])
    // Collapse all auto-expanded items
    for (const id of autoExpandedIds) {
      expandedItems.value[id] = false
    }
    autoExpandedIds.clear()
  }

  function isDragging(id?: string) {
    if (id) return draggingId.value === id
    return draggingId.value !== null
  }

  function getDraggingId() {
    return draggingId.value
  }

  // ============ Drop Target ============

  function setDropTarget(id: string | null) {
    dropTargetId.value = id
  }

  function isDropTarget(id: string) {
    return dropTargetId.value === id
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
   * Uses a delay to avoid breaking SortableJS with Vue re-renders
   */
  function scheduleAutoExpand(id: string, delay = 500) {
    // Not currently dragging - ignore
    if (!draggingId.value) return

    // Can't expand self
    if (draggingId.value === id) return

    // Already expanded or already scheduled
    if (isExpanded(id) || expandTimeouts[id]) return

    // Cancel any pending timeouts for other items
    Object.keys(expandTimeouts).forEach((key) => {
      if (key !== id) {
        clearTimeout(expandTimeouts[key])
        delete expandTimeouts[key]
      }
    })

    expandTimeouts[id] = setTimeout(() => {
      // Double-check we're still dragging
      if (!draggingId.value) {
        delete expandTimeouts[id]
        return
      }
      setExpanded(id, true)
      autoExpandedIds.add(id)
      delete expandTimeouts[id]
    }, delay)
  }

  function cancelAutoExpand(id: string) {
    if (expandTimeouts[id]) {
      clearTimeout(expandTimeouts[id])
      delete expandTimeouts[id]
    }
  }

  // ============ Move Blocking ============

  function setMoveBlocked(blocked: boolean) {
    moveBlocked = blocked
  }

  function isMoveBlocked() {
    return moveBlocked
  }

  // ============ Descendant Check ============

  /**
   * Check if dropping to the target container would create a circular reference
   * (i.e., trying to drop an item into its own descendant)
   *
   * Simple approach: read the target's data-path attribute directly from DOM
   * and check if it contains the dragged item's ID.
   *
   * @param targetContainer - The container element we're trying to drop into
   * @returns true if the move is invalid (would create circular reference)
   */
  function isDescendantDrop(targetContainer: HTMLElement): boolean {
    const dragId = draggingId.value

    if (!dragId) {
      return false
    }

    // The target container has data-parent-id attribute
    const targetParentId = targetContainer.dataset.parentId

    // If dropping into root (empty parentId), always allowed
    if (!targetParentId) {
      return false
    }

    // If dropping directly into the dragged item's children container
    if (targetParentId === dragId) {
      console.log('[isDescendantDrop] BLOCKED: dropping into own children')
      return true
    }

    // Find the target parent's element and check its path
    const targetParentEl = document.querySelector(`[data-id="${targetParentId}"]`)
    if (!targetParentEl) {
      return false
    }

    // Get the path from the data attribute
    const targetPath = (targetParentEl as HTMLElement).dataset.path
    if (!targetPath) {
      return false
    }

    // If target's path contains the dragged item's ID, it's a descendant
    // Path format is like: /grandparentId/parentId/itemId/
    if (targetPath.includes(`/${dragId}/`)) {
      console.log('[isDescendantDrop] BLOCKED: target is a descendant. targetPath:', targetPath, 'dragId:', dragId)
      return true
    }

    return false
  }

  return {
    // State (reactive, for template bindings)
    draggingId: readonly(draggingId),
    dropTargetId: readonly(dropTargetId),

    // Drag operations
    startDrag,
    endDrag,
    isDragging,
    getDraggingId,

    // Drop target
    setDropTarget,
    isDropTarget,

    // Expanded state
    isExpanded,
    setExpanded,
    toggle,
    initExpanded,

    // Auto-expand
    scheduleAutoExpand,
    cancelAutoExpand,

    // Move blocking
    setMoveBlocked,
    isMoveBlocked,

    // Validation
    isDescendantDrop,
  }
}
