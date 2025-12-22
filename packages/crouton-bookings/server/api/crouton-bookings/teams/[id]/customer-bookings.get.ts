/**
 * Customer-facing endpoint - returns only bookings created by the current user
 *
 * Supports date range queries: ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 *
 * Response includes:
 * - Booking details with location data
 * - Owner and creator user info
 * - Email stats (if email module is enabled)
 */
import { eq, and, asc, gte, lte, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import { resolveTeamAndCheckMembership } from '@crouton/auth/server'
import { bookingsBookings } from '~~/layers/bookings/collections/bookings/server/database/schema'
import { bookingsLocations } from '~~/layers/bookings/collections/locations/server/database/schema'
import { users } from '~~/server/database/schema'

interface EmailStats {
  total: number
  sent: number
  pending: number
  failed: number
}

export default defineEventHandler(async (event) => {
  const { team, user } = await resolveTeamAndCheckMembership(event)
  const db = useDB()

  // Parse optional date range query params
  const query = getQuery(event)
  const startDate = query.startDate ? new Date(String(query.startDate)) : null
  const endDate = query.endDate ? new Date(String(query.endDate)) : null

  const ownerUsers = alias(users, 'ownerUsers')
  const createdByUsers = alias(users, 'createdByUsers')

  // Build where conditions
  const conditions = [
    eq(bookingsBookings.teamId, team.id),
    eq(bookingsBookings.createdBy, user.id),
  ]

  // Add date range conditions if provided
  if (startDate && !isNaN(startDate.getTime())) {
    conditions.push(gte(bookingsBookings.date, startDate))
  }
  if (endDate && !isNaN(endDate.getTime())) {
    conditions.push(lte(bookingsBookings.date, endDate))
  }

  // Get bookings created by this user
  const bookings = await db
    .select({
      id: bookingsBookings.id,
      teamId: bookingsBookings.teamId,
      owner: bookingsBookings.owner,
      location: bookingsBookings.location,
      date: bookingsBookings.date,
      slot: bookingsBookings.slot,
      group: bookingsBookings.group,
      status: bookingsBookings.status,
      createdAt: bookingsBookings.createdAt,
      updatedAt: bookingsBookings.updatedAt,
      createdBy: bookingsBookings.createdBy,
      updatedBy: bookingsBookings.updatedBy,
      locationData: bookingsLocations,
      ownerUser: {
        id: ownerUsers.id,
        name: ownerUsers.name,
        email: ownerUsers.email,
        avatarUrl: ownerUsers.avatarUrl,
      },
      createdByUser: {
        id: createdByUsers.id,
        name: createdByUsers.name,
        email: createdByUsers.email,
        avatarUrl: createdByUsers.avatarUrl,
      },
    })
    .from(bookingsBookings)
    .leftJoin(bookingsLocations, eq(bookingsBookings.location, bookingsLocations.id))
    .leftJoin(ownerUsers, eq(bookingsBookings.owner, ownerUsers.id))
    .leftJoin(createdByUsers, eq(bookingsBookings.createdBy, createdByUsers.id))
    .where(and(...conditions))
    .orderBy(asc(bookingsBookings.date))

  // Try to get email stats if email module is enabled (gracefully handle missing table)
  const bookingIds = bookings.map(b => b.id)
  const emailStatsMap = new Map<string, EmailStats>()

  if (bookingIds.length > 0) {
    try {
      // Dynamic import to handle optional email module
      const { bookingsEmaillogs } = await import('~~/layers/bookings/collections/emaillogs/server/database/schema')

      const emailLogs = await db
        .select({
          bookingId: bookingsEmaillogs.bookingId,
          status: bookingsEmaillogs.status,
        })
        .from(bookingsEmaillogs)
        .where(inArray(bookingsEmaillogs.bookingId, bookingIds))

      // Aggregate stats by bookingId
      for (const log of emailLogs) {
        if (!log.bookingId) continue
        const stats = emailStatsMap.get(log.bookingId) || { total: 0, sent: 0, pending: 0, failed: 0 }
        stats.total++
        if (log.status === 'sent') stats.sent++
        else if (log.status === 'pending') stats.pending++
        else if (log.status === 'failed') stats.failed++
        emailStatsMap.set(log.bookingId, stats)
      }
    }
    catch {
      // Email module not enabled - skip email stats
    }
  }

  // Attach email stats to each booking
  const bookingsWithStats = bookings.map(booking => ({
    ...booking,
    emailStats: emailStatsMap.get(booking.id) || null,
  }))

  // If date params were provided, return with metadata
  // Otherwise return just the array for backwards compatibility
  if (startDate || endDate) {
    return {
      items: bookingsWithStats,
      dateRange: {
        startDate: startDate?.toISOString().split('T')[0] || null,
        endDate: endDate?.toISOString().split('T')[0] || null,
      },
    }
  }

  // Backwards compatible: return array directly
  return bookingsWithStats
})
