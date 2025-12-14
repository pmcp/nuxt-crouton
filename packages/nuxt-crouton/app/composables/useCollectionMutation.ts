/**
 * Collection mutation composable for Create, Update, Delete operations
 * Replaces the data-fetching parts of useCrouton with a focused mutation API
 *
 * Features:
 * - Automatic cache invalidation after mutations (triggers refetch in all views)
 * - Supports queries with parameters (e.g., { eventId: '123' }) - v3.0
 * - Toast notifications for success/error
 * - Works with Nuxt's query-based cache system
 * - Extensive logging for debugging
 *
 * How it works:
 * 1. Performs the API mutation (POST/PATCH/DELETE)
 * 2. Queries nuxtApp.payload.data to find ALL cache keys for the collection
 * 3. Refreshes all matching keys (including those with query parameters)
 * 4. UI updates with fresh data from the server
 *
 * @example
 * const { create, update, deleteItems } = useCollectionMutation('adminRoles')
 *
 * // Create
 * await create({ name: 'New Role' })
 *
 * // Update
 * await update('role-id', { name: 'Updated Name' })
 *
 * // Delete
 * await deleteItems(['id1', 'id2'])
 */
export function useCollectionMutation(collection: string) {
  const route = useRoute()
  const toast = useToast()
  const collections = useCollections()
  const config = collections.getConfig(collection)
  const { getTeamId } = useTeamContext()

  if (!config) {
    console.error(`[useCollectionMutation] Collection "${collection}" not found in registry`)
    throw new Error(`Collection "${collection}" not registered`)
  }

  const apiPath = config.apiPath || collection

  // Helper to get the correct API base path
  const getApiBasePath = () => {
    if (route.path.includes('/super-admin/')) {
      return `/api/super-admin/${apiPath}`
    }

    const teamId = getTeamId()
    if (!teamId) {
      console.error('[useCollectionMutation] Team context required but not available')
      throw new Error('Team context required for this operation')
    }

    return `/api/teams/${teamId}/${apiPath}`
  }

  /**
   * Invalidate cache for this collection (triggers refetch in all views)
   * Finds ALL cache keys for this collection (including those with query params) and refreshes them
   * Optionally refreshes individual item caches when item IDs are provided
   *
   * @param itemIds - Optional item ID(s) to invalidate individual item caches
   * @param refreshCollection - Whether to refresh the entire collection (default: true for create/delete, false for update)
   * @param mutationData - Optional mutation data to extract referenced item IDs for cache invalidation
   */
  const invalidateCache = async (
    itemIds?: string | string[],
    refreshCollection: boolean = true,
    mutationData?: any
  ) => {
    console.log('[useCollectionMutation v3.0] Invalidating cache for:', collection)
    console.log('[useCollectionMutation v3.0] DEBUG - itemIds received:', itemIds, 'type:', typeof itemIds)
    console.log('[useCollectionMutation v3.0] DEBUG - refreshCollection:', refreshCollection)

    // Refresh ALL cache keys for this collection (supports queries with parameters)
    // Queries Nuxt's payload.data to find all matching keys
    if (refreshCollection) {
      const nuxtApp = useNuxtApp()
      const prefix = `collection:${collection}:`

      // Get all matching keys from Nuxt's async data
      const allKeys = Object.keys(nuxtApp.payload.data)
      const matchingKeys = allKeys.filter(key => key.startsWith(prefix))

      console.log('[useCollectionMutation v3.0] Refreshing collection cache keys:', matchingKeys)

      // Refresh all queries for this collection
      await Promise.all(matchingKeys.map(key => refreshNuxtData(key)))
    }

    // Refresh individual item caches if IDs provided - for detail views (e.g., CroutonCardMini)
    if (itemIds) {
      const ids = Array.isArray(itemIds) ? itemIds : [itemIds]
      for (const id of ids) {
        const itemCacheKey = `collection-item:${collection}:${id}`
        console.log('[useCollectionMutation v3.0] Refreshing item cache key:', itemCacheKey)
        await refreshNuxtData(itemCacheKey)
      }
    }

    // AUTO-REFRESH REFERENCED COLLECTIONS
    // If this collection declares references and mutation data is provided,
    // refresh the item caches for referenced collections
    if (config?.references && mutationData) {
      console.log('[useCollectionMutation v3.0] Processing references:', config.references)

      for (const [field, refCollection] of Object.entries(config.references)) {
        const refId = mutationData[field]

        if (refId && typeof refId === 'string') {
          const refCacheKey = `collection-item:${refCollection}:${refId}`
          console.log('[useCollectionMutation v3.0] Refreshing referenced item cache:', refCacheKey)
          await refreshNuxtData(refCacheKey)
        } else if (Array.isArray(refId)) {
          // Handle array references (e.g., multiple IDs)
          for (const id of refId) {
            if (id && typeof id === 'string') {
              const refCacheKey = `collection-item:${refCollection}:${id}`
              console.log('[useCollectionMutation v3.0] Refreshing referenced item cache:', refCacheKey)
              await refreshNuxtData(refCacheKey)
            }
          }
        }
      }
    }

    console.log('[useCollectionMutation v3.0] ✅ Cache refreshed!')
  }

  /**
   * Create a new item
   */
  const create = async (data: any) => {
    const baseUrl = getApiBasePath()

    console.group('[useCollectionMutation] CREATE')
    console.log('Collection:', collection)
    console.log('Data:', data)

    try {
      const result = await $fetch(baseUrl, {
        method: 'POST',
        body: data,
        credentials: 'include'
      })

      console.log('✅ API Success:', result)

      // Emit hook for event tracking (zero overhead if no listeners)
      const nuxtApp = useNuxtApp()
      await nuxtApp.hooks.callHook('crouton:mutation', {
        operation: 'create',
        collection,
        itemId: result.id,
        data,
        result
      })

      // Invalidate cache to trigger refetch in all views
      // Pass mutation data to refresh referenced item caches
      await invalidateCache(undefined, true, data)

      console.groupEnd()

      toast.add({
        title: 'Created successfully',
        icon: 'i-lucide-check',
        color: 'primary'
      })

      return result

    } catch (error: any) {
      console.error('❌ API Error:', error)
      console.groupEnd()

      const errorMessage = error.data?.message || error.data || 'Creation failed'

      toast.add({
        title: 'Creation failed',
        description: errorMessage,
        icon: 'i-lucide-octagon-alert',
        color: 'primary'
      })

      throw error
    }
  }

  /**
   * Update an existing item
   */
  const update = async (id: string, updates: any) => {
    const baseUrl = getApiBasePath()
    const url = `${baseUrl}/${id}`

    console.group('[useCollectionMutation] UPDATE')
    console.log('Collection:', collection)
    console.log('Item ID:', id)
    console.log('Updates:', updates)

    try {
      const result = await $fetch(url, {
        method: 'PATCH',
        body: updates,
        credentials: 'include'
      })

      console.log('✅ API Success:', result)

      // Emit hook for event tracking (zero overhead if no listeners)
      const nuxtApp = useNuxtApp()
      await nuxtApp.hooks.callHook('crouton:mutation', {
        operation: 'update',
        collection,
        itemId: id,
        updates,
        result
      })

      // Invalidate both the item cache AND the collection to refresh list views
      // Pass mutation data to refresh referenced item caches
      await invalidateCache(id, true, updates)

      console.groupEnd()

      toast.add({
        title: 'Updated successfully',
        icon: 'i-lucide-check',
        color: 'primary'
      })

      return result

    } catch (error: any) {
      console.error('❌ API Error:', error)
      console.groupEnd()

      const errorMessage = error.data?.message || error.data || 'Update failed'

      toast.add({
        title: 'Update failed',
        description: errorMessage,
        icon: 'i-lucide-octagon-alert',
        color: 'primary'
      })

      throw error
    }
  }

  /**
   * Delete one or more items
   */
  const deleteItems = async (ids: string[]) => {
    const baseUrl = getApiBasePath()

    console.group('[useCollectionMutation] DELETE')
    console.log('Collection:', collection)
    console.log('Item IDs:', ids)

    try {
      // Delete each item individually
      await Promise.all(
        ids.map(id =>
          $fetch(`${baseUrl}/${id}`, {
            method: 'DELETE',
            credentials: 'include'
          })
        )
      )

      console.log('✅ API Success: Deleted', ids.length, 'item(s)')

      // Emit hook for event tracking (zero overhead if no listeners)
      const nuxtApp = useNuxtApp()
      await nuxtApp.hooks.callHook('crouton:mutation', {
        operation: 'delete',
        collection,
        itemIds: ids
      })

      // Invalidate cache to trigger refetch (includes individual item caches)
      await invalidateCache(ids)

      console.groupEnd()

      toast.add({
        title: `Deleted ${ids.length} item(s)`,
        icon: 'i-lucide-check',
        color: 'primary'
      })

    } catch (error: any) {
      console.error('❌ API Error:', error)
      console.groupEnd()

      const errorMessage = error.data?.message || error.data || 'Delete failed'

      toast.add({
        title: 'Delete failed',
        description: errorMessage,
        icon: 'i-lucide-octagon-alert',
        color: 'primary'
      })

      throw error
    }
  }

  return {
    create,
    update,
    deleteItems,
    // Alias for compatibility
    delete: deleteItems
  }
}