/**
 * Admin-facing endpoint - returns ALL bookings for a team (not just current user's)
 * Includes email stats and details for each booking
 */
import { eq, and, asc, gte, lte } from 'drizzle-orm'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { user as userTable } from '@fyit/crouton-auth/server/database/schema/auth'
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

  // Build where conditions - admin sees ALL team bookings
  const conditions = [
    eq(bookingsBookings.teamId, team.id),
  ]

  // Add date range conditions if provided
  if (startDate && !isNaN(startDate.getTime())) {
    conditions.push(gte(bookingsBookings.date, startDate))
  }
  if (endDate && !isNaN(endDate.getTime())) {
    conditions.push(lte(bookingsBookings.date, endDate))
  }

  // Get all bookings for this team
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
        translations: bookingsLocations.translations,
      },
      ownerUser: {
        id: userTable.id,
        name: userTable.name,
        email: userTable.email,
        avatarUrl: userTable.image,
      },
    })
    .from(bookingsBookings)
    .leftJoin(bookingsLocations, eq(bookingsBookings.location, bookingsLocations.id))
    .leftJoin(userTable, eq(bookingsBookings.owner, userTable.id))
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
          getBookingEmailDetails(booking.id, team.id, booking.date, booking.createdAt)
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

  return enrichedBookings
})
