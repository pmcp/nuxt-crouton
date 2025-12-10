/**
 * Tree mutation composable for hierarchy operations
 * Handles move and reorder operations for tree-structured collections
 *
 * Features:
 * - Move nodes to new parents (or root)
 * - Reorder siblings within the same parent
 * - Automatic cache invalidation after mutations
 * - Visual feedback via row flash animation (useTreeItemState)
 * - Toast notifications for errors only
 *
 * @example
 * const { moveNode, reorderSiblings, moving } = useTreeMutation('pages')
 *
 * // Move a page to a new parent
 * await moveNode('page-id', 'new-parent-id', 2)
 *
 * // Move to root level
 * await moveNode('page-id', null, 0)
 *
 * // Reorder siblings
 * await reorderSiblings([
 *   { id: 'page-1', order: 0 },
 *   { id: 'page-2', order: 1 },
 *   { id: 'page-3', order: 2 }
 * ])
 */
export function useTreeMutation(collection: string) {
  const route = useRoute()
  const toast = useToast()
  const collections = useCollections()
  const config = collections.getConfig(collection)
  const { getTeamId } = useTeamContext()
  const { markSaving, markSaved, markError, triggerCountFlash } = useTreeItemState()

  if (!config) {
    console.error(`[useTreeMutation] Collection "${collection}" not found in registry`)
    throw new Error(`Collection "${collection}" not registered`)
  }

  const apiPath = config.apiPath || collection

  // Track loading state
  const moving = ref(false)
  const reordering = ref(false)

  /**
   * Get the correct API base path for the current context
   */
  const getApiBasePath = () => {
    if (route.path.includes('/super-admin/')) {
      return `/api/super-admin/${apiPath}`
    }

    const teamId = getTeamId()
    if (!teamId) {
      console.error('[useTreeMutation] Team context required but not available')
      throw new Error('Team context required for this operation')
    }

    return `/api/teams/${teamId}/${apiPath}`
  }

  /**
   * Invalidate cache for this collection (triggers refetch in all views)
   */
  const invalidateCache = async () => {
    console.log('[useTreeMutation] Invalidating cache for:', collection)
    const baseCacheKey = `collection:${collection}:{}`
    await refreshNuxtData(baseCacheKey)
    console.log('[useTreeMutation] ✅ Cache refreshed!')
  }

  /**
   * Move a node to a new parent and/or position
   *
   * @param id - The ID of the item to move
   * @param newParentId - The new parent ID (null for root level)
   * @param newOrder - The new order position within the parent
   */
  const moveNode = async (
    id: string,
    newParentId: string | null,
    newOrder: number
  ): Promise<void> => {
    const baseUrl = getApiBasePath()
    const url = `${baseUrl}/${id}/move`

    console.group('[useTreeMutation] MOVE NODE')
    console.log('Collection:', collection)
    console.log('Item ID:', id)
    console.log('New Parent ID:', newParentId)
    console.log('New Order:', newOrder)

    moving.value = true
    markSaving(id)

    try {
      await $fetch(url, {
        method: 'PATCH',
        body: {
          parentId: newParentId,
          order: newOrder
        },
        credentials: 'include'
      })

      console.log('✅ Move successful')

      // Visual feedback via row flash animation - call BEFORE cache invalidation
      // so the state is set before the tree re-renders
      markSaved(id)

      // Flash the child count badge on the new parent (if not root)
      if (newParentId) {
        triggerCountFlash(newParentId)
      }

      // Emit hook for event tracking
      const nuxtApp = useNuxtApp()
      await nuxtApp.hooks.callHook('crouton:mutation', {
        operation: 'move',
        collection,
        itemId: id,
        data: { parentId: newParentId, order: newOrder }
      })

      // Invalidate cache to trigger refetch
      await invalidateCache()

      console.groupEnd()
    } catch (error: any) {
      console.error('❌ Move failed:', error)
      console.groupEnd()

      markError(id)

      const errorMessage = error.data?.message || error.data || 'Move failed'

      toast.add({
        title: 'Move failed',
        description: errorMessage,
        icon: 'i-lucide-octagon-alert',
        color: 'error'
      })

      throw error
    } finally {
      moving.value = false
    }
  }

  /**
   * Reorder siblings within the same parent
   *
   * @param updates - Array of { id, order } objects
   */
  const reorderSiblings = async (
    updates: Array<{ id: string; order: number }>
  ): Promise<void> => {
    const baseUrl = getApiBasePath()
    const url = `${baseUrl}/reorder`

    console.group('[useTreeMutation] REORDER SIBLINGS')
    console.log('Collection:', collection)
    console.log('Updates:', updates)

    reordering.value = true

    try {
      await $fetch(url, {
        method: 'PATCH',
        body: { updates },
        credentials: 'include'
      })

      console.log('✅ Reorder successful')

      // Emit hook for event tracking
      const nuxtApp = useNuxtApp()
      await nuxtApp.hooks.callHook('crouton:mutation', {
        operation: 'reorder',
        collection,
        data: { updates }
      })

      // Invalidate cache to trigger refetch
      await invalidateCache()

      console.groupEnd()

      // Visual feedback via row flash animation for all reordered items
      updates.forEach(update => markSaved(update.id))
    } catch (error: any) {
      console.error('❌ Reorder failed:', error)
      console.groupEnd()

      const errorMessage = error.data?.message || error.data || 'Reorder failed'

      toast.add({
        title: 'Reorder failed',
        description: errorMessage,
        icon: 'i-lucide-octagon-alert',
        color: 'error'
      })

      throw error
    } finally {
      reordering.value = false
    }
  }

  return {
    moveNode,
    reorderSiblings,
    moving: readonly(moving),
    reordering: readonly(reordering)
  }
}
