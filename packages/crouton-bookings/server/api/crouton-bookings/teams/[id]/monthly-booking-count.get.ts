/**
 * Get user's monthly booking count for a location
 *
 * Query params:
 * - locationId: string (required)
 * - month: YYYY-MM (optional, defaults to current month)
 *
 * Response:
 * { count: number, limit: number | null, remaining: number | null }
 */
import { eq, and, gte, lte } from 'drizzle-orm'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { bookingsBookings } from '~~/layers/bookings/collections/bookings/server/database/schema'
import { bookingsLocations } from '~~/layers/bookings/collections/locations/server/database/schema'

export default defineEventHandler(async (event) => {
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const query = getQuery(event)
  const locationId = query.locationId as string
  const monthParam = query.month as string | undefined

  if (!locationId) {
    throw createError({
      status: 400,
      statusText: 'locationId is required',
    })
  }

  // Parse month (YYYY-MM) or default to current month
  let monthStart: Date
  let monthEnd: Date

  if (monthParam) {
    const [year, month] = monthParam.split('-').map(Number)
    if (!year || !month || month < 1 || month > 12) {
      throw createError({
        status: 400,
        statusText: 'Invalid month format. Use YYYY-MM.',
      })
    }
    monthStart = new Date(year, month - 1, 1)
    monthEnd = new Date(year, month, 0, 23, 59, 59, 999)
  }
  else {
    const now = new Date()
    monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
  }

  const db = useDB()

  // Get location to check limit
  const [location] = await db
    .select({ maxBookingsPerMonth: bookingsLocations.maxBookingsPerMonth })
    .from(bookingsLocations)
    .where(
      and(
        eq(bookingsLocations.id, locationId),
        eq(bookingsLocations.teamId, team.id),
      ),
    )

  const limit = location?.maxBookingsPerMonth ?? null

  // Count active bookings by this user for this location in the month
  const bookings = await db
    .select({ id: bookingsBookings.id })
    .from(bookingsBookings)
    .where(
      and(
        eq(bookingsBookings.location, locationId),
        eq(bookingsBookings.createdBy, user.id),
        eq(bookingsBookings.status, 'active'),
        gte(bookingsBookings.date, monthStart),
        lte(bookingsBookings.date, monthEnd),
      ),
    )

  const count = bookings.length

  return {
    count,
    limit,
    remaining: limit ? Math.max(0, limit - count) : null,
  }
})
