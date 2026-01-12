/**
 * Customer-facing endpoint - returns only bookings created by the current user
 *
 * Supports date range queries: ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 *
 * Response includes:
 * - Booking details with location data
 * - Email stats and actions (when email module is enabled)
 */
import { eq, and, asc, gte, lte } from 'drizzle-orm'
import { resolveTeamAndCheckMembership } from '@friendlyinternet/nuxt-crouton-auth/server/utils/team'
import { user as userTable } from '@friendlyinternet/nuxt-crouton-auth/server/database/schema/auth'
import { bookingsBookings } from '~~/layers/bookings/collections/bookings/server/database/schema'
import { bookingsLocations } from '~~/layers/bookings/collections/locations/server/database/schema'
import { isBookingEmailEnabled } from '../../../../utils/booking-emails'
import { getBookingEmailStats, getBookingEmailDetails } from '../../../../utils/email-service'

export default defineEventHandler(async (event) => {
  const { team, user } = await resolveTeamAndCheckMembership(event)
  const db = useDB()

  // Check if email is enabled
  const emailEnabled = isBookingEmailEnabled()

  // Parse optional date range query params
  const query = getQuery(event)
  const startDate = query.startDate ? new Date(String(query.startDate)) : null
  const endDate = query.endDate ? new Date(String(query.endDate)) : null

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
      locationData: {
        id: bookingsLocations.id,
        title: bookingsLocations.title,
        color: bookingsLocations.color,
        street: bookingsLocations.street,
        zip: bookingsLocations.zip,
        city: bookingsLocations.city,
        location: bookingsLocations.location,
        slots: bookingsLocations.slots,
        inventoryMode: bookingsLocations.inventoryMode,
        quantity: bookingsLocations.quantity,
      },
      createdByUser: {
        id: userTable.id,
        name: userTable.name,
        email: userTable.email,
        avatarUrl: userTable.image,
      },
    })
    .from(bookingsBookings)
    .leftJoin(bookingsLocations, eq(bookingsBookings.location, bookingsLocations.id))
    .leftJoin(userTable, eq(bookingsBookings.createdBy, userTable.id))
    .where(and(...conditions))
    .orderBy(asc(bookingsBookings.date))

  // Build available email actions based on booking status
  function getEmailActionsForBooking(booking: { status: string }) {
    if (!emailEnabled) return []

    const actions = []

    // Can always resend booking confirmation
    actions.push({
      triggerType: 'booking_created',
      label: 'Resend Confirmation',
      icon: 'i-lucide-mail-check'
    })

    // Cancelled bookings can resend cancellation notice
    if (booking.status === 'cancelled') {
      actions.push({
        triggerType: 'booking_cancelled',
        label: 'Resend Cancellation',
        icon: 'i-lucide-mail-x'
      })
    }

    return actions
  }

  // Add email data when email is enabled
  let enrichedBookings = bookings
  if (emailEnabled) {
    enrichedBookings = await Promise.all(
      bookings.map(async (booking) => {
        const [emailStats, emailDetails] = await Promise.all([
          getBookingEmailStats(booking.id, team.id),
          getBookingEmailDetails(booking.id, team.id, booking.date)
        ])
        return {
          ...booking,
          emailStats,
          emailDetails,
          emailActions: getEmailActionsForBooking(booking)
        }
      })
    )
  }

  // If date params were provided, return with metadata
  // Otherwise return just the array for backwards compatibility
  if (startDate || endDate) {
    return {
      items: enrichedBookings,
      dateRange: {
        startDate: startDate?.toISOString().split('T')[0] || null,
        endDate: endDate?.toISOString().split('T')[0] || null,
      },
    }
  }

  // Backwards compatible: return array directly
  return enrichedBookings
})
