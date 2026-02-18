// Generated with JSON field post-processing support (v2025-01-11)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { BookingsAppExt:bookings:booking, NewBookingsAppExt:bookings:booking } from '../../types'
import { user } from '~~/server/db/schema'

export async function getAllBookingsAppExt:bookings:bookings(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const ext:bookings:bookings = await (db as any)
    .select({
      ...tables.bookingsAppExt:bookings:bookings,
      ownerUser: {
        id: ownerUser.id,
        name: ownerUser.name,
        email: ownerUser.email,
        image: ownerUser.image
      },
      createdByUser: {
        id: createdByUser.id,
        name: createdByUser.name,
        email: createdByUser.email,
        image: createdByUser.image
      },
      updatedByUser: {
        id: updatedByUser.id,
        name: updatedByUser.name,
        email: updatedByUser.email,
        image: updatedByUser.image
      }
    } as any)
    .from(tables.bookingsAppExt:bookings:bookings)
    .leftJoin(ownerUser, eq(tables.bookingsAppExt:bookings:bookings.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.bookingsAppExt:bookings:bookings.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.bookingsAppExt:bookings:bookings.updatedBy, updatedByUser.id))
    .where(eq(tables.bookingsAppExt:bookings:bookings.teamId, teamId))
    .orderBy(desc(tables.bookingsAppExt:bookings:bookings.createdAt))

  return ext:bookings:bookings
}

export async function getBookingsAppExt:bookings:bookingsByIds(teamId: string, ext:bookings:bookingIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const ext:bookings:bookings = await (db as any)
    .select({
      ...tables.bookingsAppExt:bookings:bookings,
      ownerUser: {
        id: ownerUser.id,
        name: ownerUser.name,
        email: ownerUser.email,
        image: ownerUser.image
      },
      createdByUser: {
        id: createdByUser.id,
        name: createdByUser.name,
        email: createdByUser.email,
        image: createdByUser.image
      },
      updatedByUser: {
        id: updatedByUser.id,
        name: updatedByUser.name,
        email: updatedByUser.email,
        image: updatedByUser.image
      }
    } as any)
    .from(tables.bookingsAppExt:bookings:bookings)
    .leftJoin(ownerUser, eq(tables.bookingsAppExt:bookings:bookings.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.bookingsAppExt:bookings:bookings.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.bookingsAppExt:bookings:bookings.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.bookingsAppExt:bookings:bookings.teamId, teamId),
        inArray(tables.bookingsAppExt:bookings:bookings.id, ext:bookings:bookingIds)
      )
    )
    .orderBy(desc(tables.bookingsAppExt:bookings:bookings.createdAt))

  return ext:bookings:bookings
}

export async function createBookingsAppExt:bookings:booking(data: NewBookingsAppExt:bookings:booking) {
  const db = useDB()

  const [ext:bookings:booking] = await (db as any)
    .insert(tables.bookingsAppExt:bookings:bookings)
    .values(data)
    .returning()

  return ext:bookings:booking
}

export async function updateBookingsAppExt:bookings:booking(
  recordId: string,
  teamId: string,
  ownerId: string,
  updates: Partial<BookingsAppExt:bookings:booking>
) {
  const db = useDB()

  const [ext:bookings:booking] = await (db as any)
    .update(tables.bookingsAppExt:bookings:bookings)
    .set({
      ...updates,
      updatedBy: ownerId
    })
    .where(
      and(
        eq(tables.bookingsAppExt:bookings:bookings.id, recordId),
        eq(tables.bookingsAppExt:bookings:bookings.teamId, teamId),
        eq(tables.bookingsAppExt:bookings:bookings.owner, ownerId)
      )
    )
    .returning()

  if (!ext:bookings:booking) {
    throw createError({
      status: 404,
      statusText: 'BookingsAppExt:bookings:booking not found or unauthorized'
    })
  }

  return ext:bookings:booking
}

export async function deleteBookingsAppExt:bookings:booking(
  recordId: string,
  teamId: string,
  ownerId: string
) {
  const db = useDB()

  const [deleted] = await (db as any)
    .delete(tables.bookingsAppExt:bookings:bookings)
    .where(
      and(
        eq(tables.bookingsAppExt:bookings:bookings.id, recordId),
        eq(tables.bookingsAppExt:bookings:bookings.teamId, teamId),
        eq(tables.bookingsAppExt:bookings:bookings.owner, ownerId)
      )
    )
    .returning()

  if (!deleted) {
    throw createError({
      status: 404,
      statusText: 'BookingsAppExt:bookings:booking not found or unauthorized'
    })
  }

  return { success: true }
}