import type { Ref, ComputedRef } from 'vue'

interface CollectionItemReturn<T = any> {
  item: ComputedRef<T | null>
  pending: Ref<boolean>
  error: Ref<any>
  refresh: () => Promise<void>
}

/**
 * Fetch a single collection item by ID
 *
 * Features:
 * - Fetches individual items from the API
 * - Supports both team-scoped and super-admin routes
 * - Reactive ID parameter for prop changes
 * - Nuxt cache integration
 * - Works with internal and external collections
 *
 * @example
 * // Basic usage
 * const { item, pending } = await useCollectionItem('users', '123')
 *
 * @example
 * // With reactive ID from props
 * const { item, pending } = await useCollectionItem('users', () => props.id)
 *
 * @example
 * // With ref
 * const userId = ref('123')
 * const { item, pending } = await useCollectionItem('users', userId)
 */
export async function useCollectionItem<T = any>(
  collection: string,
  id: string | Ref<string> | (() => string)
): Promise<CollectionItemReturn<T>> {
  const route = useRoute()
  const collections = useCollections()
  const config = collections.getConfig(collection)
  const { applyTransform, getProxiedEndpoint } = useCollectionProxy()
  const { getTeamId } = useTeamContext()

  if (!config) {
    throw new Error(`Collection "${collection}" not registered`)
  }

  const apiPath = getProxiedEndpoint(config, config.apiPath || collection)

  // Capture team ID during setup to avoid inject() issues in computed/watch
  const teamId = getTeamId()

  // Handle all three types: string, Ref<string>, () => string
  const itemId = computed(() => {
    // Handle function type first (before unref, as unref doesn't unwrap functions)
    if (typeof id === 'function') {
      return id()
    }
    // Handle Ref<string> and string with unref
    return unref(id)
  })

  // Build API path based on collection's fetch strategy
  // - 'restful': Uses /{id} pattern (e.g., /api/teams/123/members/456)
  // - 'query': Uses ?ids= pattern (e.g., /api/teams/123/bookings?ids=456)
  const fullApiPath = computed(() => {
    const strategy = config.fetchStrategy || 'query'

    let basePath: string
    if (route.path.includes('/super-admin/')) {
      basePath = `/api/super-admin/${apiPath}`
    } else {
      if (!teamId) {
        console.error('[useCollectionItem] Team context required but not available')
        basePath = `/api/teams/undefined/${apiPath}`
      } else {
        basePath = `/api/teams/${teamId}/${apiPath}`
      }
    }

    if (strategy === 'restful') {
      return `${basePath}/${itemId.value}`
    } else {
      return `${basePath}?ids=${itemId.value}`
    }
  })

  // Use manual reactive state with $fetch for dynamic dependent data
  // This approach is more suitable for data that changes based on user input
  const data = ref(null)
  const pending = ref(false)
  const error = ref(null)

  // Fetch function
  const fetchItem = async () => {
    if (!itemId.value) {
      data.value = null
      return
    }

    pending.value = true
    error.value = null

    try {
      const response = await $fetch(fullApiPath.value)
      data.value = response
    } catch (e: any) {
      error.value = e
    } finally {
      pending.value = false
    }
  }

  // Initial fetch
  await fetchItem()

  // Watch for itemId changes and refetch
  watch(itemId, async () => {
    await fetchItem()
  })

  const refresh = fetchItem

  // Handle response based on fetch strategy
  // - RESTful endpoints return single object
  // - Query-based endpoints return array (extract first item)
  const item = computed(() => {
    const response = data.value
    const strategy = config.fetchStrategy || 'query'

    let rawItem: any = null
    if (strategy === 'restful') {
      rawItem = response
    } else {
      // Query-based returns array
      if (Array.isArray(response)) {
        rawItem = response[0] || null
      } else {
        rawItem = response
      }
    }

    // Apply proxy transform if configured
    if (rawItem) {
      return applyTransform(rawItem, config) as T | null
    }
    return null
  })

  return { item, pending, error, refresh }
}
