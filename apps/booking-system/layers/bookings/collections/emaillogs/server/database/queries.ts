// Generated with JSON field post-processing support (v2025-01-11)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { BookingsEmaillog, NewBookingsEmaillog } from '../../types'
import * as bookingsSchema from '../../../bookings/server/database/schema'
import * as emailTemplatesSchema from '../../../emailtemplates/server/database/schema'
import { user } from '~~/server/db/schema'

export async function getAllBookingsEmaillogs(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const emaillogs = await (db as any)
    .select({
      ...tables.bookingsEmaillogs,
      bookingIdData: bookingsSchema.bookingsBookings,
      templateIdData: emailTemplatesSchema.bookingsEmailtemplates,
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
    .from(tables.bookingsEmaillogs)
    .leftJoin(bookingsSchema.bookingsBookings, eq(tables.bookingsEmaillogs.bookingId, bookingsSchema.bookingsBookings.id))
    .leftJoin(emailTemplatesSchema.bookingsEmailtemplates, eq(tables.bookingsEmaillogs.templateId, emailTemplatesSchema.bookingsEmailtemplates.id))
    .leftJoin(ownerUser, eq(tables.bookingsEmaillogs.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.bookingsEmaillogs.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.bookingsEmaillogs.updatedBy, updatedByUser.id))
    .where(eq(tables.bookingsEmaillogs.teamId, teamId))
    .orderBy(desc(tables.bookingsEmaillogs.createdAt))

  return emaillogs
}

export async function getBookingsEmaillogsByIds(teamId: string, emaillogIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const emaillogs = await (db as any)
    .select({
      ...tables.bookingsEmaillogs,
      bookingIdData: bookingsSchema.bookingsBookings,
      templateIdData: emailTemplatesSchema.bookingsEmailtemplates,
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
    .from(tables.bookingsEmaillogs)
    .leftJoin(bookingsSchema.bookingsBookings, eq(tables.bookingsEmaillogs.bookingId, bookingsSchema.bookingsBookings.id))
    .leftJoin(emailTemplatesSchema.bookingsEmailtemplates, eq(tables.bookingsEmaillogs.templateId, emailTemplatesSchema.bookingsEmailtemplates.id))
    .leftJoin(ownerUser, eq(tables.bookingsEmaillogs.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.bookingsEmaillogs.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.bookingsEmaillogs.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.bookingsEmaillogs.teamId, teamId),
        inArray(tables.bookingsEmaillogs.id, emaillogIds)
      )
    )
    .orderBy(desc(tables.bookingsEmaillogs.createdAt))

  return emaillogs
}

export async function createBookingsEmaillog(data: NewBookingsEmaillog) {
  const db = useDB()

  const [emaillog] = await (db as any)
    .insert(tables.bookingsEmaillogs)
    .values(data)
    .returning()

  return emaillog
}

export async function updateBookingsEmaillog(
  recordId: string,
  teamId: string,
  ownerId: string,
  updates: Partial<BookingsEmaillog>
) {
  const db = useDB()

  const [emaillog] = await (db as any)
    .update(tables.bookingsEmaillogs)
    .set({
      ...updates,
      updatedBy: ownerId
    })
    .where(
      and(
        eq(tables.bookingsEmaillogs.id, recordId),
        eq(tables.bookingsEmaillogs.teamId, teamId),
        eq(tables.bookingsEmaillogs.owner, ownerId)
      )
    )
    .returning()

  if (!emaillog) {
    throw createError({
      statusCode: 404,
      statusMessage: 'BookingsEmaillog not found or unauthorized'
    })
  }

  return emaillog
}

export async function deleteBookingsEmaillog(
  recordId: string,
  teamId: string,
  ownerId: string
) {
  const db = useDB()

  const [deleted] = await (db as any)
    .delete(tables.bookingsEmaillogs)
    .where(
      and(
        eq(tables.bookingsEmaillogs.id, recordId),
        eq(tables.bookingsEmaillogs.teamId, teamId),
        eq(tables.bookingsEmaillogs.owner, ownerId)
      )
    )
    .returning()

  if (!deleted) {
    throw createError({
      statusCode: 404,
      statusMessage: 'BookingsEmaillog not found or unauthorized'
    })
  }

  return { success: true }
}