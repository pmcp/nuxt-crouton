// Generated with JSON field post-processing support (v2025-01-11)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { Bookingtest3RoomType, NewBookingtest3RoomType } from '../../types'
import { user } from '~~/server/db/schema'

export async function getAllBookingtest3RoomTypes(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const roomTypes = await (db as any)
    .select({
      ...tables.bookingtest3RoomTypes,
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
    .from(tables.bookingtest3RoomTypes)
    .leftJoin(ownerUser, eq(tables.bookingtest3RoomTypes.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.bookingtest3RoomTypes.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.bookingtest3RoomTypes.updatedBy, updatedByUser.id))
    .where(eq(tables.bookingtest3RoomTypes.teamId, teamId))
    .orderBy(desc(tables.bookingtest3RoomTypes.createdAt))

  return roomTypes
}

export async function getBookingtest3RoomTypesByIds(teamId: string, roomTypeIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const roomTypes = await (db as any)
    .select({
      ...tables.bookingtest3RoomTypes,
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
    .from(tables.bookingtest3RoomTypes)
    .leftJoin(ownerUser, eq(tables.bookingtest3RoomTypes.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.bookingtest3RoomTypes.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.bookingtest3RoomTypes.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.bookingtest3RoomTypes.teamId, teamId),
        inArray(tables.bookingtest3RoomTypes.id, roomTypeIds)
      )
    )
    .orderBy(desc(tables.bookingtest3RoomTypes.createdAt))

  return roomTypes
}

export async function createBookingtest3RoomType(data: NewBookingtest3RoomType) {
  const db = useDB()

  const [roomType] = await (db as any)
    .insert(tables.bookingtest3RoomTypes)
    .values(data)
    .returning()

  return roomType
}

export async function updateBookingtest3RoomType(
  recordId: string,
  teamId: string,
  userId: string,
  updates: Partial<Bookingtest3RoomType>,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.bookingtest3RoomTypes.id, recordId),
    eq(tables.bookingtest3RoomTypes.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.bookingtest3RoomTypes.owner, userId))
  }

  const [roomType] = await (db as any)
    .update(tables.bookingtest3RoomTypes)
    .set({
      ...updates,
      updatedBy: userId
    })
    .where(and(...conditions))
    .returning()

  if (!roomType) {
    throw createError({
      status: 404,
      statusText: 'Bookingtest3RoomType not found or unauthorized'
    })
  }

  return roomType
}

export async function deleteBookingtest3RoomType(
  recordId: string,
  teamId: string,
  userId: string,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.bookingtest3RoomTypes.id, recordId),
    eq(tables.bookingtest3RoomTypes.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.bookingtest3RoomTypes.owner, userId))
  }

  const [deleted] = await (db as any)
    .delete(tables.bookingtest3RoomTypes)
    .where(and(...conditions))
    .returning()

  if (!deleted) {
    throw createError({
      status: 404,
      statusText: 'Bookingtest3RoomType not found or unauthorized'
    })
  }

  return { success: true }
}