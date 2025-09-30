import type { Ref, ComputedRef } from 'vue'
import type { UseFetchOptions } from 'nuxt/app'

interface CollectionQueryOptions {
  query?: ComputedRef<Record<string, any>> | Ref<Record<string, any>>
  watch?: boolean
}

interface CollectionQueryReturn<T = any> {
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
 *
 * @example
 * // Basic usage
 * const { items, pending } = await useCollectionQuery('adminRoles')
 *
 * @example
 * // With query parameters (pagination, filters)
 * const page = ref(1)
 * const { items, pending } = await useCollectionQuery('adminRoles', {
 *   query: computed(() => ({ page: page.value, status: 'active' }))
 * })
 *
 * @example
 * // With translations
 * const { locale } = useI18n()
 * const { items, pending } = await useCollectionQuery('adminRoles', {
 *   query: computed(() => ({ locale: locale.value }))
 * })
 */
export function useCollectionQuery<T = any>(
  collection: string,
  options: CollectionQueryOptions = {}
): Promise<CollectionQueryReturn<T>> {
  const route = useRoute()
  const collections = useCollections()
  const config = collections.getConfig(collection)

  if (!config) {
    console.error(`[useCollectionQuery] Collection "${collection}" not found in registry`)
    throw new Error(`Collection "${collection}" not registered`)
  }

  const apiPath = config.apiPath || collection

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
    return `/api/teams/${route.params.team}/${apiPath}`
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

    // Handle array response
    if (Array.isArray(val)) {
      console.log('[useCollectionQuery] Array response:', val.length, 'items')
      return val as T[]
    }

    // Handle paginated response
    if (val.items && Array.isArray(val.items)) {
      console.log('[useCollectionQuery] Paginated response:', val.items.length, 'items')
      return val.items as T[]
    }

    console.log('[useCollectionQuery] Unexpected response format:', typeof val)
    return []
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