// Shared state for tree drag-drop operations
// Uses useState for proper Nuxt global state sharing

export function useTreeDragState() {
  const draggingId = useState<string | null>('tree-dragging-id', () => null)
  const hoveringOverId = useState<string | null>('tree-hovering-over-id', () => null)
  const dropHandledByRow = useState<boolean>('tree-drop-handled-by-row', () => false)
  // Track expanded state per item ID - persists across moves
  // Using Record for proper Vue reactivity (Set mutations don't trigger updates)
  const expandedItems = useState<Record<string, boolean>>('tree-expanded-items', () => ({}))

  function setDragging(id: string | null) {
    draggingId.value = id
    // Clear hover when drag ends
    if (id === null) {
      hoveringOverId.value = null
      dropHandledByRow.value = false
    }
  }

  function setHoveringOver(id: string | null) {
    hoveringOverId.value = id
  }

  function setDropHandledByRow(handled: boolean) {
    dropHandledByRow.value = handled
  }

  function getDraggingId() {
    return draggingId.value
  }

  function wasDropHandledByRow() {
    return dropHandledByRow.value
  }

  // Expanded state management - persists across moves
  function isItemExpanded(id: string) {
    return expandedItems.value[id] === true
  }

  function setItemExpanded(id: string, expanded: boolean) {
    expandedItems.value[id] = expanded
  }

  function hasExpandedState(id: string) {
    // Check if we've ever tracked this item's state
    return id in expandedItems.value
  }

  function initItemExpanded(id: string, hasChildren: boolean) {
    // Only set default expanded state if we haven't tracked this item before
    if (!(id in expandedItems.value)) {
      // First time seeing this item - expand if has children
      expandedItems.value[id] = hasChildren
    }
  }

  function markCollapsed(id: string) {
    expandedItems.value[id] = false
  }

  function markExpanded(id: string) {
    expandedItems.value[id] = true
  }

  return {
    draggingId,
    hoveringOverId,
    setDragging,
    setHoveringOver,
    setDropHandledByRow,
    getDraggingId,
    wasDropHandledByRow,
    isItemExpanded,
    setItemExpanded,
    hasExpandedState,
    initItemExpanded,
    markCollapsed,
    markExpanded
  }
}