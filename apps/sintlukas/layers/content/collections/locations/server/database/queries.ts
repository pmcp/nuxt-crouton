// Generated with JSON field post-processing support (v2025-01-11)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { ContentLocation, NewContentLocation } from '../../types'
import { user } from '~~/server/db/schema'

export async function getAllContentLocations(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const locations = await (db as any)
    .select({
      ...tables.contentLocations,
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
    .from(tables.contentLocations)
    .leftJoin(ownerUser, eq(tables.contentLocations.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.contentLocations.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.contentLocations.updatedBy, updatedByUser.id))
    .where(eq(tables.contentLocations.teamId, teamId))
    .orderBy(desc(tables.contentLocations.createdAt))

  return locations
}

export async function getContentLocationsByIds(teamId: string, locationIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const locations = await (db as any)
    .select({
      ...tables.contentLocations,
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
    .from(tables.contentLocations)
    .leftJoin(ownerUser, eq(tables.contentLocations.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.contentLocations.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.contentLocations.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.contentLocations.teamId, teamId),
        inArray(tables.contentLocations.id, locationIds)
      )
    )
    .orderBy(desc(tables.contentLocations.createdAt))

  return locations
}

export async function createContentLocation(data: NewContentLocation) {
  const db = useDB()

  const [location] = await (db as any)
    .insert(tables.contentLocations)
    .values(data)
    .returning()

  return location
}

export async function updateContentLocation(
  recordId: string,
  teamId: string,
  userId: string,
  updates: Partial<ContentLocation>,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.contentLocations.id, recordId),
    eq(tables.contentLocations.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.contentLocations.owner, userId))
  }

  const [location] = await (db as any)
    .update(tables.contentLocations)
    .set({
      ...updates,
      updatedBy: userId
    })
    .where(and(...conditions))
    .returning()

  if (!location) {
    throw createError({
      status: 404,
      statusText: 'ContentLocation not found or unauthorized'
    })
  }

  return location
}

export async function deleteContentLocation(
  recordId: string,
  teamId: string,
  userId: string,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.contentLocations.id, recordId),
    eq(tables.contentLocations.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.contentLocations.owner, userId))
  }

  const [deleted] = await (db as any)
    .delete(tables.contentLocations)
    .where(and(...conditions))
    .returning()

  if (!deleted) {
    throw createError({
      status: 404,
      statusText: 'ContentLocation not found or unauthorized'
    })
  }

  return { success: true }
}