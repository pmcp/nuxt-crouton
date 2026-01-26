import type { ComputedRef } from 'vue'
import type { CollectionTypeMap, CollectionItem, CollectionFormData, CollectionName } from '#crouton/types'

/**
 * Generate a unique correlation ID for mutation tracking
 * Format: crtn_{timestamp}_{random}
 */
function generateCorrelationId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 10)
  return `crtn_${timestamp}_${random}`
}

/**
 * Return type for collection mutations
 */
interface CollectionMutationReturn<K extends CollectionName> {
  create: (data: CollectionFormData<K>) => Promise<CollectionItem<K>>
  update: (id: string, updates: Partial<CollectionFormData<K>>) => Promise<CollectionItem<K>>
  deleteItems: (ids: string[]) => Promise<void>
  delete: (ids: string[]) => Promise<void>
  /** Whether team context is available (required for mutations) */
  isReady: ComputedRef<boolean>
}

/**
 * Collection mutation composable for Create, Update, Delete operations
 * Replaces the data-fetching parts of useCrouton with a focused mutation API
 *
 * Features:
 * - Automatic cache invalidation after mutations (triggers refetch in all views)
 * - Supports queries with parameters (e.g., { eventId: '123' }) - v3.0
 * - Toast notifications for success/error
 * - Works with Nuxt's query-based cache system
 * - Type-safe: Only registered collections are allowed
 * - Extensive logging for debugging
 *
 * How it works:
 * 1. Performs the API mutation (POST/PATCH/DELETE)
 * 2. Queries nuxtApp.payload.data to find ALL cache keys for the collection
 * 3. Refreshes all matching keys (including those with query parameters)
 * 4. UI updates with fresh data from the server
 *
 * @example
 * // Type-safe usage - types are automatically inferred
 * const { create, update, deleteItems } = useCollectionMutation('blogPosts')
 * await create({ title: 'Hello', slug: 'hello' }) // Typed input!
 *
 * @example
 * // Update and delete
 * await update('role-id', { name: 'Updated Name' })
 * await deleteItems(['id1', 'id2'])
 */
export function useCollectionMutation<K extends CollectionName>(
  collection: K
): CollectionMutationReturn<K> {
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

  // Check if team context is available (for super-admin routes, always ready)
  const isReady = computed(() => {
    if (route.path.includes('/super-admin/')) return true
    return !!getTeamId()
  })

  // Helper to get the correct API base path
  const getApiBasePath = () => {
    if (route.path.includes('/super-admin/')) {
      return `/api/super-admin/${apiPath}`
    }

    const teamId = getTeamId()
    if (!teamId) {
      console.warn('[useCollectionMutation] Team context not yet available - waiting for auth to load')
      throw new Error('Team context not yet available. Please wait for authentication to complete.')
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
    // Refresh ALL cache keys for this collection (supports queries with parameters)
    // Queries Nuxt's payload.data to find all matching keys
    if (refreshCollection) {
      const nuxtApp = useNuxtApp()
      const prefix = `collection:${collection}:`

      // Get all matching keys from Nuxt's async data
      const allKeys = Object.keys(nuxtApp.payload.data)
      const matchingKeys = allKeys.filter(key => key.startsWith(prefix))

      // Refresh all queries for this collection
      await Promise.all(matchingKeys.map(key => refreshNuxtData(key)))
    }

    // Refresh individual item caches if IDs provided - for detail views (e.g., CroutonCardMini)
    if (itemIds) {
      const ids = Array.isArray(itemIds) ? itemIds : [itemIds]
      for (const id of ids) {
        const itemCacheKey = `collection-item:${collection}:${id}`
        await refreshNuxtData(itemCacheKey)
      }
    }

    // AUTO-REFRESH REFERENCED COLLECTIONS
    // If this collection declares references and mutation data is provided,
    // refresh the item caches for referenced collections
    if (config?.references && mutationData) {
      for (const [field, refCollection] of Object.entries(config.references)) {
        const refId = mutationData[field]

        if (refId && typeof refId === 'string') {
          const refCacheKey = `collection-item:${refCollection}:${refId}`
          await refreshNuxtData(refCacheKey)
        } else if (Array.isArray(refId)) {
          // Handle array references (e.g., multiple IDs)
          for (const id of refId) {
            if (id && typeof id === 'string') {
              const refCacheKey = `collection-item:${refCollection}:${id}`
              await refreshNuxtData(refCacheKey)
            }
          }
        }
      }
    }
  }

  /**
   * Create a new item
   */
  const create = async (data: any) => {
    const baseUrl = getApiBasePath()
    const correlationId = generateCorrelationId()
    const timestamp = Date.now()

    try {
      const result = await $fetch<{ id: string; [key: string]: any }>(baseUrl, {
        method: 'POST',
        body: data,
        credentials: 'include'
      })

      // Emit hook for event tracking (zero overhead if no listeners)
      const nuxtApp = useNuxtApp()
      await nuxtApp.hooks.callHook('crouton:mutation', {
        operation: 'create',
        collection,
        itemId: result.id,
        data,
        result,
        correlationId,
        timestamp
      })

      // Invalidate cache to trigger refetch in all views
      // Pass mutation data to refresh referenced item caches
      await invalidateCache(undefined, true, data)

      toast.add({
        title: 'Created successfully',
        icon: 'i-lucide-check',
        color: 'primary'
      })

      return result
    } catch (error: any) {
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
   * Fetches the item before updating to enable beforeData tracking for change diffs
   */
  const update = async (id: string, updates: any) => {
    const baseUrl = getApiBasePath()
    const url = `${baseUrl}/${id}`
    const correlationId = generateCorrelationId()
    const timestamp = Date.now()

    // Fetch the current item state before applying updates (for change tracking)
    // Uses query-based fetch (?ids=) to match generated endpoint pattern
    let beforeData: Record<string, unknown> | undefined
    try {
      const items = await $fetch<Record<string, unknown>[]>(baseUrl, {
        method: 'GET',
        query: { ids: id },
        credentials: 'include'
      })
      beforeData = Array.isArray(items) ? items[0] : items
    } catch (_fetchError) {
      // Non-critical: continue with update even if we can't fetch beforeData
    }

    try {
      const result = await $fetch(url, {
        method: 'PATCH',
        body: updates,
        credentials: 'include'
      })

      // Emit hook for event tracking (zero overhead if no listeners)
      // Include beforeData for change diff calculation
      const nuxtApp = useNuxtApp()
      await nuxtApp.hooks.callHook('crouton:mutation', {
        operation: 'update',
        collection,
        itemId: id,
        updates,
        result,
        beforeData,
        correlationId,
        timestamp
      })

      // Invalidate both the item cache AND the collection to refresh list views
      // Pass mutation data to refresh referenced item caches
      await invalidateCache(id, true, updates)

      toast.add({
        title: 'Updated successfully',
        icon: 'i-lucide-check',
        color: 'primary'
      })

      return result
    } catch (error: any) {
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
    const correlationId = generateCorrelationId()
    const timestamp = Date.now()

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

      // Emit hook for event tracking (zero overhead if no listeners)
      const nuxtApp = useNuxtApp()
      await nuxtApp.hooks.callHook('crouton:mutation', {
        operation: 'delete',
        collection,
        itemIds: ids,
        correlationId,
        timestamp
      })

      // Invalidate cache to trigger refetch (includes individual item caches)
      await invalidateCache(ids)

      toast.add({
        title: `Deleted ${ids.length} item(s)`,
        icon: 'i-lucide-check',
        color: 'primary'
      })
    } catch (error: any) {
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
    delete: deleteItems,
    // Team context availability check
    isReady
  }
}
