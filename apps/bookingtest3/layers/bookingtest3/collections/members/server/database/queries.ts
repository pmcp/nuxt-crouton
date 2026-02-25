// Generated with JSON field post-processing support (v2025-01-11)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { Bookingtest3Member, NewBookingtest3Member } from '../../types'
import { user } from '~~/server/db/schema'

export async function getAllBookingtest3Members(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const members = await (db as any)
    .select({
      ...tables.bookingtest3Members,
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
    .from(tables.bookingtest3Members)
    .leftJoin(ownerUser, eq(tables.bookingtest3Members.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.bookingtest3Members.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.bookingtest3Members.updatedBy, updatedByUser.id))
    .where(eq(tables.bookingtest3Members.teamId, teamId))
    .orderBy(desc(tables.bookingtest3Members.createdAt))

  return members
}

export async function getBookingtest3MembersByIds(teamId: string, memberIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const members = await (db as any)
    .select({
      ...tables.bookingtest3Members,
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
    .from(tables.bookingtest3Members)
    .leftJoin(ownerUser, eq(tables.bookingtest3Members.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.bookingtest3Members.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.bookingtest3Members.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.bookingtest3Members.teamId, teamId),
        inArray(tables.bookingtest3Members.id, memberIds)
      )
    )
    .orderBy(desc(tables.bookingtest3Members.createdAt))

  return members
}

export async function createBookingtest3Member(data: NewBookingtest3Member) {
  const db = useDB()

  const [member] = await (db as any)
    .insert(tables.bookingtest3Members)
    .values(data)
    .returning()

  return member
}

export async function updateBookingtest3Member(
  recordId: string,
  teamId: string,
  userId: string,
  updates: Partial<Bookingtest3Member>,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.bookingtest3Members.id, recordId),
    eq(tables.bookingtest3Members.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.bookingtest3Members.owner, userId))
  }

  const [member] = await (db as any)
    .update(tables.bookingtest3Members)
    .set({
      ...updates,
      updatedBy: userId
    })
    .where(and(...conditions))
    .returning()

  if (!member) {
    throw createError({
      status: 404,
      statusText: 'Bookingtest3Member not found or unauthorized'
    })
  }

  return member
}

export async function deleteBookingtest3Member(
  recordId: string,
  teamId: string,
  userId: string,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.bookingtest3Members.id, recordId),
    eq(tables.bookingtest3Members.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.bookingtest3Members.owner, userId))
  }

  const [deleted] = await (db as any)
    .delete(tables.bookingtest3Members)
    .where(and(...conditions))
    .returning()

  if (!deleted) {
    throw createError({
      status: 404,
      statusText: 'Bookingtest3Member not found or unauthorized'
    })
  }

  return { success: true }
}