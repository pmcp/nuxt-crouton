// Generated with JSON field post-processing support (v2025-01-11)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { SalesPrinter, NewSalesPrinter } from '../../types'
import * as eventsSchema from '../../../events/server/database/schema'
import * as locationsSchema from '../../../locations/server/database/schema'
import { user } from '~~/server/db/schema'

export async function getAllSalesPrinters(teamId: string, filters?: { eventId?: string }) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const printers = await (db as any)
    .select({
      ...tables.salesPrinters,
      eventIdData: eventsSchema.salesEvents,
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
    .from(tables.salesPrinters)
    .leftJoin(eventsSchema.salesEvents, eq(tables.salesPrinters.eventId, eventsSchema.salesEvents.id))
    .leftJoin(locationsSchema.salesLocations, eq(tables.salesPrinters.locationId, locationsSchema.salesLocations.id))
    .leftJoin(ownerUser, eq(tables.salesPrinters.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.salesPrinters.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.salesPrinters.updatedBy, updatedByUser.id))
    .where(and(
      eq(tables.salesPrinters.teamId, teamId),
      ...(filters?.eventId ? [eq(tables.salesPrinters.eventId, filters.eventId)] : [])
    ))
    .orderBy(desc(tables.salesPrinters.createdAt))

  return printers
}

export async function getSalesPrintersByIds(teamId: string, printerIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const printers = await (db as any)
    .select({
      ...tables.salesPrinters,
      eventIdData: eventsSchema.salesEvents,
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
    .from(tables.salesPrinters)
    .leftJoin(eventsSchema.salesEvents, eq(tables.salesPrinters.eventId, eventsSchema.salesEvents.id))
    .leftJoin(locationsSchema.salesLocations, eq(tables.salesPrinters.locationId, locationsSchema.salesLocations.id))
    .leftJoin(ownerUser, eq(tables.salesPrinters.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.salesPrinters.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.salesPrinters.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.salesPrinters.teamId, teamId),
        inArray(tables.salesPrinters.id, printerIds)
      )
    )
    .orderBy(desc(tables.salesPrinters.createdAt))

  return printers
}

export async function createSalesPrinter(data: NewSalesPrinter) {
  const db = useDB()

  const [printer] = await (db as any)
    .insert(tables.salesPrinters)
    .values(data)
    .returning()

  return printer
}

export async function updateSalesPrinter(
  recordId: string,
  teamId: string,
  userId: string,
  updates: Partial<SalesPrinter>,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.salesPrinters.id, recordId),
    eq(tables.salesPrinters.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.salesPrinters.owner, userId))
  }

  const [printer] = await (db as any)
    .update(tables.salesPrinters)
    .set({
      ...updates,
      updatedBy: userId
    })
    .where(and(...conditions))
    .returning()

  if (!printer) {
    throw createError({
      status: 404,
      statusText: 'SalesPrinter not found or unauthorized'
    })
  }

  return printer
}

export async function deleteSalesPrinter(
  recordId: string,
  teamId: string,
  userId: string,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.salesPrinters.id, recordId),
    eq(tables.salesPrinters.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.salesPrinters.owner, userId))
  }

  const [deleted] = await (db as any)
    .delete(tables.salesPrinters)
    .where(and(...conditions))
    .returning()

  if (!deleted) {
    throw createError({
      status: 404,
      statusText: 'SalesPrinter not found or unauthorized'
    })
  }

  return { success: true }
}