// Generated with JSON field post-processing support (v2025-01-11)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { SalesPrintqueue, NewSalesPrintqueue } from '../../types'
import * as eventsSchema from '../../../events/server/database/schema'
import * as ordersSchema from '../../../orders/server/database/schema'
import * as printersSchema from '../../../printers/server/database/schema'
import * as locationsSchema from '../../../locations/server/database/schema'
import { user } from '~~/server/db/schema'

export async function getAllSalesPrintqueues(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const printqueues = await (db as any)
    .select({
      ...tables.salesPrintqueues,
      eventIdData: eventsSchema.salesEvents,
      orderIdData: ordersSchema.salesOrders,
      printerIdData: printersSchema.salesPrinters,
      locationIdData: locationsSchema.salesLocations,
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
    .from(tables.salesPrintqueues)
    .leftJoin(eventsSchema.salesEvents, eq(tables.salesPrintqueues.eventId, eventsSchema.salesEvents.id))
    .leftJoin(ordersSchema.salesOrders, eq(tables.salesPrintqueues.orderId, ordersSchema.salesOrders.id))
    .leftJoin(printersSchema.salesPrinters, eq(tables.salesPrintqueues.printerId, printersSchema.salesPrinters.id))
    .leftJoin(locationsSchema.salesLocations, eq(tables.salesPrintqueues.locationId, locationsSchema.salesLocations.id))
    .leftJoin(ownerUser, eq(tables.salesPrintqueues.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.salesPrintqueues.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.salesPrintqueues.updatedBy, updatedByUser.id))
    .where(eq(tables.salesPrintqueues.teamId, teamId))
    .orderBy(desc(tables.salesPrintqueues.createdAt))

  return printqueues
}

export async function getSalesPrintqueuesByIds(teamId: string, printqueueIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const printqueues = await (db as any)
    .select({
      ...tables.salesPrintqueues,
      eventIdData: eventsSchema.salesEvents,
      orderIdData: ordersSchema.salesOrders,
      printerIdData: printersSchema.salesPrinters,
      locationIdData: locationsSchema.salesLocations,
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
    .from(tables.salesPrintqueues)
    .leftJoin(eventsSchema.salesEvents, eq(tables.salesPrintqueues.eventId, eventsSchema.salesEvents.id))
    .leftJoin(ordersSchema.salesOrders, eq(tables.salesPrintqueues.orderId, ordersSchema.salesOrders.id))
    .leftJoin(printersSchema.salesPrinters, eq(tables.salesPrintqueues.printerId, printersSchema.salesPrinters.id))
    .leftJoin(locationsSchema.salesLocations, eq(tables.salesPrintqueues.locationId, locationsSchema.salesLocations.id))
    .leftJoin(ownerUser, eq(tables.salesPrintqueues.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.salesPrintqueues.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.salesPrintqueues.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.salesPrintqueues.teamId, teamId),
        inArray(tables.salesPrintqueues.id, printqueueIds)
      )
    )
    .orderBy(desc(tables.salesPrintqueues.createdAt))

  return printqueues
}

export async function createSalesPrintqueue(data: NewSalesPrintqueue) {
  const db = useDB()

  const [printqueue] = await (db as any)
    .insert(tables.salesPrintqueues)
    .values(data)
    .returning()

  return printqueue
}

export async function updateSalesPrintqueue(
  recordId: string,
  teamId: string,
  userId: string,
  updates: Partial<SalesPrintqueue>,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.salesPrintqueues.id, recordId),
    eq(tables.salesPrintqueues.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.salesPrintqueues.owner, userId))
  }

  const [printqueue] = await (db as any)
    .update(tables.salesPrintqueues)
    .set({
      ...updates,
      updatedBy: userId
    })
    .where(and(...conditions))
    .returning()

  if (!printqueue) {
    throw createError({
      status: 404,
      statusText: 'SalesPrintqueue not found or unauthorized'
    })
  }

  return printqueue
}

export async function deleteSalesPrintqueue(
  recordId: string,
  teamId: string,
  userId: string,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.salesPrintqueues.id, recordId),
    eq(tables.salesPrintqueues.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.salesPrintqueues.owner, userId))
  }

  const [deleted] = await (db as any)
    .delete(tables.salesPrintqueues)
    .where(and(...conditions))
    .returning()

  if (!deleted) {
    throw createError({
      status: 404,
      statusText: 'SalesPrintqueue not found or unauthorized'
    })
  }

  return { success: true }
}