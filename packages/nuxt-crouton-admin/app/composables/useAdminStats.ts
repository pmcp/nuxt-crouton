/**
 * useAdminStats Composable
 *
 * Provides dashboard statistics for super admins.
 * Fetches key metrics about users, teams, and sessions.
 *
 * @example
 * ```vue
 * <script setup>
 * const { stats, loading, getStats } = useAdminStats()
 *
 * // Fetch stats on mount
 * onMounted(async () => {
 *   await getStats()
 *   console.log('Total users:', stats.value?.totalUsers)
 * })
 *
 * // Auto-refresh stats
 * const { stats: autoStats } = useAdminStats({ autoRefresh: true, refreshInterval: 30000 })
 * </script>
 * ```
 */
import { ref, readonly, onUnmounted } from 'vue'
import type { AdminStats } from '../../types/admin'

export interface UseAdminStatsOptions {
  /** Whether to auto-refresh stats on an interval */
  autoRefresh?: boolean
  /** Refresh interval in milliseconds (default: 30000 = 30 seconds) */
  refreshInterval?: number
}

export function useAdminStats(options: UseAdminStatsOptions = {}) {
  const { autoRefresh = false, refreshInterval = 30000 } = options

  const loading = ref(false)
  const error = ref<string | null>(null)
  const stats = ref<AdminStats | null>(null)
  const lastUpdated = ref<Date | null>(null)

  let refreshTimer: ReturnType<typeof setInterval> | null = null

  /**
   * Fetch dashboard statistics
   *
   * @returns Admin stats object
   */
  async function getStats(): Promise<AdminStats> {
    loading.value = true
    error.value = null
    try {
      const response = await $fetch<AdminStats>('/api/admin/stats')

      // Update reactive state
      stats.value = response
      lastUpdated.value = new Date()

      return response
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch stats'
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * Start auto-refresh timer
   */
  function startAutoRefresh(): void {
    stopAutoRefresh()
    refreshTimer = setInterval(() => {
      getStats().catch(() => {
        // Silently ignore errors during auto-refresh
      })
    }, refreshInterval)
  }

  /**
   * Stop auto-refresh timer
   */
  function stopAutoRefresh(): void {
    if (refreshTimer) {
      clearInterval(refreshTimer)
      refreshTimer = null
    }
  }

  // Set up auto-refresh if enabled
  if (autoRefresh && import.meta.client) {
    // Initial fetch
    getStats().catch(() => {})
    startAutoRefresh()

    // Clean up on unmount
    onUnmounted(() => {
      stopAutoRefresh()
    })
  }

  return {
    // State
    stats: readonly(stats),
    loading: readonly(loading),
    error: readonly(error),
    lastUpdated: readonly(lastUpdated),

    // Methods
    getStats,
    startAutoRefresh,
    stopAutoRefresh
  }
}
