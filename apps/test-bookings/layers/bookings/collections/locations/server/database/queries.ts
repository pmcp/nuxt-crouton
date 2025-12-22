// Generated with array reference post-processing support (v2024-10-12)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { BookingsLocation, NewBookingsLocation } from '../../types'
import { user } from '~~/server/db/schema'

export async function getAllBookingsLocations(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const locations = await (db as any)
    .select({
      ...tables.bookingsLocations,
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
    .from(tables.bookingsLocations)
    .leftJoin(ownerUser, eq(tables.bookingsLocations.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.bookingsLocations.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.bookingsLocations.updatedBy, updatedByUser.id))
    .where(eq(tables.bookingsLocations.teamId, teamId))
    .orderBy(desc(tables.bookingsLocations.createdAt))

  return locations
}

export async function getBookingsLocationsByIds(teamId: string, locationIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const locations = await (db as any)
    .select({
      ...tables.bookingsLocations,
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
    .from(tables.bookingsLocations)
    .leftJoin(ownerUser, eq(tables.bookingsLocations.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.bookingsLocations.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.bookingsLocations.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.bookingsLocations.teamId, teamId),
        inArray(tables.bookingsLocations.id, locationIds)
      )
    )
    .orderBy(desc(tables.bookingsLocations.createdAt))

  return locations
}

export async function createBookingsLocation(data: NewBookingsLocation) {
  const db = useDB()

  const [location] = await (db as any)
    .insert(tables.bookingsLocations)
    .values(data)
    .returning()

  return location
}

export async function updateBookingsLocation(
  recordId: string,
  teamId: string,
  ownerId: string,
  updates: Partial<BookingsLocation>
) {
  const db = useDB()

  const [location] = await (db as any)
    .update(tables.bookingsLocations)
    .set({
      ...updates,
      updatedBy: ownerId
    })
    .where(
      and(
        eq(tables.bookingsLocations.id, recordId),
        eq(tables.bookingsLocations.teamId, teamId),
        eq(tables.bookingsLocations.owner, ownerId)
      )
    )
    .returning()

  if (!location) {
    throw createError({
      statusCode: 404,
      statusMessage: 'BookingsLocation not found or unauthorized'
    })
  }

  return location
}

export async function deleteBookingsLocation(
  recordId: string,
  teamId: string,
  ownerId: string
) {
  const db = useDB()

  const [deleted] = await (db as any)
    .delete(tables.bookingsLocations)
    .where(
      and(
        eq(tables.bookingsLocations.id, recordId),
        eq(tables.bookingsLocations.teamId, teamId),
        eq(tables.bookingsLocations.owner, ownerId)
      )
    )
    .returning()

  if (!deleted) {
    throw createError({
      statusCode: 404,
      statusMessage: 'BookingsLocation not found or unauthorized'
    })
  }

  return { success: true }
}