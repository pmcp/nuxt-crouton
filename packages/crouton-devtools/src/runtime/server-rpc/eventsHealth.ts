import { defineEventHandler } from 'h3'

/**
 * Get events health statistics
 * GET /__nuxt_crouton_devtools/api/events/health
 */
export default defineEventHandler(async () => {
  const config = useRuntimeConfig()

  // Check if events package is available
  if (!config.croutonDevtools?.hasEventsPackage) {
    return {
      success: false,
      available: false,
      message: 'Events package not installed'
    }
  }

  try {
    const db = useDB()
    let totalEvents = 0
    let todayEvents = 0
    let thisWeekEvents = 0
    let collections: string[] = []
    const byOperation: Record<string, number> = { create: 0, update: 0, delete: 0 }
    const byCollection: Record<string, number> = {}
    let oldestEvent: Date | null = null
    let newestEvent: Date | null = null

    try {
      // Try to get basic stats from the events table
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
            // Get all events for statistics
            const allEvents = await db.select().from(table)
            totalEvents = allEvents.length

            // Calculate date-based counts
            const now = new Date()
            const today = new Date(now)
            today.setHours(0, 0, 0, 0)

            const weekAgo = new Date(now)
            weekAgo.setDate(weekAgo.getDate() - 7)

            for (const evt of allEvents as any[]) {
              const timestamp = new Date(evt.timestamp)

              // Today count
              if (timestamp >= today) {
                todayEvents++
              }

              // This week count
              if (timestamp >= weekAgo) {
                thisWeekEvents++
              }

              // Operation breakdown
              if (evt.operation && byOperation.hasOwnProperty(evt.operation)) {
                byOperation[evt.operation]++
              }

              // Collection breakdown
              if (evt.collectionName) {
                byCollection[evt.collectionName] = (byCollection[evt.collectionName] || 0) + 1
              }

              // Track oldest/newest
              if (!oldestEvent || timestamp < oldestEvent) {
                oldestEvent = timestamp
              }
              if (!newestEvent || timestamp > newestEvent) {
                newestEvent = timestamp
              }
            }

            // Get unique collections
            collections = Object.keys(byCollection).sort()

            break
          }
        } catch {
          continue
        }
      }
    } catch (err) {
      console.warn('[DevTools Events Health] Could not query events:', err)
    }

    // Determine health status based on recent activity
    let status: 'healthy' | 'warning' | 'inactive' = 'healthy'
    if (totalEvents === 0) {
      status = 'inactive'
    } else if (todayEvents === 0 && thisWeekEvents === 0) {
      status = 'warning'
    }

    return {
      success: true,
      available: true,
      data: {
        status,
        totalEvents,
        todayEvents,
        thisWeekEvents,
        collectionsTracked: collections.length,
        collections,
        byOperation,
        byCollection,
        oldestEvent: oldestEvent?.toISOString() || null,
        newestEvent: newestEvent?.toISOString() || null,
        // Success rate is 100% for tracked events (failures would be untracked)
        successRate: 100,
        failedEvents: 0
      }
    }
  } catch (err) {
    return {
      success: false,
      available: true,
      error: err instanceof Error ? err.message : 'Unknown error'
    }
  }
})
