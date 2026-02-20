import { defineEventHandler, getQuery } from 'h3'
import { systemOperationStore } from '../server/utils/systemOperationStore'

/**
 * Get system operations with optional filters
 * GET /__nuxt_crouton_devtools/api/system-operations?type=auth&source=crouton-ai&since=1234567890
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  const filters: { type?: string, source?: string, since?: number } = {}

  if (query.type && typeof query.type === 'string') {
    filters.type = query.type
  }

  if (query.source && typeof query.source === 'string') {
    filters.source = query.source
  }

  if (query.since && typeof query.since === 'string') {
    filters.since = Number.parseInt(query.since, 10)
  }

  const operations = systemOperationStore.getAll(filters)
  const stats = systemOperationStore.getStats()

  return {
    success: true,
    data: operations,
    count: operations.length,
    stats,
    filters
  }
})
