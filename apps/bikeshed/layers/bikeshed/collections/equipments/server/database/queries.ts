// Generated with JSON field post-processing support (v2025-01-11)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { BikeshedEquipment, NewBikeshedEquipment } from '../../types'
import { user } from '~~/server/db/schema'

export async function getAllBikeshedEquipments(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const equipments = await (db as any)
    .select({
      ...tables.bikeshedEquipments,
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
    .from(tables.bikeshedEquipments)
    .leftJoin(ownerUser, eq(tables.bikeshedEquipments.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.bikeshedEquipments.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.bikeshedEquipments.updatedBy, updatedByUser.id))
    .where(eq(tables.bikeshedEquipments.teamId, teamId))
    .orderBy(desc(tables.bikeshedEquipments.createdAt))

  return equipments
}

export async function getBikeshedEquipmentsByIds(teamId: string, equipmentIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const equipments = await (db as any)
    .select({
      ...tables.bikeshedEquipments,
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
    .from(tables.bikeshedEquipments)
    .leftJoin(ownerUser, eq(tables.bikeshedEquipments.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.bikeshedEquipments.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.bikeshedEquipments.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.bikeshedEquipments.teamId, teamId),
        inArray(tables.bikeshedEquipments.id, equipmentIds)
      )
    )
    .orderBy(desc(tables.bikeshedEquipments.createdAt))

  return equipments
}

export async function createBikeshedEquipment(data: NewBikeshedEquipment) {
  const db = useDB()

  const [equipment] = await (db as any)
    .insert(tables.bikeshedEquipments)
    .values(data)
    .returning()

  return equipment
}

export async function updateBikeshedEquipment(
  recordId: string,
  teamId: string,
  userId: string,
  updates: Partial<BikeshedEquipment>,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.bikeshedEquipments.id, recordId),
    eq(tables.bikeshedEquipments.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.bikeshedEquipments.owner, userId))
  }

  const [equipment] = await (db as any)
    .update(tables.bikeshedEquipments)
    .set({
      ...updates,
      updatedBy: userId
    })
    .where(and(...conditions))
    .returning()

  if (!equipment) {
    throw createError({
      status: 404,
      statusText: 'BikeshedEquipment not found or unauthorized'
    })
  }

  return equipment
}

export async function deleteBikeshedEquipment(
  recordId: string,
  teamId: string,
  userId: string,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.bikeshedEquipments.id, recordId),
    eq(tables.bikeshedEquipments.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.bikeshedEquipments.owner, userId))
  }

  const [deleted] = await (db as any)
    .delete(tables.bikeshedEquipments)
    .where(and(...conditions))
    .returning()

  if (!deleted) {
    throw createError({
      status: 404,
      statusText: 'BikeshedEquipment not found or unauthorized'
    })
  }

  return { success: true }
}