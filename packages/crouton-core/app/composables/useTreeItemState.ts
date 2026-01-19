/**
 * Shared state composable for tracking tree item save states
 * Used to show visual feedback (flash animation) when items are moved/saved
 *
 * Uses useState for consistency with useTreeDrag and proper Nuxt SSR handling
 */

export function useTreeItemState() {
  const saving = useState<Record<string, boolean>>('tree-item-saving', () => ({}))
  // Store timestamp when item was saved - allows animation to trigger on re-render
  const savedAt = useState<Record<string, number>>('tree-item-saved-at', () => ({}))
  // Track items whose child count is currently flashing
  const flashingCounts = useState<Record<string, boolean>>('tree-item-flashing-counts', () => ({}))

  /**
   * Mark an item as currently being saved (API call in progress)
   */
  function markSaving(id: string) {
    saving.value[id] = true
  }

  /**
   * Mark an item as saved (triggers flash animation)
   * Automatically clears after animation duration
   */
  function markSaved(id: string) {
    // Remove from saving
    delete saving.value[id]

    // Store timestamp when saved (triggers flash)
    savedAt.value[id] = Date.now()

    // Clear after animation completes (~800ms for visibility)
    setTimeout(() => {
      delete savedAt.value[id]
    }, 1000)
  }

  /**
   * Mark an item as failed (removes from saving state)
   */
  function markError(id: string) {
    delete saving.value[id]
  }

  /**
   * Check if an item is currently being saved
   */
  function isSaving(id: string) {
    return !!saving.value[id]
  }

  /**
   * Check if an item was just saved (for flash animation)
   * Returns true if saved within the last 1000ms
   */
  function wasSaved(id: string) {
    const timestamp = savedAt.value[id]
    if (!timestamp) return false
    // Consider "saved" if within 1 second
    return Date.now() - timestamp < 1000
  }

  /**
   * Trigger a flash animation on an item's child count badge
   */
  function triggerCountFlash(id: string) {
    flashingCounts.value[id] = true
    setTimeout(() => {
      delete flashingCounts.value[id]
    }, 600)
  }

  return {
    markSaving,
    markSaved,
    markError,
    isSaving,
    wasSaved,
    flashingCounts,
    triggerCountFlash
  }
}
