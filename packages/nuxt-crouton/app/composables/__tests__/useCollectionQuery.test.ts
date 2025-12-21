import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, computed, reactive } from 'vue'

// Mock route
let mockRoute = {
  path: '/dashboard/test-team/products',
  params: { team: 'test-team' }
}

// Mock useFetch response - container object that can be modified
const mockFetchState = {
  data: ref([]) as any,
  pending: ref(false) as any,
  error: ref(null) as any,
  refresh: vi.fn() as any
}

const mockUseFetch = vi.fn(() => {
  return Promise.resolve({
    data: mockFetchState.data,
    pending: mockFetchState.pending,
    error: mockFetchState.error,
    refresh: mockFetchState.refresh
  })
})

// Mock collections config
const mockCollectionsConfig: Record<string, any> = {
  products: {
    layer: 'shop',
    apiPath: 'shop-products',
    componentName: 'ShopProductsForm'
  },
  posts: {
    layer: 'blog',
    fetchStrategy: 'restful'
  },
  proxiedItems: {
    layer: 'external',
    proxy: {
      enabled: true,
      sourceEndpoint: 'https://api.example.com/items',
      transform: (item: any) => ({ ...item, proxied: true })
    }
  }
}

// Mock useTeam
let mockUseTeam: (() => { currentTeam: any }) | null = null

// Mock console methods
const mockConsoleLog = vi.fn()
const mockConsoleError = vi.fn()

// Set up global mocks
vi.stubGlobal('ref', ref)
vi.stubGlobal('computed', computed)
vi.stubGlobal('reactive', reactive)
vi.stubGlobal('useRoute', () => mockRoute)
vi.stubGlobal('useFetch', mockUseFetch)

vi.stubGlobal('useAppConfig', () => ({
  croutonCollections: mockCollectionsConfig
}))

vi.stubGlobal('useRuntimeConfig', () => ({
  public: {
    crouton: { auth: { mode: 'multi-tenant' } }
  }
}))

vi.stubGlobal('useTeam', () => {
  if (mockUseTeam) {
    return mockUseTeam()
  }
  throw new Error('useTeam not available')
})

// Stub console
vi.stubGlobal('console', {
  ...console,
  log: mockConsoleLog,
  error: mockConsoleError,
  group: vi.fn(),
  groupEnd: vi.fn()
})

// Import composables after mocking
import useCollections from '../useCollections'
import { useTeamContext } from '../useTeamContext'
import { useCollectionProxy } from '../useCollectionProxy'

vi.stubGlobal('useCollections', useCollections)
vi.stubGlobal('useTeamContext', useTeamContext)
vi.stubGlobal('useCollectionProxy', useCollectionProxy)

// Import the composable under test
import { useCollectionQuery } from '../useCollectionQuery'

describe('useCollectionQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRoute = {
      path: '/dashboard/test-team/products',
      params: { team: 'test-team' }
    }
    mockUseTeam = null
    // Reset mock fetch state
    mockFetchState.data = ref([])
    mockFetchState.pending = ref(false)
    mockFetchState.error = ref(null)
    mockFetchState.refresh = vi.fn()
  })

  // Don't use vi.resetAllMocks() as it clears mock implementations

  describe('cache key generation', () => {
    it('generates key with collection name', async () => {
      await useCollectionQuery('products')

      expect(mockUseFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          key: expect.stringContaining('collection:products:')
        })
      )
    })

    it('includes query params in key', async () => {
      const query = computed(() => ({ page: 2, status: 'active' }))

      await useCollectionQuery('products', { query })

      expect(mockUseFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          key: expect.stringContaining('collection:products:')
        })
      )

      // Verify the key contains the serialized query
      const call = mockUseFetch.mock.calls[0]
      expect(call[1].key).toContain('page')
    })

    it('different queries produce different keys', async () => {
      const query1 = computed(() => ({ page: 1 }))
      const query2 = computed(() => ({ page: 2 }))

      await useCollectionQuery('products', { query: query1 })
      const key1 = mockUseFetch.mock.calls[0][1].key

      mockUseFetch.mockClear()

      await useCollectionQuery('products', { query: query2 })
      const key2 = mockUseFetch.mock.calls[0][1].key

      expect(key1).not.toBe(key2)
    })

    it('generates consistent key for same query', async () => {
      const query = computed(() => ({ status: 'active' }))

      await useCollectionQuery('products', { query })
      const key1 = mockUseFetch.mock.calls[0][1].key

      mockUseFetch.mockClear()

      await useCollectionQuery('products', { query })
      const key2 = mockUseFetch.mock.calls[0][1].key

      expect(key1).toBe(key2)
    })

    it('generates key with empty object for no query', async () => {
      await useCollectionQuery('products')

      const call = mockUseFetch.mock.calls[0]
      expect(call[1].key).toBe('collection:products:{}')
    })
  })

  describe('API path resolution', () => {
    it('uses team-scoped path for normal routes', async () => {
      await useCollectionQuery('products')

      expect(mockUseFetch).toHaveBeenCalledWith(
        '/api/teams/test-team/shop-products',
        expect.any(Object)
      )
    })

    it('uses super-admin path for admin routes', async () => {
      mockRoute = {
        path: '/super-admin/products',
        params: {}
      }

      await useCollectionQuery('products')

      expect(mockUseFetch).toHaveBeenCalledWith(
        '/api/super-admin/shop-products',
        expect.any(Object)
      )
    })

    it('uses collection name as apiPath when not configured', async () => {
      await useCollectionQuery('posts')

      expect(mockUseFetch).toHaveBeenCalledWith(
        '/api/teams/test-team/posts',
        expect.any(Object)
      )
    })

    it('uses team ID from useTeam() when available', async () => {
      mockUseTeam = () => ({
        currentTeam: { value: { id: 'team-123', slug: 'acme' } }
      })

      await useCollectionQuery('products')

      expect(mockUseFetch).toHaveBeenCalledWith(
        '/api/teams/team-123/shop-products',
        expect.any(Object)
      )
    })

    it('logs error when team context missing', async () => {
      mockRoute = {
        path: '/dashboard/products', // No team param
        params: {}
      }

      await useCollectionQuery('products')

      expect(mockConsoleError).toHaveBeenCalledWith(
        '[useCollectionQuery] Team context required but not available',
        expect.any(Object)
      )
    })

    it('returns path with undefined when no team context', async () => {
      mockRoute = {
        path: '/dashboard/products',
        params: {}
      }

      await useCollectionQuery('products')

      expect(mockUseFetch).toHaveBeenCalledWith(
        '/api/teams/undefined/shop-products',
        expect.any(Object)
      )
    })
  })

  describe('response handling', () => {
    it('normalizes array response', async () => {
      const mockItems = [
        { id: '1', name: 'Product 1' },
        { id: '2', name: 'Product 2' }
      ]
      mockFetchState.data = ref(mockItems)

      const { items } = await useCollectionQuery('products')

      expect(items.value).toEqual(mockItems)
    })

    it('normalizes paginated response with items', async () => {
      const mockPaginatedResponse = {
        items: [
          { id: '1', name: 'Product 1' },
          { id: '2', name: 'Product 2' }
        ],
        pagination: { totalItems: 2, currentPage: 1 }
      }
      mockFetchState.data = ref(mockPaginatedResponse)

      const { items } = await useCollectionQuery('products')

      expect(items.value).toEqual(mockPaginatedResponse.items)
    })

    it('returns empty array for null data', async () => {
      mockFetchState.data = ref(null)

      const { items } = await useCollectionQuery('products')

      expect(items.value).toEqual([])
    })

    it('returns empty array for unexpected response format', async () => {
      mockFetchState.data = ref({ unexpected: 'format' })

      const { items } = await useCollectionQuery('products')

      expect(items.value).toEqual([])
    })

    it('returns pending state', async () => {
      mockFetchState.pending = ref(true)

      const { pending } = await useCollectionQuery('products')

      expect(pending.value).toBe(true)
    })

    it('returns error state', async () => {
      const mockError = new Error('Fetch failed')
      mockFetchState.error = ref(mockError)

      const { error } = await useCollectionQuery('products')

      expect(error.value).toBe(mockError)
    })

    it('returns refresh function', async () => {
      mockFetchState.refresh = vi.fn()

      const { refresh } = await useCollectionQuery('products')

      expect(refresh).toBe(mockFetchState.refresh)
    })

    it('returns raw data ref', async () => {
      const rawData = { items: [{ id: '1' }], meta: { total: 1 } }
      mockFetchState.data = ref(rawData)

      const { data } = await useCollectionQuery('products')

      expect(data.value).toEqual(rawData)
    })
  })

  describe('error handling', () => {
    it('throws for unregistered collection', async () => {
      await expect(useCollectionQuery('nonexistent' as any)).rejects.toThrow(
        'Collection "nonexistent" not registered'
      )
    })

    it('logs error for unregistered collection', async () => {
      try {
        await useCollectionQuery('nonexistent' as any)
      } catch {
        // Expected
      }

      expect(mockConsoleError).toHaveBeenCalledWith(
        '[useCollectionQuery] Collection "nonexistent" not found in registry'
      )
    })
  })

  describe('watch behavior', () => {
    it('watches query by default', async () => {
      const query = computed(() => ({ page: 1 }))

      await useCollectionQuery('products', { query })

      expect(mockUseFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          watch: [query]
        })
      )
    })

    it('disables watch when watch option is false', async () => {
      const query = computed(() => ({ page: 1 }))

      await useCollectionQuery('products', { query, watch: false })

      expect(mockUseFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          watch: []
        })
      )
    })

    it('uses empty watch array when no query provided', async () => {
      await useCollectionQuery('products')

      expect(mockUseFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          watch: []
        })
      )
    })
  })

  describe('useFetch options', () => {
    it('passes query to useFetch', async () => {
      const query = computed(() => ({ page: 2, filter: 'active' }))

      await useCollectionQuery('products', { query })

      expect(mockUseFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          query
        })
      )
    })

    it('includes onRequest callback', async () => {
      await useCollectionQuery('products')

      const options = mockUseFetch.mock.calls[0][1]
      expect(options.onRequest).toBeDefined()
      expect(typeof options.onRequest).toBe('function')
    })

    it('includes onResponse callback', async () => {
      await useCollectionQuery('products')

      const options = mockUseFetch.mock.calls[0][1]
      expect(options.onResponse).toBeDefined()
      expect(typeof options.onResponse).toBe('function')
    })

    it('includes onResponseError callback', async () => {
      await useCollectionQuery('products')

      const options = mockUseFetch.mock.calls[0][1]
      expect(options.onResponseError).toBeDefined()
      expect(typeof options.onResponseError).toBe('function')
    })
  })

  describe('proxy integration', () => {
    it('applies transform when proxy configured', async () => {
      const mockItems = [
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' }
      ]
      mockFetchState.data = ref(mockItems)

      const { items } = await useCollectionQuery('proxiedItems')

      // Items should be transformed with the proxy transform
      expect(items.value).toEqual([
        { id: '1', name: 'Item 1', proxied: true },
        { id: '2', name: 'Item 2', proxied: true }
      ])
    })

    it('uses proxied endpoint when configured', async () => {
      await useCollectionQuery('proxiedItems')

      // The proxied endpoint replaces the apiPath in the URL
      expect(mockUseFetch).toHaveBeenCalledWith(
        expect.stringContaining('api.example.com'),
        expect.any(Object)
      )
    })
  })

  describe('logging', () => {
    it('logs initialization details', async () => {
      await useCollectionQuery('products')

      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[useCollectionQuery] Initializing:',
        expect.objectContaining({
          collection: 'products',
          cacheKey: expect.any(String),
          apiPath: expect.any(String)
        })
      )
    })

    it('logs return details', async () => {
      mockFetchState.data = ref([{ id: '1' }])

      await useCollectionQuery('products')

      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[useCollectionQuery] Returning:',
        expect.objectContaining({
          collection: 'products',
          itemCount: 1,
          pending: false,
          hasError: false
        })
      )
    })
  })
})
