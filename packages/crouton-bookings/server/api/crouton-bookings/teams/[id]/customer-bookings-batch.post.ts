/**
 * Batch create bookings endpoint - creates multiple bookings in a single transaction
 *
 * Used for cart checkout - creates all items in the cart as bookings
 *
 * Request body:
 * {
 *   bookings: CartItem[]
 * }
 *
 * Response:
 * {
 *   success: true,
 *   count: number,
 *   bookings: Booking[],
 *   emailsSent?: number
 * }
 */
import { eq, and, gte, lte, sum } from 'drizzle-orm'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { bookingsBookings } from '~~/layers/bookings/collections/bookings/server/database/schema'
import { bookingsLocations } from '~~/layers/bookings/collections/locations/server/database/schema'
import { isBookingEmailEnabled } from '../../../../utils/booking-emails'
import {
  triggerBookingCreatedEmail,
  type BookingEmailContext
} from '../../../../utils/email-service'

interface CartItem {
  id: string
  locationId: string
  locationTitle: string
  date: string
  slotId?: string
  slotLabel?: string
  groupId?: string | null
  groupLabel?: string | null
  quantity?: number // For inventory mode
  isInventoryMode?: boolean
}

interface BatchRequestBody {
  bookings: CartItem[]
}

export default defineEventHandler(async (event) => {
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const body = await readBody<BatchRequestBody>(event)

  if (!body.bookings || !Array.isArray(body.bookings) || body.bookings.length === 0) {
    throw createError({
      status: 400,
      statusText: 'No bookings provided',
    })
  }

  // Limit batch size to prevent abuse
  if (body.bookings.length > 20) {
    throw createError({
      status: 400,
      statusText: 'Maximum 20 bookings per batch',
    })
  }

  // --- Monthly booking limit enforcement ---
  // Collect unique (locationId, month) pairs from the cart items
  const locationMonthPairs = new Map<string, Set<string>>()
  for (const item of body.bookings) {
    const itemDate = new Date(item.date)
    const monthKey = `${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, '0')}`
    if (!locationMonthPairs.has(item.locationId)) {
      locationMonthPairs.set(item.locationId, new Set())
    }
    locationMonthPairs.get(item.locationId)!.add(monthKey)
  }

  const db = useDB()

  // Check limits for each location
  const locationIds = [...locationMonthPairs.keys()]
  if (locationIds.length > 0) {
    const locations = await db
      .select({
        id: bookingsLocations.id,
        title: bookingsLocations.title,
        maxBookingsPerMonth: bookingsLocations.maxBookingsPerMonth,
      })
      .from(bookingsLocations)
      .where(
        and(
          eq(bookingsLocations.teamId, team.id),
        ),
      )

    const locationMap = new Map(locations.map(l => [l.id, l]))

    for (const [locationId, months] of locationMonthPairs) {
      const location = locationMap.get(locationId)
      if (!location?.maxBookingsPerMonth) continue

      const limit = location.maxBookingsPerMonth

      for (const monthKey of months) {
        const [year, month] = monthKey.split('-').map(Number)
        const monthStart = new Date(year!, month! - 1, 1)
        const monthEnd = new Date(year!, month!, 0, 23, 59, 59, 999)

        // Sum existing active booking quantities for this user/location/month
        const existingResult = await db
          .select({ total: sum(bookingsBookings.quantity) })
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

        const existingCount = Number(existingResult[0]?.total) || 0

        // Sum quantities of new items in this batch targeting the same location/month
        const newCount = body.bookings
          .filter((item) => {
            const d = new Date(item.date)
            const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            return item.locationId === locationId && m === monthKey
          })
          .reduce((acc, item) => acc + (item.quantity ?? 1), 0)

        if (existingCount + newCount > limit) {
          const remaining = Math.max(0, limit - existingCount)
          throw createError({
            status: 400,
            statusText: `Monthly booking limit reached for "${location.title}". Limit: ${limit} per month, existing: ${existingCount}, trying to add: ${newCount}. You can add ${remaining} more.`,
          })
        }
      }
    }
  }

  // Transform cart items to database records (one row per cart item, quantity stored on the row)
  const bookingsToInsert = body.bookings.map((item) => ({
    teamId: team.id,
    owner: user.id,
    location: item.locationId,
    date: new Date(item.date),
    slot: item.slotId && item.slotId !== 'inventory' ? [item.slotId] : null, // Array for JSON column
    quantity: item.isInventoryMode ? (item.quantity ?? 1) : 1,
    group: item.groupId || null,
    status: 'active',
    createdBy: user.id,
    updatedBy: user.id,
  }))

  try {
    // Insert all bookings in a single transaction
    const created = await db
      .insert(bookingsBookings)
      .values(bookingsToInsert)
      .returning()

    // Trigger booking_created emails (non-blocking)
    let emailsSent = 0
    if (isBookingEmailEnabled() && created.length > 0) {
      // Build a map of locationId -> cart item for location titles
      const locationMap = new Map(
        body.bookings.map(item => [item.locationId, item])
      )

      // Send emails in background - don't block checkout
      const emailPromises = created.map(async (booking) => {
        const cartItem = locationMap.get(booking.location)

        // Build booking context with available data
        const bookingContext: BookingEmailContext = {
          id: booking.id,
          teamId: booking.teamId,
          owner: booking.owner,
          location: booking.location,
          date: booking.date,
          slot: booking.slot,
          status: booking.status,
          locationData: {
            id: booking.location,
            name: cartItem?.locationTitle || 'Location'
          },
          ownerUser: {
            id: user.id,
            name: user.name || 'Customer',
            email: user.email || ''
          },
          teamName: team.name
        }

        try {
          const result = await triggerBookingCreatedEmail(
            bookingContext,
            team.id,
            user.id
          )
          return result.success ? 1 : 0
        }
        catch (err) {
          console.error('[batch-bookings] Email trigger failed:', err)
          return 0
        }
      })

      // Wait for all emails to be triggered (with timeout)
      try {
        const results = await Promise.race([
          Promise.all(emailPromises),
          new Promise<number[]>(resolve =>
            setTimeout(() => resolve([]), 5000) // 5s timeout
          )
        ])
        emailsSent = results.reduce((sum, n) => sum + n, 0)
      }
      catch {
        // Continue even if email sending fails
      }
    }

    return {
      success: true,
      count: created.length,
      bookings: created,
      ...(emailsSent > 0 && { emailsSent })
    }
  }
  catch (error: unknown) {
    console.error('Failed to create batch bookings:', error)
    throw createError({
      status: 500,
      statusText: 'Failed to create bookings',
    })
  }
})
