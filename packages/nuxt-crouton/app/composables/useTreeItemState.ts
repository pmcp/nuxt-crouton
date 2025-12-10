/**
 * Shared state composable for tracking tree item save states
 * Used to show visual feedback (flash animation) when items are moved/saved
 *
 * Uses useState for consistency with useTreeDragState and proper Nuxt SSR handling
 */

export function useTreeItemState() {
  const saving = useState<Record<string, boolean>>('tree-item-saving', () => ({}))
  const saved = useState<Record<string, boolean>>('tree-item-saved', () => ({}))

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

    // Add to saved (triggers flash)
    saved.value[id] = true

    // Clear after animation completes (~800ms for visibility)
    setTimeout(() => {
      delete saved.value[id]
    }, 800)
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
   */
  function wasSaved(id: string) {
    return !!saved.value[id]
  }

  return {
    markSaving,
    markSaved,
    markError,
    isSaving,
    wasSaved,
  }
}
