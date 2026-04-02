/**
 * Proxy endpoint to check Pi worker health.
 *
 * GET /api/teams/[id]/dispatch/worker-health
 * Returns the worker's /health response or an error status.
 *
 * Used by the UI to show worker connectivity state.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const piWorkerUrl = config.piWorkerUrl || 'https://pi-api.pmcp.dev'

  try {
    const health = await $fetch(`${piWorkerUrl}/health`, {
      timeout: 5000,
    })

    return {
      online: true,
      ...health as Record<string, unknown>,
    }
  }
  catch (err: any) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      online: false,
      error: message,
      piWorkerUrl,
    }
  }
})
