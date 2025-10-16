/**
 * Enriched events query composable
 * Extends standard collection query with user JOIN support
 */

interface UseCroutonEventsOptions {
  teamId?: string
  enrichUserData?: boolean  // If true, JOINs with users table
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
  userName: string  // Historical snapshot
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

  // Use standard collection query for basic fetching
  const { data, pending, error, refresh } = useCollectionQuery<EnrichedEvent>(
    'croutonEvents',
    queryParams
  )

  // If enrichUserData is requested, we need a custom endpoint
  // For now, we'll fetch events normally and enrich client-side
  // TODO: Implement server-side JOIN for better performance
  const enrichedData = computed(() => {
    if (!options.enrichUserData || !data.value) {
      return data.value
    }

    // Client-side enrichment (can be optimized with server-side JOIN later)
    // For now, return as-is since we don't have user data readily available
    // In production, you'd want to:
    // 1. Extract unique userIds from events
    // 2. Batch fetch user data
    // 3. Merge user data into events
    return data.value
  })

  return {
    data: enrichedData,
    pending,
    error,
    refresh
  }
}
