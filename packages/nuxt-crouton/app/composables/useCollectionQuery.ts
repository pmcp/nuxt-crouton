import type { Ref, ComputedRef } from 'vue'
import type { UseFetchOptions } from 'nuxt/app'
import type { CollectionTypeMap, CollectionItem, CollectionName } from '../types/collections'

interface CollectionQueryOptions {
  query?: ComputedRef<Record<string, any>> | Ref<Record<string, any>>
  watch?: boolean
}

interface CollectionQueryReturn<T> {
  items: ComputedRef<T[]>
  data: Ref<any>
  refresh: () => Promise<void>
  pending: Ref<boolean>
  error: Ref<any>
}

/**
 * Query-based data fetching for collections
 * Replaces the old global state pattern with Nuxt's built-in cache
 *
 * Features:
 * - Query-based cache keys (different queries = different cache entries)
 * - Automatic reactivity with watch
 * - Works with Nuxt's SSR/cache system
 * - Multiple views can coexist without conflicts
 * - Type-safe: Only registered collections are allowed
 *
 * @example
 * // Type-safe usage - type is automatically inferred
 * const { items, pending } = await useCollectionQuery('blogPosts')
 * // items is ComputedRef<BlogPost[]>
 *
 * @example
 * // With query parameters (pagination, filters)
 * const page = ref(1)
 * const { items, pending } = await useCollectionQuery('blogPosts', {
 *   query: computed(() => ({ page: page.value, status: 'active' }))
 * })
 *
 * @example
 * // With translations
 * const { locale } = useI18n()
 * const { items, pending } = await useCollectionQuery('blogPosts', {
 *   query: computed(() => ({ locale: locale.value }))
 * })
 */
export async function useCollectionQuery<K extends CollectionName>(
  collection: K,
  options: CollectionQueryOptions = {}
): Promise<CollectionQueryReturn<CollectionItem<K>>> {
  const route = useRoute()
  const collections = useCollections()
  const config = collections.getConfig(collection)
  const { applyTransform, getProxiedEndpoint } = useCollectionProxy()
  const { getTeamId } = useTeamContext()

  if (!config) {
    console.error(`[useCollectionQuery] Collection "${collection}" not found in registry`)
    throw new Error(`Collection "${collection}" not registered`)
  }

  const apiPath = getProxiedEndpoint(config, config.apiPath || collection)

  // Generate cache key based on collection + query params
  const cacheKey = computed(() => {
    const queryStr = options.query?.value
      ? JSON.stringify(options.query.value)
      : '{}'
    return `collection:${collection}:${queryStr}`
  })

  console.log('[useCollectionQuery] Initializing:', {
    collection,
    cacheKey: cacheKey.value,
    query: options.query?.value,
    apiPath
  })

  // Determine the full API path based on route context
  const fullApiPath = computed(() => {
    if (route.path.includes('/super-admin/')) {
      return `/api/super-admin/${apiPath}`
    }

    const teamId = getTeamId()
    if (!teamId) {
      console.error('[useCollectionQuery] Team context required but not available', {
        collection,
        routePath: route.path,
        teamParam: route.params.team
      })
      // Return a path that will likely 404, but at least be valid
      // The error will be caught and exposed via the error ref
      return `/api/teams/undefined/${apiPath}`
    }

    return `/api/teams/${teamId}/${apiPath}`
  })

  // Build watch array - watch query if provided
  const watchArray = options.query && options.watch !== false
    ? [options.query]
    : []

  // Use Nuxt's useFetch with proper caching
  const fetchOptions: UseFetchOptions<any> = {
    key: cacheKey.value,
    query: options.query,
    watch: watchArray,
    onRequest: ({ request, options }) => {
      console.log('[useCollectionQuery] Request start:', {
        request,
        query: options.query
      })
    },
    onResponse: ({ response }) => {
      console.log('[useCollectionQuery] Response received:', {
        status: response.status,
        hasItems: !!response._data,
        itemCount: Array.isArray(response._data)
          ? response._data.length
          : response._data?.items?.length || 0
      })
    },
    onResponseError: ({ response }) => {
      console.error('[useCollectionQuery] Error:', {
        status: response.status,
        statusText: response.statusText
      })
    }
  }

  const { data, refresh, pending, error } = await useFetch(
    fullApiPath.value,
    fetchOptions
  )

  // Return normalized data structure
  // Handle both array responses and paginated responses
  const items = computed(() => {
    const val = data.value
    if (!val) {
      console.log('[useCollectionQuery] No data yet')
      return []
    }

    let rawItems: any[] = []

    // Handle array response
    if (Array.isArray(val)) {
      console.log('[useCollectionQuery] Array response:', val.length, 'items')
      rawItems = val
    }
    // Handle paginated response
    else if (val.items && Array.isArray(val.items)) {
      console.log('[useCollectionQuery] Paginated response:', val.items.length, 'items')
      rawItems = val.items
    } else {
      console.log('[useCollectionQuery] Unexpected response format:', typeof val)
      return []
    }

    // Apply proxy transform if configured
    return applyTransform(rawItems, config) as CollectionItem<K>[]
  })

  console.log('[useCollectionQuery] Returning:', {
    collection,
    itemCount: items.value.length,
    pending: pending.value,
    hasError: !!error.value
  })

  return {
    items,
    data,
    refresh,
    pending,
    error
  }
}
