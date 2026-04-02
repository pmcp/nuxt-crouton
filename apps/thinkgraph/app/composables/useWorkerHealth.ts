/**
 * Poll the Pi worker health status.
 * Returns reactive state: online, activeSessions, maxSessions, uptime, error.
 */
export function useWorkerHealth(pollIntervalMs = 30_000) {
  const { teamId } = useTeamContext()

  const health = ref<{
    online: boolean
    version?: string
    uptime?: number
    activeSessions?: number
    maxSessions?: number
    error?: string
  }>({ online: false })

  const polling = ref(false)

  async function check() {
    if (!teamId.value || polling.value) return
    polling.value = true
    try {
      const result = await $fetch<Record<string, any>>(
        `/api/teams/${teamId.value}/dispatch/worker-health`,
      )
      health.value = {
        online: result.online ?? false,
        version: result.version,
        uptime: result.uptime,
        activeSessions: result.activeSessions,
        maxSessions: result.maxSessions,
        error: result.error,
      }
    }
    catch {
      health.value = { online: false, error: 'Failed to check worker health' }
    }
    finally {
      polling.value = false
    }
  }

  // Poll on mount, then at interval
  let timer: ReturnType<typeof setInterval> | undefined
  onMounted(() => {
    check()
    timer = setInterval(check, pollIntervalMs)
  })
  onUnmounted(() => {
    if (timer) clearInterval(timer)
  })

  return {
    health: readonly(health),
    check,
  }
}
