/**
 * Enriched events query composable
 * Extends standard collection query with user JOIN support
 */

interface UseCroutonEventsOptions {
  teamId?: string
  enrichUserData?: boolean // If true, JOINs with users table
  filters?: {
    collectionName?: string
    operation?: 'create' | 'update' | 'delete'
    userId?: string
    dateFrom?: Date
    dateTo?: Date
  }
  pagination?: {
    page?: number
    pageSize?: number
  }
}

interface EnrichedEvent {
  id: string
  timestamp: Date
  operation: 'create' | 'update' | 'delete'
  collectionName: string
  itemId: string
  teamId: string
  userId: string
  userName: string // Historical snapshot
  changes: any[]
  metadata?: any
  // Enriched user data (if enrichUserData: true)
  user?: {
    id: string
    currentName?: string
    email?: string
    avatarUrl?: string
  }
}

export function useCroutonEvents(options: UseCroutonEventsOptions = {}) {
  const { getTeamId } = useTeamContext()
  const teamId = options.teamId || getTeamId()

  if (!teamId) {
    throw new Error('[useCroutonEvents] Team context required')
  }

  // Build query parameters
  const queryParams: any = {
    teamId
  }

  if (options.filters) {
    if (options.filters.collectionName) {
      queryParams.collectionName = options.filters.collectionName
    }
    if (options.filters.operation) {
      queryParams.operation = options.filters.operation
    }
    if (options.filters.userId) {
      queryParams.userId = options.filters.userId
    }
    if (options.filters.dateFrom) {
      queryParams.dateFrom = options.filters.dateFrom.toISOString()
    }
    if (options.filters.dateTo) {
      queryParams.dateTo = options.filters.dateTo.toISOString()
    }
  }

  if (options.pagination) {
    queryParams.page = options.pagination.page || 1
    queryParams.pageSize = options.pagination.pageSize || 50
  }

  if (options.enrichUserData) {
    queryParams.enrichUserData = true
  }

  const { data, pending, error, refresh } = useFetch<EnrichedEvent[]>(
    `/api/teams/${teamId}/crouton-events`,
    { query: queryParams }
  )

  return {
    data,
    pending,
    error,
    refresh
  }
}
