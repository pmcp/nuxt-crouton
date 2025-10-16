/**
 * Health monitoring composable for event tracking
 * Provides visibility into tracking success/failure rates
 */

export function useCroutonEventsHealth() {
  const health = useState('crouton-events-health', () => ({
    total: 0,
    failed: 0,
    lastError: null as string | null,
    lastErrorTime: null as Date | null
  }))

  const failureRate = computed(() => {
    if (health.value.total === 0) return 0
    return (health.value.failed / health.value.total) * 100
  })

  const isHealthy = computed(() => {
    return failureRate.value < 10 // Consider healthy if < 10% failure rate
  })

  return {
    health: readonly(health),
    failureRate,
    isHealthy
  }
}
