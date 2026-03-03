// Generated with JSON field post-processing support (v2025-01-11)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { BikeshedRoomType, NewBikeshedRoomType } from '../../types'
import { user } from '~~/server/db/schema'

export async function getAllBikeshedRoomTypes(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const roomTypes = await (db as any)
    .select({
      ...tables.bikeshedRoomTypes,
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
    .from(tables.bikeshedRoomTypes)
    .leftJoin(ownerUser, eq(tables.bikeshedRoomTypes.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.bikeshedRoomTypes.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.bikeshedRoomTypes.updatedBy, updatedByUser.id))
    .where(eq(tables.bikeshedRoomTypes.teamId, teamId))
    .orderBy(desc(tables.bikeshedRoomTypes.createdAt))

  return roomTypes
}

export async function getBikeshedRoomTypesByIds(teamId: string, roomTypeIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const roomTypes = await (db as any)
    .select({
      ...tables.bikeshedRoomTypes,
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
    .from(tables.bikeshedRoomTypes)
    .leftJoin(ownerUser, eq(tables.bikeshedRoomTypes.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.bikeshedRoomTypes.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.bikeshedRoomTypes.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.bikeshedRoomTypes.teamId, teamId),
        inArray(tables.bikeshedRoomTypes.id, roomTypeIds)
      )
    )
    .orderBy(desc(tables.bikeshedRoomTypes.createdAt))

  return roomTypes
}

export async function createBikeshedRoomType(data: NewBikeshedRoomType) {
  const db = useDB()

  const [roomType] = await (db as any)
    .insert(tables.bikeshedRoomTypes)
    .values(data)
    .returning()

  return roomType
}

export async function updateBikeshedRoomType(
  recordId: string,
  teamId: string,
  userId: string,
  updates: Partial<BikeshedRoomType>,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.bikeshedRoomTypes.id, recordId),
    eq(tables.bikeshedRoomTypes.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.bikeshedRoomTypes.owner, userId))
  }

  const [roomType] = await (db as any)
    .update(tables.bikeshedRoomTypes)
    .set({
      ...updates,
      updatedBy: userId
    })
    .where(and(...conditions))
    .returning()

  if (!roomType) {
    throw createError({
      status: 404,
      statusText: 'BikeshedRoomType not found or unauthorized'
    })
  }

  return roomType
}

export async function deleteBikeshedRoomType(
  recordId: string,
  teamId: string,
  userId: string,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.bikeshedRoomTypes.id, recordId),
    eq(tables.bikeshedRoomTypes.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.bikeshedRoomTypes.owner, userId))
  }

  const [deleted] = await (db as any)
    .delete(tables.bikeshedRoomTypes)
    .where(and(...conditions))
    .returning()

  if (!deleted) {
    throw createError({
      status: 404,
      statusText: 'BikeshedRoomType not found or unauthorized'
    })
  }

  return { success: true }
}