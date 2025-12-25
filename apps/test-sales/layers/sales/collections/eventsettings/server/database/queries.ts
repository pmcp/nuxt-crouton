// Generated with array reference post-processing support (v2024-10-12)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { SalesEventSetting, NewSalesEventSetting } from '../../types'
import * as eventsSchema from '../../../events/server/database/schema'
import { user } from '~~/server/db/schema'

export async function getAllSalesEventSettings(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const eventsettings = await (db as any)
    .select({
      ...tables.salesEventsettings,
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
    .from(tables.salesEventsettings)
    .leftJoin(eventsSchema.salesEvents, eq(tables.salesEventsettings.eventId, eventsSchema.salesEvents.id))
    .leftJoin(ownerUser, eq(tables.salesEventsettings.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.salesEventsettings.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.salesEventsettings.updatedBy, updatedByUser.id))
    .where(eq(tables.salesEventsettings.teamId, teamId))
    .orderBy(desc(tables.salesEventsettings.createdAt))

  return eventsettings
}

export async function getSalesEventSettingsByIds(teamId: string, eventsettingIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const eventsettings = await (db as any)
    .select({
      ...tables.salesEventsettings,
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
    .from(tables.salesEventsettings)
    .leftJoin(eventsSchema.salesEvents, eq(tables.salesEventsettings.eventId, eventsSchema.salesEvents.id))
    .leftJoin(ownerUser, eq(tables.salesEventsettings.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.salesEventsettings.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.salesEventsettings.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.salesEventsettings.teamId, teamId),
        inArray(tables.salesEventsettings.id, eventsettingIds)
      )
    )
    .orderBy(desc(tables.salesEventsettings.createdAt))

  return eventsettings
}

export async function createSalesEventSetting(data: NewSalesEventSetting) {
  const db = useDB()

  const [eventsetting] = await (db as any)
    .insert(tables.salesEventsettings)
    .values(data)
    .returning()

  return eventsetting
}

export async function updateSalesEventSetting(
  recordId: string,
  teamId: string,
  ownerId: string,
  updates: Partial<SalesEventSetting>
) {
  const db = useDB()

  const [eventsetting] = await (db as any)
    .update(tables.salesEventsettings)
    .set({
      ...updates,
      updatedBy: ownerId
    })
    .where(
      and(
        eq(tables.salesEventsettings.id, recordId),
        eq(tables.salesEventsettings.teamId, teamId),
        eq(tables.salesEventsettings.owner, ownerId)
      )
    )
    .returning()

  if (!eventsetting) {
    throw createError({
      statusCode: 404,
      statusMessage: 'SalesEventSetting not found or unauthorized'
    })
  }

  return eventsetting
}

export async function deleteSalesEventSetting(
  recordId: string,
  teamId: string,
  ownerId: string
) {
  const db = useDB()

  const [deleted] = await (db as any)
    .delete(tables.salesEventsettings)
    .where(
      and(
        eq(tables.salesEventsettings.id, recordId),
        eq(tables.salesEventsettings.teamId, teamId),
        eq(tables.salesEventsettings.owner, ownerId)
      )
    )
    .returning()

  if (!deleted) {
    throw createError({
      statusCode: 404,
      statusMessage: 'SalesEventSetting not found or unauthorized'
    })
  }

  return { success: true }
}