// Generated with JSON field post-processing support (v2025-01-11)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { Bookingtest3BookingRequest, NewBookingtest3BookingRequest } from '../../types'
import { user } from '~~/server/db/schema'

export async function getAllBookingtest3BookingRequests(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const bookingRequests = await (db as any)
    .select({
      ...tables.bookingtest3BookingRequests,
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
    .from(tables.bookingtest3BookingRequests)
    .leftJoin(ownerUser, eq(tables.bookingtest3BookingRequests.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.bookingtest3BookingRequests.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.bookingtest3BookingRequests.updatedBy, updatedByUser.id))
    .where(eq(tables.bookingtest3BookingRequests.teamId, teamId))
    .orderBy(desc(tables.bookingtest3BookingRequests.createdAt))

  return bookingRequests
}

export async function getBookingtest3BookingRequestsByIds(teamId: string, bookingRequestIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const bookingRequests = await (db as any)
    .select({
      ...tables.bookingtest3BookingRequests,
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
    .from(tables.bookingtest3BookingRequests)
    .leftJoin(ownerUser, eq(tables.bookingtest3BookingRequests.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.bookingtest3BookingRequests.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.bookingtest3BookingRequests.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.bookingtest3BookingRequests.teamId, teamId),
        inArray(tables.bookingtest3BookingRequests.id, bookingRequestIds)
      )
    )
    .orderBy(desc(tables.bookingtest3BookingRequests.createdAt))

  return bookingRequests
}

export async function createBookingtest3BookingRequest(data: NewBookingtest3BookingRequest) {
  const db = useDB()

  const [bookingRequest] = await (db as any)
    .insert(tables.bookingtest3BookingRequests)
    .values(data)
    .returning()

  return bookingRequest
}

export async function updateBookingtest3BookingRequest(
  recordId: string,
  teamId: string,
  userId: string,
  updates: Partial<Bookingtest3BookingRequest>,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.bookingtest3BookingRequests.id, recordId),
    eq(tables.bookingtest3BookingRequests.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.bookingtest3BookingRequests.owner, userId))
  }

  const [bookingRequest] = await (db as any)
    .update(tables.bookingtest3BookingRequests)
    .set({
      ...updates,
      updatedBy: userId
    })
    .where(and(...conditions))
    .returning()

  if (!bookingRequest) {
    throw createError({
      status: 404,
      statusText: 'Bookingtest3BookingRequest not found or unauthorized'
    })
  }

  return bookingRequest
}

export async function deleteBookingtest3BookingRequest(
  recordId: string,
  teamId: string,
  userId: string,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.bookingtest3BookingRequests.id, recordId),
    eq(tables.bookingtest3BookingRequests.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.bookingtest3BookingRequests.owner, userId))
  }

  const [deleted] = await (db as any)
    .delete(tables.bookingtest3BookingRequests)
    .where(and(...conditions))
    .returning()

  if (!deleted) {
    throw createError({
      status: 404,
      statusText: 'Bookingtest3BookingRequest not found or unauthorized'
    })
  }

  return { success: true }
}