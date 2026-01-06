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
import { resolveTeamAndCheckMembership } from '@friendlyinternet/nuxt-crouton-auth/server/utils/team'
import { bookingsBookings } from '~~/layers/bookings/collections/bookings/server/database/schema'
import {
  isBookingEmailEnabled,
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
      statusCode: 400,
      statusMessage: 'No bookings provided',
    })
  }

  // Limit batch size to prevent abuse
  if (body.bookings.length > 20) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Maximum 20 bookings per batch',
    })
  }

  // Transform cart items to database records
  const bookingsToInsert = body.bookings.flatMap((item) => {
    // For inventory mode, create multiple bookings based on quantity
    if (item.isInventoryMode && item.quantity && item.quantity > 1) {
      return Array.from({ length: item.quantity }, () => ({
        teamId: team.id,
        owner: user.id,
        location: item.locationId,
        date: new Date(item.date),
        slot: null, // No slot for inventory mode
        group: item.groupId || null,
        status: 'active',
        createdBy: user.id,
        updatedBy: user.id,
      }))
    }

    // Slot mode or single inventory item
    return [{
      teamId: team.id,
      owner: user.id,
      location: item.locationId,
      date: new Date(item.date),
      slot: item.slotId ? [item.slotId] : null, // Array for JSON column
      group: item.groupId || null,
      status: 'active',
      createdBy: user.id,
      updatedBy: user.id,
    }]
  })

  const db = useDB()

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
      statusCode: 500,
      statusMessage: 'Failed to create bookings',
    })
  }
})
