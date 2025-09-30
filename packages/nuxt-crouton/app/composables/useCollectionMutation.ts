/**
 * Collection mutation composable for Create, Update, Delete operations
 * Replaces the data-fetching parts of useCrouton with a focused mutation API
 *
 * Features:
 * - Automatic cache invalidation after mutations
 * - Toast notifications for success/error
 * - Extensive logging for debugging
 * - Room for optimistic updates (future enhancement)
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
   * Invalidate cache for this collection
   * Uses a simple approach: refresh all queries that start with "collection:[name]"
   * TODO: In production, we could track specific cache keys or use wildcard patterns
   */
  const invalidateCache = async () => {
    console.log('[useCollectionMutation] Invalidating cache for:', collection)

    // Refresh Nuxt data cache
    // This will trigger refetch for any useFetch calls with matching keys
    await refreshNuxtData(`collection:${collection}`)

    console.log('[useCollectionMutation] Cache invalidated')
  }

  /**
   * Create a new item
   */
  const create = async (data: any) => {
    const baseUrl = getApiBasePath()

    console.group('[useCollectionMutation] CREATE')
    console.log('Collection:', collection)
    console.log('API URL:', baseUrl)
    console.log('Data:', data)

    try {
      const result = await $fetch(baseUrl, {
        method: 'POST',
        body: data,
        credentials: 'include'
      })

      console.log('✅ Success:', result)
      console.groupEnd()

      // Invalidate cache to trigger refetch
      await invalidateCache()

      // Show success toast
      toast.add({
        title: 'Created successfully',
        icon: 'i-lucide-check',
        color: 'primary'
      })

      return result

    } catch (error: any) {
      console.error('❌ Error:', error)
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
    console.log('API URL:', url)
    console.log('Updates:', updates)

    try {
      const result = await $fetch(url, {
        method: 'PATCH',
        body: updates,
        credentials: 'include'
      })

      console.log('✅ Success:', result)
      console.groupEnd()

      // Invalidate cache
      await invalidateCache()

      // Show success toast
      toast.add({
        title: 'Updated successfully',
        icon: 'i-lucide-check',
        color: 'primary'
      })

      return result

    } catch (error: any) {
      console.error('❌ Error:', error)
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
    console.log('API Base URL:', baseUrl)

    try {
      // Delete each item individually
      // API expects DELETE /api/teams/[teamId]/[collection]/[id]
      await Promise.all(
        ids.map(id =>
          $fetch(`${baseUrl}/${id}`, {
            method: 'DELETE',
            credentials: 'include'
          })
        )
      )

      console.log('✅ Success: Deleted', ids.length, 'item(s)')
      console.groupEnd()

      // Invalidate cache
      await invalidateCache()

      // Show success toast
      toast.add({
        title: `Deleted ${ids.length} item(s)`,
        icon: 'i-lucide-check',
        color: 'primary'
      })

    } catch (error: any) {
      console.error('❌ Error:', error)
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