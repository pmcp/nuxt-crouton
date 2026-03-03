import type { SQL } from 'drizzle-orm'
import { eq, gte, lte } from 'drizzle-orm'
import { croutonEvents } from '../database/schema'

interface EventFilterParams {
  teamId: string
  collectionName?: string
  operation?: 'create' | 'update' | 'delete'
  userId?: string
  dateFrom?: Date
  dateTo?: Date
}

/** Build Drizzle where conditions from event filter params */
export function buildEventConditions(params: EventFilterParams): SQL[] {
  const conditions: SQL[] = [eq(croutonEvents.teamId, params.teamId)]

  if (params.collectionName) {
    conditions.push(eq(croutonEvents.collectionName, params.collectionName))
  }
  if (params.operation) {
    conditions.push(eq(croutonEvents.operation, params.operation))
  }
  if (params.userId) {
    conditions.push(eq(croutonEvents.userId, params.userId))
  }
  if (params.dateFrom && !isNaN(params.dateFrom.getTime())) {
    conditions.push(gte(croutonEvents.timestamp, params.dateFrom))
  }
  if (params.dateTo && !isNaN(params.dateTo.getTime())) {
    conditions.push(lte(croutonEvents.timestamp, params.dateTo))
  }

  return conditions
}

/** Parse common event filter query params from an H3 event */
export function parseEventFilterQuery(query: Record<string, any>) {
  return {
    collectionName: query.collectionName as string | undefined,
    operation: query.operation as 'create' | 'update' | 'delete' | undefined,
    userId: query.userId as string | undefined,
    dateFrom: query.dateFrom ? new Date(String(query.dateFrom)) : undefined,
    dateTo: query.dateTo ? new Date(String(query.dateTo)) : undefined,
  }
}
