// Generated with JSON field post-processing support (v2025-01-11)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { BookingsAppCustomer, NewBookingsAppCustomer } from '../../types'
import { user } from '~~/server/db/schema'

export async function getAllBookingsAppCustomers(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const customers = await (db as any)
    .select({
      ...tables.bookingsAppCustomers,
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
    .from(tables.bookingsAppCustomers)
    .leftJoin(ownerUser, eq(tables.bookingsAppCustomers.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.bookingsAppCustomers.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.bookingsAppCustomers.updatedBy, updatedByUser.id))
    .where(eq(tables.bookingsAppCustomers.teamId, teamId))
    .orderBy(desc(tables.bookingsAppCustomers.createdAt))

  return customers
}

export async function getBookingsAppCustomersByIds(teamId: string, customerIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const customers = await (db as any)
    .select({
      ...tables.bookingsAppCustomers,
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
    .from(tables.bookingsAppCustomers)
    .leftJoin(ownerUser, eq(tables.bookingsAppCustomers.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.bookingsAppCustomers.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.bookingsAppCustomers.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.bookingsAppCustomers.teamId, teamId),
        inArray(tables.bookingsAppCustomers.id, customerIds)
      )
    )
    .orderBy(desc(tables.bookingsAppCustomers.createdAt))

  return customers
}

export async function createBookingsAppCustomer(data: NewBookingsAppCustomer) {
  const db = useDB()

  const [customer] = await (db as any)
    .insert(tables.bookingsAppCustomers)
    .values(data)
    .returning()

  return customer
}

export async function updateBookingsAppCustomer(
  recordId: string,
  teamId: string,
  ownerId: string,
  updates: Partial<BookingsAppCustomer>
) {
  const db = useDB()

  const [customer] = await (db as any)
    .update(tables.bookingsAppCustomers)
    .set({
      ...updates,
      updatedBy: ownerId
    })
    .where(
      and(
        eq(tables.bookingsAppCustomers.id, recordId),
        eq(tables.bookingsAppCustomers.teamId, teamId),
        eq(tables.bookingsAppCustomers.owner, ownerId)
      )
    )
    .returning()

  if (!customer) {
    throw createError({
      status: 404,
      statusText: 'BookingsAppCustomer not found or unauthorized'
    })
  }

  return customer
}

export async function deleteBookingsAppCustomer(
  recordId: string,
  teamId: string,
  ownerId: string
) {
  const db = useDB()

  const [deleted] = await (db as any)
    .delete(tables.bookingsAppCustomers)
    .where(
      and(
        eq(tables.bookingsAppCustomers.id, recordId),
        eq(tables.bookingsAppCustomers.teamId, teamId),
        eq(tables.bookingsAppCustomers.owner, ownerId)
      )
    )
    .returning()

  if (!deleted) {
    throw createError({
      status: 404,
      statusText: 'BookingsAppCustomer not found or unauthorized'
    })
  }

  return { success: true }
}