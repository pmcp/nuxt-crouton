import { defineEventHandler, getQuery } from 'h3'
import { desc, eq, and, gte, lte } from 'drizzle-orm'

/**
 * Get persisted events from the events package
 * Only returns data when nuxt-crouton-events is installed
 * GET /__nuxt_crouton_devtools/api/events?collection=users&operation=create&itemId=abc123&limit=50
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  // Check if events package is available
  if (!config.croutonDevtools?.hasEventsPackage) {
    return {
      success: false,
      available: false,
      message: 'Events package not installed',
      data: []
    }
  }

  const query = getQuery(event)

  // Build filters
  const filters: Record<string, string> = {}
  if (query.collection) filters.collectionName = String(query.collection)
  if (query.operation) filters.operation = String(query.operation)
  if (query.userId) filters.userId = String(query.userId)
  if (query.itemId) filters.itemId = String(query.itemId)
  if (query.dateFrom) filters.dateFrom = String(query.dateFrom)
  if (query.dateTo) filters.dateTo = String(query.dateTo)

  const limit = query.limit ? Number.parseInt(String(query.limit), 10) : 50

  try {
    // Try to dynamically fetch events from the events collection
    // This works because the events package generates a collection
    const db = useDB()

    // Attempt to import the events schema dynamically
    let eventsData: any[] = []

    try {
      // Try common schema locations
      const possibleSchemas = [
        () => import('~~/layers/events/collections/collectionEvents/server/database/schema'),
        () => import('~~/collections/croutonEvents/server/database/schema'),
        () => import('~~/server/database/schema').then(m => ({ eventsCollectionEvents: m.croutonEvents }))
      ]

      for (const schemaLoader of possibleSchemas) {
        try {
          const schema = await schemaLoader()
          const table = schema.eventsCollectionEvents || schema.collectionEvents || schema.croutonEvents

          if (table) {
            // Build where conditions based on filters
            const conditions = []

            if (filters.collectionName) {
              conditions.push(eq(table.collectionName, filters.collectionName))
            }
            if (filters.operation) {
              conditions.push(eq(table.operation, filters.operation))
            }
            if (filters.userId) {
              conditions.push(eq(table.userId, filters.userId))
            }
            if (filters.itemId) {
              conditions.push(eq(table.itemId, filters.itemId))
            }
            if (filters.dateFrom) {
              conditions.push(gte(table.timestamp, new Date(filters.dateFrom)))
            }
            if (filters.dateTo) {
              conditions.push(lte(table.timestamp, new Date(filters.dateTo)))
            }

            // Build query with conditions
            let queryBuilder = db.select().from(table)

            if (conditions.length > 0) {
              queryBuilder = queryBuilder.where(and(...conditions)) as any
            }

            eventsData = await queryBuilder
              .limit(limit)
              .orderBy(desc(table.timestamp))

            break
          }
        } catch {
          // Schema not found at this location, try next
          continue
        }
      }
    } catch (err) {
      console.warn('[DevTools Events] Could not load events schema:', err)
    }

    return {
      success: true,
      available: true,
      data: eventsData,
      count: eventsData.length,
      filters
    }
  } catch (err) {
    return {
      success: false,
      available: true,
      error: err instanceof Error ? err.message : 'Unknown error',
      data: []
    }
  }
})
