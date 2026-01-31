/**
 * Reorder mode composable for the pages sidebar.
 *
 * When active, drag-drop moves are local-only (no API calls).
 * A floating action bar shows pending changes with Publish/Discard buttons.
 * Publish sends all moves to the server; Discard reverts to the last-saved state.
 */
export function useReorderMode() {
  const isActive = ref(false)
  const originalSnapshot = ref<Record<string, any>[]>([])
  const localPages = ref<Record<string, any>[]>([])
  const publishing = ref(false)

  /**
   * Activate reorder mode — snapshot current pages as immutable reference.
   */
  function activate(pages: any[]) {
    originalSnapshot.value = structuredClone(toRaw(pages))
    localPages.value = structuredClone(toRaw(pages))
    isActive.value = true
  }

  /**
   * Deactivate reorder mode — clear all state.
   */
  function deactivate() {
    isActive.value = false
    originalSnapshot.value = []
    localPages.value = []
  }

  /**
   * Apply a local move (no API call).
   * Updates parentId and order on the local copy, then re-indexes affected siblings.
   */
  function applyLocalMove(id: string, newParentId: string | null, newOrder: number) {
    const items = localPages.value
    const item = items.find((p: any) => p.id === id)
    if (!item) return

    const oldParentId = item.parentId ?? null

    // Remove from old siblings order
    const oldSiblings = items
      .filter((p: any) => (p.parentId ?? null) === oldParentId && p.id !== id)
      .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
    oldSiblings.forEach((s: any, i: number) => { s.order = i })

    // Update the moved item
    item.parentId = newParentId
    item.order = newOrder

    // Re-index new siblings (insert at newOrder position)
    const newSiblings = items
      .filter((p: any) => (p.parentId ?? null) === newParentId && p.id !== id)
      .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))

    // Insert the moved item at the correct position
    newSiblings.splice(newOrder, 0, item)
    newSiblings.forEach((s: any, i: number) => { s.order = i })

    // Trigger reactivity
    localPages.value = [...items]
  }

  /**
   * Compute pending changes — items where parentId or order differ from snapshot.
   */
  const pendingChanges = computed(() => {
    if (!isActive.value) return []

    const snapshotMap = new Map(
      originalSnapshot.value.map((p: any) => [p.id, p])
    )

    return localPages.value.filter((p: any) => {
      const orig = snapshotMap.get(p.id)
      if (!orig) return false
      return (p.parentId ?? null) !== (orig.parentId ?? null)
        || (p.order ?? 0) !== (orig.order ?? 0)
    }).map((p: any) => ({
      id: p.id,
      parentId: p.parentId ?? null,
      order: p.order ?? 0
    }))
  })

  const changeCount = computed(() => pendingChanges.value.length)
  const hasChanges = computed(() => changeCount.value > 0)

  /**
   * Discard all local changes — replace localPages with a fresh clone of the snapshot.
   */
  function discard() {
    localPages.value = structuredClone(toRaw(originalSnapshot.value))
  }

  /**
   * Publish pending changes — call moveNode for each changed item, then deactivate.
   */
  async function publish(moveNodeFn: (id: string, parentId: string | null, order: number) => Promise<void>) {
    publishing.value = true
    try {
      for (const change of pendingChanges.value) {
        await moveNodeFn(change.id, change.parentId, change.order)
      }
      deactivate()
    } finally {
      publishing.value = false
    }
  }

  return {
    isActive: readonly(isActive),
    localPages: readonly(localPages),
    publishing: readonly(publishing),
    pendingChanges,
    changeCount,
    hasChanges,
    activate,
    deactivate,
    applyLocalMove,
    discard,
    publish
  }
}
