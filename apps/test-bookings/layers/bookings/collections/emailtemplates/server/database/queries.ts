// Generated with array reference post-processing support (v2024-10-12)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { BookingsEmailtemplate, NewBookingsEmailtemplate } from '../../types'
import * as locationsSchema from '../../../locations/server/database/schema'
import { user } from '~~/server/db/schema'

export async function getAllBookingsEmailtemplates(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const emailtemplates = await (db as any)
    .select({
      ...tables.bookingsEmailtemplates,
      locationIdData: locationsSchema.bookingsLocations,
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
    .from(tables.bookingsEmailtemplates)
    .leftJoin(locationsSchema.bookingsLocations, eq(tables.bookingsEmailtemplates.locationId, locationsSchema.bookingsLocations.id))
    .leftJoin(ownerUser, eq(tables.bookingsEmailtemplates.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.bookingsEmailtemplates.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.bookingsEmailtemplates.updatedBy, updatedByUser.id))
    .where(eq(tables.bookingsEmailtemplates.teamId, teamId))
    .orderBy(desc(tables.bookingsEmailtemplates.createdAt))

  return emailtemplates
}

export async function getBookingsEmailtemplatesByIds(teamId: string, emailtemplateIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const emailtemplates = await (db as any)
    .select({
      ...tables.bookingsEmailtemplates,
      locationIdData: locationsSchema.bookingsLocations,
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
    .from(tables.bookingsEmailtemplates)
    .leftJoin(locationsSchema.bookingsLocations, eq(tables.bookingsEmailtemplates.locationId, locationsSchema.bookingsLocations.id))
    .leftJoin(ownerUser, eq(tables.bookingsEmailtemplates.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.bookingsEmailtemplates.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.bookingsEmailtemplates.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.bookingsEmailtemplates.teamId, teamId),
        inArray(tables.bookingsEmailtemplates.id, emailtemplateIds)
      )
    )
    .orderBy(desc(tables.bookingsEmailtemplates.createdAt))

  return emailtemplates
}

export async function createBookingsEmailtemplate(data: NewBookingsEmailtemplate) {
  const db = useDB()

  const [emailtemplate] = await (db as any)
    .insert(tables.bookingsEmailtemplates)
    .values(data)
    .returning()

  return emailtemplate
}

export async function updateBookingsEmailtemplate(
  recordId: string,
  teamId: string,
  ownerId: string,
  updates: Partial<BookingsEmailtemplate>
) {
  const db = useDB()

  const [emailtemplate] = await (db as any)
    .update(tables.bookingsEmailtemplates)
    .set({
      ...updates,
      updatedBy: ownerId
    })
    .where(
      and(
        eq(tables.bookingsEmailtemplates.id, recordId),
        eq(tables.bookingsEmailtemplates.teamId, teamId),
        eq(tables.bookingsEmailtemplates.owner, ownerId)
      )
    )
    .returning()

  if (!emailtemplate) {
    throw createError({
      statusCode: 404,
      statusMessage: 'BookingsEmailtemplate not found or unauthorized'
    })
  }

  return emailtemplate
}

export async function deleteBookingsEmailtemplate(
  recordId: string,
  teamId: string,
  ownerId: string
) {
  const db = useDB()

  const [deleted] = await (db as any)
    .delete(tables.bookingsEmailtemplates)
    .where(
      and(
        eq(tables.bookingsEmailtemplates.id, recordId),
        eq(tables.bookingsEmailtemplates.teamId, teamId),
        eq(tables.bookingsEmailtemplates.owner, ownerId)
      )
    )
    .returning()

  if (!deleted) {
    throw createError({
      statusCode: 404,
      statusMessage: 'BookingsEmailtemplate not found or unauthorized'
    })
  }

  return { success: true }
}