/**
 * Resend email for a specific booking
 * POST /api/crouton-bookings/teams/[id]/bookings/[bookingId]/resend-email
 *
 * Requires:
 * - Email module enabled: runtimeConfig.croutonBookings.email.enabled = true
 * - @friendlyinternet/crouton-email installed and configured
 * - Email template and log schemas generated (optional but recommended)
 *
 * Body: { triggerType: 'booking_confirmed' | 'reminder_before' | 'booking_cancelled' | 'follow_up_after' }
 */
import { z } from 'zod'
import {
  isBookingEmailEnabled,
  getBookingEmailService,
  buildBookingEmailVariables,
  renderBookingEmailTemplate,
  type BookingEmailTriggerType
} from '../../../../../utils/booking-emails'

const bodySchema = z.object({
  triggerType: z.enum(['booking_confirmed', 'reminder_before', 'booking_cancelled', 'follow_up_after'])
})

export default defineEventHandler(async (event) => {
  // Check if email module is enabled
  if (!isBookingEmailEnabled()) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Email module is not enabled. Set runtimeConfig.croutonBookings.email.enabled = true'
    })
  }

  const { id: teamId, bookingId } = getRouterParams(event)

  // Validate request body
  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid request body. Expected { triggerType: "booking_confirmed" | "reminder_before" | "booking_cancelled" | "follow_up_after" }'
    })
  }

  const { triggerType } = parsed.data

  // Get email service
  const emailService = await getBookingEmailService()
  if (!emailService) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Email service not available. Ensure @friendlyinternet/crouton-email is installed and configured.'
    })
  }

  // Note: The consuming app needs to provide these functions
  // This package provides the API structure; the app provides the data access
  // Check if the app has registered booking email handlers

  // For now, we emit an event that the consuming app can handle
  // Apps can implement their own email logic by:
  // 1. Defining a nitro plugin that registers hooks
  // 2. Or by overriding this endpoint in their own server/api folder

  // Return a helpful error for now - apps need to implement the full flow
  throw createError({
    statusCode: 501,
    statusMessage: `Email resend for trigger "${triggerType}" not implemented. ` +
      'To implement: Override this endpoint in your app or register booking email hooks. ' +
      'See crouton-bookings documentation for setup instructions.'
  })
})
