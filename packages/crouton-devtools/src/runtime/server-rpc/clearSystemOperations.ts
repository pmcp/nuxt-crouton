import { defineEventHandler } from 'h3'
import { systemOperationStore } from '../server/utils/systemOperationStore'

/**
 * Clear all system operations
 * POST /__nuxt_crouton_devtools/api/system-operations/clear
 */
export default defineEventHandler(async (_event) => {
  systemOperationStore.clear()

  return {
    success: true,
    message: 'System operations cleared'
  }
})
