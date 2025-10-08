import { defineEventHandler, getQuery } from 'h3'
import { operationStore, type OperationFilters } from '../server/utils/operationStore'

/**
 * Get operations with optional filters
 * GET /__nuxt_crouton_devtools/api/operations?collection=users&operation=list&status=success
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  // Build filters from query params
  const filters: OperationFilters = {}

  if (query.collection && typeof query.collection === 'string') {
    filters.collection = query.collection
  }

  if (query.operation && typeof query.operation === 'string') {
    filters.operation = query.operation as any
  }

  if (query.status && typeof query.status === 'string') {
    filters.status = query.status as 'success' | 'error'
  }

  if (query.since && typeof query.since === 'string') {
    filters.since = parseInt(query.since, 10)
  }

  const operations = operationStore.getAll(filters)

  return {
    success: true,
    data: operations,
    count: operations.length,
    filters
  }
})
