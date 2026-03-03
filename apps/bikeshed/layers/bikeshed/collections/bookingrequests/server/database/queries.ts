// Generated with JSON field post-processing support (v2025-01-11)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { BikeshedBookingRequest, NewBikeshedBookingRequest } from '../../types'
import { user } from '~~/server/db/schema'

export async function getAllBikeshedBookingRequests(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const bookingRequests = await (db as any)
    .select({
      ...tables.bikeshedBookingRequests,
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
    .from(tables.bikeshedBookingRequests)
    .leftJoin(ownerUser, eq(tables.bikeshedBookingRequests.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.bikeshedBookingRequests.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.bikeshedBookingRequests.updatedBy, updatedByUser.id))
    .where(eq(tables.bikeshedBookingRequests.teamId, teamId))
    .orderBy(desc(tables.bikeshedBookingRequests.createdAt))

  return bookingRequests
}

export async function getBikeshedBookingRequestsByIds(teamId: string, bookingRequestIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const bookingRequests = await (db as any)
    .select({
      ...tables.bikeshedBookingRequests,
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
    .from(tables.bikeshedBookingRequests)
    .leftJoin(ownerUser, eq(tables.bikeshedBookingRequests.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.bikeshedBookingRequests.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.bikeshedBookingRequests.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.bikeshedBookingRequests.teamId, teamId),
        inArray(tables.bikeshedBookingRequests.id, bookingRequestIds)
      )
    )
    .orderBy(desc(tables.bikeshedBookingRequests.createdAt))

  return bookingRequests
}

export async function createBikeshedBookingRequest(data: NewBikeshedBookingRequest) {
  const db = useDB()

  const [bookingRequest] = await (db as any)
    .insert(tables.bikeshedBookingRequests)
    .values(data)
    .returning()

  return bookingRequest
}

export async function updateBikeshedBookingRequest(
  recordId: string,
  teamId: string,
  userId: string,
  updates: Partial<BikeshedBookingRequest>,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.bikeshedBookingRequests.id, recordId),
    eq(tables.bikeshedBookingRequests.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.bikeshedBookingRequests.owner, userId))
  }

  const [bookingRequest] = await (db as any)
    .update(tables.bikeshedBookingRequests)
    .set({
      ...updates,
      updatedBy: userId
    })
    .where(and(...conditions))
    .returning()

  if (!bookingRequest) {
    throw createError({
      status: 404,
      statusText: 'BikeshedBookingRequest not found or unauthorized'
    })
  }

  return bookingRequest
}

export async function deleteBikeshedBookingRequest(
  recordId: string,
  teamId: string,
  userId: string,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.bikeshedBookingRequests.id, recordId),
    eq(tables.bikeshedBookingRequests.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.bikeshedBookingRequests.owner, userId))
  }

  const [deleted] = await (db as any)
    .delete(tables.bikeshedBookingRequests)
    .where(and(...conditions))
    .returning()

  if (!deleted) {
    throw createError({
      status: 404,
      statusText: 'BikeshedBookingRequest not found or unauthorized'
    })
  }

  return { success: true }
}