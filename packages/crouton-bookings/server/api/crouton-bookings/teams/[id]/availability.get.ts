/**
 * Get booking availability for a date range
 *
 * Supports both slot-based (which slots are booked) and inventory-based (count of bookings)
 *
 * Query params:
 * - locationId: string (required)
 * - startDate: ISO date string (required)
 * - endDate: ISO date string (required)
 *
 * Response format:
 * {
 *   "2024-01-15": { bookedSlots: ["slot-1", "slot-2"], bookedCount: 2 },
 *   "2024-01-16": { bookedSlots: ["all-day"], bookedCount: 1 }
 * }
 */
import { eq, and, gte, lte, sql } from 'drizzle-orm'
import { resolveTeamAndCheckMembership } from '@crouton/auth/server'
import { bookingsBookings } from '~~/layers/bookings/collections/bookings/server/database/schema'

export default defineEventHandler(async (event) => {
  await resolveTeamAndCheckMembership(event)

  const query = getQuery(event)
  const locationId = query.locationId as string
  const startDateStr = query.startDate as string
  const endDateStr = query.endDate as string

  if (!locationId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'locationId is required'
    })
  }

  if (!startDateStr || !endDateStr) {
    throw createError({
      statusCode: 400,
      statusMessage: 'startDate and endDate are required'
    })
  }

  const startDate = new Date(startDateStr)
  const endDate = new Date(endDateStr)

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid date format'
    })
  }

  const db = useDB()

  // Get all bookings for the location in the date range
  const bookings = await db
    .select({
      date: bookingsBookings.date,
      slot: bookingsBookings.slot
    })
    .from(bookingsBookings)
    .where(
      and(
        eq(bookingsBookings.location, locationId),
        eq(bookingsBookings.status, 'active'),
        gte(bookingsBookings.date, startDate),
        lte(bookingsBookings.date, endDate)
      )
    )

  // Aggregate by date
  const availabilityData: Record<string, { bookedSlots: string[], bookedCount: number }> = {}

  for (const booking of bookings) {
    const dateKey = booking.date instanceof Date
      ? booking.date.toISOString().substring(0, 10)
      : new Date(booking.date as string).toISOString().substring(0, 10)

    if (!availabilityData[dateKey]) {
      availabilityData[dateKey] = { bookedSlots: [], bookedCount: 0 }
    }

    // Parse slot (can be JSON string or array)
    let slotIds: string[] = []
    if (booking.slot) {
      if (typeof booking.slot === 'string') {
        try {
          slotIds = JSON.parse(booking.slot)
        } catch {
          slotIds = [booking.slot]
        }
      } else if (Array.isArray(booking.slot)) {
        slotIds = booking.slot
      }
    }

    availabilityData[dateKey].bookedSlots.push(...slotIds)
    availabilityData[dateKey].bookedCount++
  }

  return availabilityData
})
