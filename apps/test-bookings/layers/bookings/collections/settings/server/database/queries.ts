// Generated with array reference post-processing support (v2024-10-12)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { BookingsSetting, NewBookingsSetting } from '../../types'
import { user } from '~~/server/db/schema'

export async function getAllBookingsSettings(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const settings = await (db as any)
    .select({
      ...tables.bookingsSettings,
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
    .from(tables.bookingsSettings)
    .leftJoin(ownerUser, eq(tables.bookingsSettings.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.bookingsSettings.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.bookingsSettings.updatedBy, updatedByUser.id))
    .where(eq(tables.bookingsSettings.teamId, teamId))
    .orderBy(desc(tables.bookingsSettings.createdAt))

  return settings
}

export async function getBookingsSettingsByIds(teamId: string, settingIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const settings = await (db as any)
    .select({
      ...tables.bookingsSettings,
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
    .from(tables.bookingsSettings)
    .leftJoin(ownerUser, eq(tables.bookingsSettings.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.bookingsSettings.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.bookingsSettings.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.bookingsSettings.teamId, teamId),
        inArray(tables.bookingsSettings.id, settingIds)
      )
    )
    .orderBy(desc(tables.bookingsSettings.createdAt))

  return settings
}

export async function createBookingsSetting(data: NewBookingsSetting) {
  const db = useDB()

  const [setting] = await (db as any)
    .insert(tables.bookingsSettings)
    .values(data)
    .returning()

  return setting
}

export async function updateBookingsSetting(
  recordId: string,
  teamId: string,
  ownerId: string,
  updates: Partial<BookingsSetting>
) {
  const db = useDB()

  const [setting] = await (db as any)
    .update(tables.bookingsSettings)
    .set({
      ...updates,
      updatedBy: ownerId
    })
    .where(
      and(
        eq(tables.bookingsSettings.id, recordId),
        eq(tables.bookingsSettings.teamId, teamId),
        eq(tables.bookingsSettings.owner, ownerId)
      )
    )
    .returning()

  if (!setting) {
    throw createError({
      statusCode: 404,
      statusMessage: 'BookingsSetting not found or unauthorized'
    })
  }

  return setting
}

export async function deleteBookingsSetting(
  recordId: string,
  teamId: string,
  ownerId: string
) {
  const db = useDB()

  const [deleted] = await (db as any)
    .delete(tables.bookingsSettings)
    .where(
      and(
        eq(tables.bookingsSettings.id, recordId),
        eq(tables.bookingsSettings.teamId, teamId),
        eq(tables.bookingsSettings.owner, ownerId)
      )
    )
    .returning()

  if (!deleted) {
    throw createError({
      statusCode: 404,
      statusMessage: 'BookingsSetting not found or unauthorized'
    })
  }

  return { success: true }
}