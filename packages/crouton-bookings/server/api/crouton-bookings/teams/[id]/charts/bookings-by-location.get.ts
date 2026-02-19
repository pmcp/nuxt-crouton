/**
 * Bookings by Location chart endpoint
 *
 * Returns booking counts grouped by location for the requesting team.
 * Joins with locations table to get the human-readable location title.
 * Used by the 'bookings:by-location' chart preset.
 */
import { count, eq } from 'drizzle-orm'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { bookingsBookings } from '~~/layers/bookings/collections/bookings/server/database/schema'
import { bookingsLocations } from '~~/layers/bookings/collections/locations/server/database/schema'

export default defineEventHandler(async (event) => {
  const { team } = await resolveTeamAndCheckMembership(event)
  const db = useDB()

  const rows = await db
    .select({
      location: bookingsLocations.title,
      count: count()
    })
    .from(bookingsBookings)
    .leftJoin(bookingsLocations, eq(bookingsBookings.location, bookingsLocations.id))
    .where(eq(bookingsBookings.teamId, team.id))
    .groupBy(bookingsBookings.location)
    .orderBy(count())

  return {
    items: rows.map(r => ({
      location: r.location || 'Unknown',
      count: Number(r.count)
    }))
  }
})
