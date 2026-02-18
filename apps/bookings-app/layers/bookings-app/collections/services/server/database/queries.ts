// Generated with JSON field post-processing support (v2025-01-11)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { BookingsAppService, NewBookingsAppService } from '../../types'
import { user } from '~~/server/db/schema'

export async function getAllBookingsAppServices(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const services = await (db as any)
    .select({
      ...tables.bookingsAppServices,
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
    .from(tables.bookingsAppServices)
    .leftJoin(ownerUser, eq(tables.bookingsAppServices.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.bookingsAppServices.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.bookingsAppServices.updatedBy, updatedByUser.id))
    .where(eq(tables.bookingsAppServices.teamId, teamId))
    .orderBy(desc(tables.bookingsAppServices.createdAt))

  return services
}

export async function getBookingsAppServicesByIds(teamId: string, serviceIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const services = await (db as any)
    .select({
      ...tables.bookingsAppServices,
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
    .from(tables.bookingsAppServices)
    .leftJoin(ownerUser, eq(tables.bookingsAppServices.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.bookingsAppServices.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.bookingsAppServices.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.bookingsAppServices.teamId, teamId),
        inArray(tables.bookingsAppServices.id, serviceIds)
      )
    )
    .orderBy(desc(tables.bookingsAppServices.createdAt))

  return services
}

export async function createBookingsAppService(data: NewBookingsAppService) {
  const db = useDB()

  const [service] = await (db as any)
    .insert(tables.bookingsAppServices)
    .values(data)
    .returning()

  return service
}

export async function updateBookingsAppService(
  recordId: string,
  teamId: string,
  ownerId: string,
  updates: Partial<BookingsAppService>
) {
  const db = useDB()

  const [service] = await (db as any)
    .update(tables.bookingsAppServices)
    .set({
      ...updates,
      updatedBy: ownerId
    })
    .where(
      and(
        eq(tables.bookingsAppServices.id, recordId),
        eq(tables.bookingsAppServices.teamId, teamId),
        eq(tables.bookingsAppServices.owner, ownerId)
      )
    )
    .returning()

  if (!service) {
    throw createError({
      status: 404,
      statusText: 'BookingsAppService not found or unauthorized'
    })
  }

  return service
}

export async function deleteBookingsAppService(
  recordId: string,
  teamId: string,
  ownerId: string
) {
  const db = useDB()

  const [deleted] = await (db as any)
    .delete(tables.bookingsAppServices)
    .where(
      and(
        eq(tables.bookingsAppServices.id, recordId),
        eq(tables.bookingsAppServices.teamId, teamId),
        eq(tables.bookingsAppServices.owner, ownerId)
      )
    )
    .returning()

  if (!deleted) {
    throw createError({
      status: 404,
      statusText: 'BookingsAppService not found or unauthorized'
    })
  }

  return { success: true }
}