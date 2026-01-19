/**
 * Resend email for a specific booking
 * POST /api/crouton-bookings/teams/[id]/bookings/[bookingId]/resend-email
 *
 * Requires:
 * - Email module enabled: runtimeConfig.croutonBookings.email.enabled = true
 * - @fyit/crouton-email installed and configured
 * - Email template and log schemas generated
 *
 * Body: { triggerType: 'booking_confirmed' | 'reminder_before' | 'booking_cancelled' | 'follow_up_after' }
 */
import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import {
  isBookingEmailEnabled,
  type BookingEmailTriggerType
} from '../../../../../../utils/booking-emails'
import {
  sendBookingEmails,
  type BookingEmailContext
} from '../../../../../../utils/email-service'

const bodySchema = z.object({
  triggerType: z.enum(['booking_created', 'reminder_before', 'booking_cancelled', 'follow_up_after'])
})

export default defineEventHandler(async (event) => {
  // Check if email module is enabled
  if (!isBookingEmailEnabled()) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Email module is not enabled. Set runtimeConfig.croutonBookings.email.enabled = true'
    })
  }

  const { team, user } = await resolveTeamAndCheckMembership(event)
  const { bookingId } = getRouterParams(event)

  // Validate request body
  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid request body. Expected { triggerType: "booking_created" | "reminder_before" | "booking_cancelled" | "follow_up_after" }'
    })
  }

  const { triggerType } = parsed.data
  const db = useDB()

  // Fetch booking with location data
  let booking: any
  try {
    const { bookingsBookings } = await import(
      '~~/layers/bookings/collections/bookings/server/database/schema'
    )
    const { bookingsLocations } = await import(
      '~~/layers/bookings/collections/locations/server/database/schema'
    )

    const results = await db
      .select({
        id: bookingsBookings.id,
        teamId: bookingsBookings.teamId,
        owner: bookingsBookings.owner,
        location: bookingsBookings.location,
        date: bookingsBookings.date,
        slot: bookingsBookings.slot,
        status: bookingsBookings.status,
        locationData: {
          id: bookingsLocations.id,
          title: bookingsLocations.title,
          street: bookingsLocations.street,
          city: bookingsLocations.city
        }
      })
      .from(bookingsBookings)
      .leftJoin(bookingsLocations, eq(bookingsBookings.location, bookingsLocations.id))
      .where(
        and(
          eq(bookingsBookings.id, bookingId),
          eq(bookingsBookings.teamId, team.id)
        )
      )
      .limit(1)

    booking = results[0]
  }
  catch (error) {
    console.error('[resend-email] Failed to fetch booking:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch booking data'
    })
  }

  if (!booking) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Booking not found'
    })
  }

  // Build booking context for email
  const bookingContext: BookingEmailContext = {
    id: booking.id,
    teamId: booking.teamId,
    owner: booking.owner,
    location: booking.location,
    date: booking.date,
    slot: booking.slot,
    status: booking.status,
    locationData: booking.locationData
      ? {
          id: booking.locationData.id,
          name: booking.locationData.title || 'Location',
          address: [booking.locationData.street, booking.locationData.city]
            .filter(Boolean)
            .join(', ')
        }
      : null,
    ownerUser: {
      id: user.id,
      name: user.name || 'Customer',
      email: user.email || ''
    },
    teamName: team.name
  }

  // Send email
  const result = await sendBookingEmails({
    booking: bookingContext,
    triggerType: triggerType as BookingEmailTriggerType,
    teamId: team.id,
    userId: user.id
  })

  if (!result.success) {
    throw createError({
      statusCode: 500,
      statusMessage: result.errors?.join(', ') || 'Failed to send email'
    })
  }

  return {
    success: true,
    message: `Email resent for trigger: ${triggerType}`,
    customerResult: result.customerResult,
    adminResult: result.adminResult
  }
})
