/**
 * Collection mutation composable for Create, Update, Delete operations
 * Replaces the data-fetching parts of useCrouton with a focused mutation API
 *
 * Features:
 * - Automatic cache invalidation after mutations (triggers refetch in all views)
 * - Toast notifications for success/error
 * - Works with Nuxt's query-based cache system
 * - Extensive logging for debugging
 *
 * How it works:
 * 1. Performs the API mutation (POST/PATCH/DELETE)
 * 2. Invalidates all cache keys matching `collection:${name}:*`
 * 3. Nuxt automatically refetches data in all active useCollectionQuery calls
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
    return `/api/teams/${route.params.team}/${apiPath}`
  }

  /**
   * Invalidate cache for this collection (triggers refetch in all views)
   * Refreshes the base cache key (no query params) which is used by most list views
   */
  const invalidateCache = async () => {
    console.log('[useCollectionMutation v2.0] Invalidating cache for:', collection)

    // Refresh the base cache key (empty query params)
    const baseCacheKey = `collection:${collection}:{}`
    console.log('[useCollectionMutation v2.0] Refreshing cache key:', baseCacheKey)

    await refreshNuxtData(baseCacheKey)

    console.log('[useCollectionMutation v2.0] ✅ Cache refreshed!')
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

      // Invalidate cache to trigger refetch in all views
      await invalidateCache()

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

      // Invalidate cache to trigger refetch
      await invalidateCache()

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

      // Invalidate cache to trigger refetch
      await invalidateCache()

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