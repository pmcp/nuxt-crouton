// Generated with array reference post-processing support (v2024-10-12)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { SalesLocation, NewSalesLocation } from '../../types'
import * as eventsSchema from '../../../events/server/database/schema'
import { user } from '~~/server/db/schema'

export async function getAllSalesLocations(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const locations = await (db as any)
    .select({
      ...tables.salesLocations,
      eventIdData: eventsSchema.salesEvents,
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
    .from(tables.salesLocations)
    .leftJoin(eventsSchema.salesEvents, eq(tables.salesLocations.eventId, eventsSchema.salesEvents.id))
    .leftJoin(ownerUser, eq(tables.salesLocations.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.salesLocations.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.salesLocations.updatedBy, updatedByUser.id))
    .where(eq(tables.salesLocations.teamId, teamId))
    .orderBy(desc(tables.salesLocations.createdAt))

  return locations
}

export async function getSalesLocationsByIds(teamId: string, locationIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const locations = await (db as any)
    .select({
      ...tables.salesLocations,
      eventIdData: eventsSchema.salesEvents,
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
    .from(tables.salesLocations)
    .leftJoin(eventsSchema.salesEvents, eq(tables.salesLocations.eventId, eventsSchema.salesEvents.id))
    .leftJoin(ownerUser, eq(tables.salesLocations.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.salesLocations.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.salesLocations.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.salesLocations.teamId, teamId),
        inArray(tables.salesLocations.id, locationIds)
      )
    )
    .orderBy(desc(tables.salesLocations.createdAt))

  return locations
}

export async function createSalesLocation(data: NewSalesLocation) {
  const db = useDB()

  const [location] = await (db as any)
    .insert(tables.salesLocations)
    .values(data)
    .returning()

  return location
}

export async function updateSalesLocation(
  recordId: string,
  teamId: string,
  ownerId: string,
  updates: Partial<SalesLocation>
) {
  const db = useDB()

  const [location] = await (db as any)
    .update(tables.salesLocations)
    .set({
      ...updates,
      updatedBy: ownerId
    })
    .where(
      and(
        eq(tables.salesLocations.id, recordId),
        eq(tables.salesLocations.teamId, teamId),
        eq(tables.salesLocations.owner, ownerId)
      )
    )
    .returning()

  if (!location) {
    throw createError({
      statusCode: 404,
      statusMessage: 'SalesLocation not found or unauthorized'
    })
  }

  return location
}

export async function deleteSalesLocation(
  recordId: string,
  teamId: string,
  ownerId: string
) {
  const db = useDB()

  const [deleted] = await (db as any)
    .delete(tables.salesLocations)
    .where(
      and(
        eq(tables.salesLocations.id, recordId),
        eq(tables.salesLocations.teamId, teamId),
        eq(tables.salesLocations.owner, ownerId)
      )
    )
    .returning()

  if (!deleted) {
    throw createError({
      statusCode: 404,
      statusMessage: 'SalesLocation not found or unauthorized'
    })
  }

  return { success: true }
}