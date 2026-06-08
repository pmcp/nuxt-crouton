// Generated with JSON field post-processing support (v2025-01-11)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { SalesProduct, NewSalesProduct } from '../../types'
import * as eventsSchema from '../../../events/server/database/schema'
import * as categoriesSchema from '../../../categories/server/database/schema'
import * as locationsSchema from '../../../locations/server/database/schema'
import { user } from '~~/server/db/schema'

export async function getAllSalesProducts(teamId: string, filters?: { eventId?: string }) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const products = await (db as any)
    .select({
      ...tables.salesProducts,
      eventIdData: eventsSchema.salesEvents,
      categoryIdData: categoriesSchema.salesCategories,
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
    .from(tables.salesProducts)
    .leftJoin(eventsSchema.salesEvents, eq(tables.salesProducts.eventId, eventsSchema.salesEvents.id))
    .leftJoin(categoriesSchema.salesCategories, eq(tables.salesProducts.categoryId, categoriesSchema.salesCategories.id))
    .leftJoin(locationsSchema.salesLocations, eq(tables.salesProducts.locationId, locationsSchema.salesLocations.id))
    .leftJoin(ownerUser, eq(tables.salesProducts.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.salesProducts.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.salesProducts.updatedBy, updatedByUser.id))
    .where(and(
      eq(tables.salesProducts.teamId, teamId),
      ...(filters?.eventId ? [eq(tables.salesProducts.eventId, filters.eventId)] : [])
    ))
    .orderBy(desc(tables.salesProducts.createdAt))

  // Post-query processing for JSON fields (repeater/json types)
  products.forEach((item: any) => {
      // Parse options from JSON string
      if (typeof item.options === 'string') {
        try {
          item.options = JSON.parse(item.options)
        } catch (e) {
          console.error('Error parsing options:', e)
          item.options = []
        }
      }
      if (item.options === null || item.options === undefined) {
        item.options = []
      }
  })

  return products
}

export async function getSalesProductsByIds(teamId: string, productIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const products = await (db as any)
    .select({
      ...tables.salesProducts,
      eventIdData: eventsSchema.salesEvents,
      categoryIdData: categoriesSchema.salesCategories,
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
    .from(tables.salesProducts)
    .leftJoin(eventsSchema.salesEvents, eq(tables.salesProducts.eventId, eventsSchema.salesEvents.id))
    .leftJoin(categoriesSchema.salesCategories, eq(tables.salesProducts.categoryId, categoriesSchema.salesCategories.id))
    .leftJoin(locationsSchema.salesLocations, eq(tables.salesProducts.locationId, locationsSchema.salesLocations.id))
    .leftJoin(ownerUser, eq(tables.salesProducts.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.salesProducts.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.salesProducts.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.salesProducts.teamId, teamId),
        inArray(tables.salesProducts.id, productIds)
      )
    )
    .orderBy(desc(tables.salesProducts.createdAt))

  // Post-query processing for JSON fields (repeater/json types)
  products.forEach((item: any) => {
      // Parse options from JSON string
      if (typeof item.options === 'string') {
        try {
          item.options = JSON.parse(item.options)
        } catch (e) {
          console.error('Error parsing options:', e)
          item.options = []
        }
      }
      if (item.options === null || item.options === undefined) {
        item.options = []
      }
  })

  return products
}

export async function createSalesProduct(data: NewSalesProduct) {
  const db = useDB()

  const [product] = await (db as any)
    .insert(tables.salesProducts)
    .values(data)
    .returning()

  return product
}

export async function updateSalesProduct(
  recordId: string,
  teamId: string,
  userId: string,
  updates: Partial<SalesProduct>,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.salesProducts.id, recordId),
    eq(tables.salesProducts.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.salesProducts.owner, userId))
  }

  const [product] = await (db as any)
    .update(tables.salesProducts)
    .set({
      ...updates,
      updatedBy: userId
    })
    .where(and(...conditions))
    .returning()

  if (!product) {
    throw createError({
      status: 404,
      statusText: 'SalesProduct not found or unauthorized'
    })
  }

  return product
}

export async function deleteSalesProduct(
  recordId: string,
  teamId: string,
  userId: string,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.salesProducts.id, recordId),
    eq(tables.salesProducts.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.salesProducts.owner, userId))
  }

  const [deleted] = await (db as any)
    .delete(tables.salesProducts)
    .where(and(...conditions))
    .returning()

  if (!deleted) {
    throw createError({
      status: 404,
      statusText: 'SalesProduct not found or unauthorized'
    })
  }

  return { success: true }
}