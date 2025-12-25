// Generated with array reference post-processing support (v2024-10-12)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { SalesEvent, NewSalesEvent } from '../../types'
import { user } from '~~/server/db/schema'

export async function getAllSalesEvents(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const events = await (db as any)
    .select({
      ...tables.salesEvents,
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
    .from(tables.salesEvents)
    .leftJoin(ownerUser, eq(tables.salesEvents.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.salesEvents.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.salesEvents.updatedBy, updatedByUser.id))
    .where(eq(tables.salesEvents.teamId, teamId))
    .orderBy(desc(tables.salesEvents.createdAt))

  return events
}

export async function getSalesEventsByIds(teamId: string, eventIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const events = await (db as any)
    .select({
      ...tables.salesEvents,
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
    .from(tables.salesEvents)
    .leftJoin(ownerUser, eq(tables.salesEvents.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.salesEvents.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.salesEvents.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.salesEvents.teamId, teamId),
        inArray(tables.salesEvents.id, eventIds)
      )
    )
    .orderBy(desc(tables.salesEvents.createdAt))

  return events
}

export async function createSalesEvent(data: NewSalesEvent) {
  const db = useDB()

  const [event] = await (db as any)
    .insert(tables.salesEvents)
    .values(data)
    .returning()

  return event
}

export async function updateSalesEvent(
  recordId: string,
  teamId: string,
  ownerId: string,
  updates: Partial<SalesEvent>
) {
  const db = useDB()

  const [event] = await (db as any)
    .update(tables.salesEvents)
    .set({
      ...updates,
      updatedBy: ownerId
    })
    .where(
      and(
        eq(tables.salesEvents.id, recordId),
        eq(tables.salesEvents.teamId, teamId),
        eq(tables.salesEvents.owner, ownerId)
      )
    )
    .returning()

  if (!event) {
    throw createError({
      statusCode: 404,
      statusMessage: 'SalesEvent not found or unauthorized'
    })
  }

  return event
}

export async function deleteSalesEvent(
  recordId: string,
  teamId: string,
  ownerId: string
) {
  const db = useDB()

  const [deleted] = await (db as any)
    .delete(tables.salesEvents)
    .where(
      and(
        eq(tables.salesEvents.id, recordId),
        eq(tables.salesEvents.teamId, teamId),
        eq(tables.salesEvents.owner, ownerId)
      )
    )
    .returning()

  if (!deleted) {
    throw createError({
      statusCode: 404,
      statusMessage: 'SalesEvent not found or unauthorized'
    })
  }

  return { success: true }
}