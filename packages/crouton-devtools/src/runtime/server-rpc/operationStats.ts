import { defineEventHandler } from 'h3'
import { operationStore } from '../server/utils/operationStore'

/**
 * Get operation statistics
 * GET /__nuxt_crouton_devtools/api/operations/stats
 */
export default defineEventHandler(async () => {
  const stats = operationStore.getStats()

  return {
    success: true,
    data: stats
  }
})
