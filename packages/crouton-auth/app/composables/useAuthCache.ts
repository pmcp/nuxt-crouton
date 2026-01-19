/**
 * useAuthCache Composable
 *
 * Provides caching utilities for auth-related data.
 * Reduces API calls and improves perceived performance.
 *
 * @example
 * ```typescript
 * const { getCached, setCached, invalidate } = useAuthCache()
 *
 * // Check cache before fetching
 * const teams = getCached('user-teams')
 * if (!teams) {
 *   const freshTeams = await fetchTeams()
 *   setCached('user-teams', freshTeams, { ttl: 60000 })
 * }
 * ```
 */

// Cache store with timestamps
interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

// Global cache store
const cache = new Map<string, CacheEntry<unknown>>()

// Default TTL values (in milliseconds)
export const CACHE_TTL = {
  /** User session - short TTL as it can change */
  SESSION: 30_000, // 30 seconds
  /** Team list - medium TTL */
  TEAMS: 60_000, // 1 minute
  /** Team members - medium TTL */
  MEMBERS: 60_000, // 1 minute
  /** Billing info - longer TTL */
  BILLING: 300_000, // 5 minutes
  /** User profile - medium TTL */
  PROFILE: 60_000, // 1 minute
  /** Invitations - short TTL */
  INVITATIONS: 30_000 // 30 seconds
} as const

export interface CacheOptions {
  /** Time to live in milliseconds */
  ttl?: number
  /** Force refresh even if cached */
  force?: boolean
}

export function useAuthCache() {
  /**
   * Get cached data if available and not expired
   */
  function getCached<T>(key: string): T | null {
    const entry = cache.get(key)

    if (!entry) return null

    const now = Date.now()
    if (now - entry.timestamp > entry.ttl) {
      // Expired, remove from cache
      cache.delete(key)
      return null
    }

    return entry.data as T
  }

  /**
   * Set cached data
   */
  function setCached<T>(key: string, data: T, options: CacheOptions = {}): void {
    const ttl = options.ttl ?? CACHE_TTL.SESSION
    cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }

  /**
   * Invalidate a specific cache entry
   */
  function invalidate(key: string): void {
    cache.delete(key)
  }

  /**
   * Invalidate multiple cache entries by prefix
   */
  function invalidateByPrefix(prefix: string): void {
    for (const key of cache.keys()) {
      if (key.startsWith(prefix)) {
        cache.delete(key)
      }
    }
  }

  /**
   * Clear all cache entries
   */
  function clearAll(): void {
    cache.clear()
  }

  /**
   * Get cache statistics
   */
  function getStats(): { size: number, keys: string[] } {
    return {
      size: cache.size,
      keys: Array.from(cache.keys())
    }
  }

  /**
   * Wrap an async function with caching
   */
  function withCache<T extends (...args: any[]) => Promise<any>>(
    key: string | ((...args: Parameters<T>) => string),
    fn: T,
    options: CacheOptions = {}
  ): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
    return async (...args: Parameters<T>) => {
      const cacheKey = typeof key === 'function' ? key(...args) : key

      // Check cache first (unless force refresh)
      if (!options.force) {
        const cached = getCached<Awaited<ReturnType<T>>>(cacheKey)
        if (cached !== null) {
          return cached
        }
      }

      // Fetch fresh data
      const result = await fn(...args)

      // Cache the result
      setCached(cacheKey, result, options)

      return result
    }
  }

  // Cache key generators
  const cacheKeys = {
    session: () => 'auth:session',
    teams: (userId: string) => `auth:teams:${userId}`,
    team: (teamId: string) => `auth:team:${teamId}`,
    members: (teamId: string) => `auth:members:${teamId}`,
    invitations: (teamId: string) => `auth:invitations:${teamId}`,
    billing: (teamId: string) => `auth:billing:${teamId}`,
    profile: (userId: string) => `auth:profile:${userId}`
  }

  return {
    // Cache operations
    getCached,
    setCached,
    invalidate,
    invalidateByPrefix,
    clearAll,
    getStats,
    withCache,

    // Cache keys
    cacheKeys,

    // TTL constants
    CACHE_TTL
  }
}

/**
 * Invalidate all auth-related caches
 * Call this on logout or significant auth state changes
 */
export function invalidateAuthCache(): void {
  const { invalidateByPrefix } = useAuthCache()
  invalidateByPrefix('auth:')
}
