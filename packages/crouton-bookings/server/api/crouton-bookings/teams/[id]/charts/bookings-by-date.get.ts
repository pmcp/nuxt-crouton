/**
 * Bookings by Date chart endpoint
 *
 * Returns booking counts grouped by date for the requesting team.
 * Used by the 'bookings:by-date' chart preset.
 */
import { count, eq } from 'drizzle-orm'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { bookingsBookings } from '~~/layers/bookings/collections/bookings/server/database/schema'

export default defineEventHandler(async (event) => {
  const { team } = await resolveTeamAndCheckMembership(event)
  const db = useDB()

  const rows = await db
    .select({
      date: bookingsBookings.date,
      count: count()
    })
    .from(bookingsBookings)
    .where(eq(bookingsBookings.teamId, team.id))
    .groupBy(bookingsBookings.date)
    .orderBy(bookingsBookings.date)

  return {
    items: rows.map(r => ({
      date: r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date),
      count: Number(r.count)
    }))
  }
})
