/**
 * Tracks text selection within a container element.
 * Returns the selected text and its bounding rect for positioning a floating action.
 */
export function useTextSelection(containerRef: Ref<HTMLElement | null>) {
  const selectedText = ref('')
  const selectionRect = ref<{ top: number; left: number; width: number } | null>(null)

  const hasSelection = computed(() => selectedText.value.length >= 3)

  function update() {
    const container = containerRef.value
    if (!container) {
      selectedText.value = ''
      selectionRect.value = null
      return
    }

    const selection = window.getSelection()
    if (!selection || selection.isCollapsed || !selection.rangeCount) {
      selectedText.value = ''
      selectionRect.value = null
      return
    }

    // Check if selection is within our container
    const range = selection.getRangeAt(0)
    if (!container.contains(range.commonAncestorContainer)) {
      selectedText.value = ''
      selectionRect.value = null
      return
    }

    const text = selection.toString().trim()
    if (text.length < 3) {
      selectedText.value = ''
      selectionRect.value = null
      return
    }

    selectedText.value = text

    // Position relative to the container
    const rangeRect = range.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()

    selectionRect.value = {
      top: rangeRect.bottom - containerRect.top + 4,
      left: rangeRect.left - containerRect.left,
      width: rangeRect.width,
    }
  }

  function clearSelection() {
    selectedText.value = ''
    selectionRect.value = null
    window.getSelection()?.removeAllRanges()
  }

  useEventListener('mouseup', () => nextTick(update))
  useEventListener('keyup', () => nextTick(update))

  return { selectedText, selectionRect, hasSelection, clearSelection }
}
