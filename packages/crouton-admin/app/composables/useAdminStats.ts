import { useIntervalFn } from '@vueuse/core'
import type { AdminStats } from '../../types/admin'

export interface UseAdminStatsOptions {
  /** Whether to auto-refresh stats on an interval */
  autoRefresh?: boolean
  /** Refresh interval in milliseconds (default: 30000 = 30 seconds) */
  refreshInterval?: number
  /** Whether to fetch immediately (default: true) */
  immediate?: boolean
}

export function useAdminStats(options: UseAdminStatsOptions = {}) {
  const { autoRefresh = false, refreshInterval = 30000, immediate = true } = options

  const { data: stats, status, error: fetchError, refresh } = useFetch<AdminStats>('/api/admin/stats', {
    immediate,
    server: false
  })

  const loading = computed(() => status.value === 'pending')
  const error = computed(() => fetchError.value?.message ?? null)

  const { pause: stopAutoRefresh, resume: startAutoRefresh } = useIntervalFn(
    () => { refresh() },
    refreshInterval,
    { immediate: autoRefresh }
  )

  return {
    stats,
    loading,
    error,
    refresh,
    startAutoRefresh,
    stopAutoRefresh
  }
}
