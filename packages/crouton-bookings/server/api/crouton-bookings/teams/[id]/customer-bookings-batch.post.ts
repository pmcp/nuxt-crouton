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
 *   bookings: Booking[]
 * }
 */
import { resolveTeamAndCheckMembership } from '@crouton/auth/server'
import { bookingsBookings } from '~~/layers/bookings/collections/bookings/server/database/schema'

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

    return {
      success: true,
      count: created.length,
      bookings: created,
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
