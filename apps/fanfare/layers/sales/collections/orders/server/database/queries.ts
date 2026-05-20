// Generated with JSON field post-processing support (v2025-01-11)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { SalesOrder, NewSalesOrder } from '../../types'
import * as eventsSchema from '../../../events/server/database/schema'
import * as clientsSchema from '../../../clients/server/database/schema'
import { user } from '~~/server/db/schema'

export async function getAllSalesOrders(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const orders = await (db as any)
    .select({
      ...tables.salesOrders,
      eventIdData: eventsSchema.salesEvents,
      clientIdData: clientsSchema.salesClients,
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
    .from(tables.salesOrders)
    .leftJoin(eventsSchema.salesEvents, eq(tables.salesOrders.eventId, eventsSchema.salesEvents.id))
    .leftJoin(clientsSchema.salesClients, eq(tables.salesOrders.clientId, clientsSchema.salesClients.id))
    .leftJoin(ownerUser, eq(tables.salesOrders.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.salesOrders.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.salesOrders.updatedBy, updatedByUser.id))
    .where(eq(tables.salesOrders.teamId, teamId))
    .orderBy(desc(tables.salesOrders.createdAt))

  return orders
}

export async function getSalesOrdersByIds(teamId: string, orderIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const orders = await (db as any)
    .select({
      ...tables.salesOrders,
      eventIdData: eventsSchema.salesEvents,
      clientIdData: clientsSchema.salesClients,
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
    .from(tables.salesOrders)
    .leftJoin(eventsSchema.salesEvents, eq(tables.salesOrders.eventId, eventsSchema.salesEvents.id))
    .leftJoin(clientsSchema.salesClients, eq(tables.salesOrders.clientId, clientsSchema.salesClients.id))
    .leftJoin(ownerUser, eq(tables.salesOrders.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.salesOrders.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.salesOrders.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.salesOrders.teamId, teamId),
        inArray(tables.salesOrders.id, orderIds)
      )
    )
    .orderBy(desc(tables.salesOrders.createdAt))

  return orders
}

export async function createSalesOrder(data: NewSalesOrder) {
  const db = useDB()

  const [order] = await (db as any)
    .insert(tables.salesOrders)
    .values(data)
    .returning()

  return order
}

export async function updateSalesOrder(
  recordId: string,
  teamId: string,
  userId: string,
  updates: Partial<SalesOrder>,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.salesOrders.id, recordId),
    eq(tables.salesOrders.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.salesOrders.owner, userId))
  }

  const [order] = await (db as any)
    .update(tables.salesOrders)
    .set({
      ...updates,
      updatedBy: userId
    })
    .where(and(...conditions))
    .returning()

  if (!order) {
    throw createError({
      status: 404,
      statusText: 'SalesOrder not found or unauthorized'
    })
  }

  return order
}

export async function deleteSalesOrder(
  recordId: string,
  teamId: string,
  userId: string,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.salesOrders.id, recordId),
    eq(tables.salesOrders.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.salesOrders.owner, userId))
  }

  const [deleted] = await (db as any)
    .delete(tables.salesOrders)
    .where(and(...conditions))
    .returning()

  if (!deleted) {
    throw createError({
      status: 404,
      statusText: 'SalesOrder not found or unauthorized'
    })
  }

  return { success: true }
}