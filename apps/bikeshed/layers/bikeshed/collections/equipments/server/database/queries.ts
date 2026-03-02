// Generated with JSON field post-processing support (v2025-01-11)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { Bookingtest3Equipment, NewBookingtest3Equipment } from '../../types'
import { user } from '~~/server/db/schema'

export async function getAllBookingtest3Equipments(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const equipments = await (db as any)
    .select({
      ...tables.bookingtest3Equipments,
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
    .from(tables.bookingtest3Equipments)
    .leftJoin(ownerUser, eq(tables.bookingtest3Equipments.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.bookingtest3Equipments.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.bookingtest3Equipments.updatedBy, updatedByUser.id))
    .where(eq(tables.bookingtest3Equipments.teamId, teamId))
    .orderBy(desc(tables.bookingtest3Equipments.createdAt))

  return equipments
}

export async function getBookingtest3EquipmentsByIds(teamId: string, equipmentIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const equipments = await (db as any)
    .select({
      ...tables.bookingtest3Equipments,
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
    .from(tables.bookingtest3Equipments)
    .leftJoin(ownerUser, eq(tables.bookingtest3Equipments.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.bookingtest3Equipments.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.bookingtest3Equipments.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.bookingtest3Equipments.teamId, teamId),
        inArray(tables.bookingtest3Equipments.id, equipmentIds)
      )
    )
    .orderBy(desc(tables.bookingtest3Equipments.createdAt))

  return equipments
}

export async function createBookingtest3Equipment(data: NewBookingtest3Equipment) {
  const db = useDB()

  const [equipment] = await (db as any)
    .insert(tables.bookingtest3Equipments)
    .values(data)
    .returning()

  return equipment
}

export async function updateBookingtest3Equipment(
  recordId: string,
  teamId: string,
  userId: string,
  updates: Partial<Bookingtest3Equipment>,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.bookingtest3Equipments.id, recordId),
    eq(tables.bookingtest3Equipments.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.bookingtest3Equipments.owner, userId))
  }

  const [equipment] = await (db as any)
    .update(tables.bookingtest3Equipments)
    .set({
      ...updates,
      updatedBy: userId
    })
    .where(and(...conditions))
    .returning()

  if (!equipment) {
    throw createError({
      status: 404,
      statusText: 'Bookingtest3Equipment not found or unauthorized'
    })
  }

  return equipment
}

export async function deleteBookingtest3Equipment(
  recordId: string,
  teamId: string,
  userId: string,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.bookingtest3Equipments.id, recordId),
    eq(tables.bookingtest3Equipments.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.bookingtest3Equipments.owner, userId))
  }

  const [deleted] = await (db as any)
    .delete(tables.bookingtest3Equipments)
    .where(and(...conditions))
    .returning()

  if (!deleted) {
    throw createError({
      status: 404,
      statusText: 'Bookingtest3Equipment not found or unauthorized'
    })
  }

  return { success: true }
}