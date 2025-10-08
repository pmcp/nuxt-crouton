import { defineEventHandler } from 'h3'
import { operationStore } from '../server/utils/operationStore'

/**
 * Clear all operations from the store
 * POST /__nuxt_crouton_devtools/api/operations/clear
 */
export default defineEventHandler(async () => {
  operationStore.clear()

  return {
    success: true,
    message: 'All operations cleared'
  }
})
