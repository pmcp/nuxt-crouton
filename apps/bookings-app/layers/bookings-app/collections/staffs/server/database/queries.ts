// Generated with JSON field post-processing support (v2025-01-11)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { BookingsAppStaff, NewBookingsAppStaff } from '../../types'
import { user } from '~~/server/db/schema'

export async function getAllBookingsAppStaffs(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const staffs = await (db as any)
    .select({
      ...tables.bookingsAppStaffs,
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
    .from(tables.bookingsAppStaffs)
    .leftJoin(ownerUser, eq(tables.bookingsAppStaffs.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.bookingsAppStaffs.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.bookingsAppStaffs.updatedBy, updatedByUser.id))
    .where(eq(tables.bookingsAppStaffs.teamId, teamId))
    .orderBy(desc(tables.bookingsAppStaffs.createdAt))

  return staffs
}

export async function getBookingsAppStaffsByIds(teamId: string, staffIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const staffs = await (db as any)
    .select({
      ...tables.bookingsAppStaffs,
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
    .from(tables.bookingsAppStaffs)
    .leftJoin(ownerUser, eq(tables.bookingsAppStaffs.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.bookingsAppStaffs.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.bookingsAppStaffs.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.bookingsAppStaffs.teamId, teamId),
        inArray(tables.bookingsAppStaffs.id, staffIds)
      )
    )
    .orderBy(desc(tables.bookingsAppStaffs.createdAt))

  return staffs
}

export async function createBookingsAppStaff(data: NewBookingsAppStaff) {
  const db = useDB()

  const [staff] = await (db as any)
    .insert(tables.bookingsAppStaffs)
    .values(data)
    .returning()

  return staff
}

export async function updateBookingsAppStaff(
  recordId: string,
  teamId: string,
  ownerId: string,
  updates: Partial<BookingsAppStaff>
) {
  const db = useDB()

  const [staff] = await (db as any)
    .update(tables.bookingsAppStaffs)
    .set({
      ...updates,
      updatedBy: ownerId
    })
    .where(
      and(
        eq(tables.bookingsAppStaffs.id, recordId),
        eq(tables.bookingsAppStaffs.teamId, teamId),
        eq(tables.bookingsAppStaffs.owner, ownerId)
      )
    )
    .returning()

  if (!staff) {
    throw createError({
      status: 404,
      statusText: 'BookingsAppStaff not found or unauthorized'
    })
  }

  return staff
}

export async function deleteBookingsAppStaff(
  recordId: string,
  teamId: string,
  ownerId: string
) {
  const db = useDB()

  const [deleted] = await (db as any)
    .delete(tables.bookingsAppStaffs)
    .where(
      and(
        eq(tables.bookingsAppStaffs.id, recordId),
        eq(tables.bookingsAppStaffs.teamId, teamId),
        eq(tables.bookingsAppStaffs.owner, ownerId)
      )
    )
    .returning()

  if (!deleted) {
    throw createError({
      status: 404,
      statusText: 'BookingsAppStaff not found or unauthorized'
    })
  }

  return { success: true }
}