// Generated with JSON field post-processing support (v2025-01-11)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { ShopOrder, NewShopOrder } from '../../types'
import * as productsSchema from '../../../products/server/database/schema'
import { user } from '~~/server/db/schema'

export async function getAllShopOrders(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const orders = await (db as any)
    .select({
      ...tables.shopOrders,
      productIdData: productsSchema.shopProducts,
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
    .from(tables.shopOrders)
    .leftJoin(productsSchema.shopProducts, eq(tables.shopOrders.productId, productsSchema.shopProducts.id))
    .leftJoin(ownerUser, eq(tables.shopOrders.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.shopOrders.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.shopOrders.updatedBy, updatedByUser.id))
    .where(eq(tables.shopOrders.teamId, teamId))
    .orderBy(desc(tables.shopOrders.createdAt))

  // Post-query processing for JSON fields (repeater/json types)
  orders.forEach((item: any) => {
      // Parse shippingAddress from JSON string
      if (typeof item.shippingAddress === 'string') {
        try {
          item.shippingAddress = JSON.parse(item.shippingAddress)
        } catch (e) {
          console.error('Error parsing shippingAddress:', e)
          item.shippingAddress = null
        }
      }
      if (item.shippingAddress === null || item.shippingAddress === undefined) {
        item.shippingAddress = null
      }
  })

  return orders
}

export async function getShopOrdersByIds(teamId: string, orderIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const orders = await (db as any)
    .select({
      ...tables.shopOrders,
      productIdData: productsSchema.shopProducts,
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
    .from(tables.shopOrders)
    .leftJoin(productsSchema.shopProducts, eq(tables.shopOrders.productId, productsSchema.shopProducts.id))
    .leftJoin(ownerUser, eq(tables.shopOrders.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.shopOrders.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.shopOrders.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.shopOrders.teamId, teamId),
        inArray(tables.shopOrders.id, orderIds)
      )
    )
    .orderBy(desc(tables.shopOrders.createdAt))

  // Post-query processing for JSON fields (repeater/json types)
  orders.forEach((item: any) => {
      // Parse shippingAddress from JSON string
      if (typeof item.shippingAddress === 'string') {
        try {
          item.shippingAddress = JSON.parse(item.shippingAddress)
        } catch (e) {
          console.error('Error parsing shippingAddress:', e)
          item.shippingAddress = null
        }
      }
      if (item.shippingAddress === null || item.shippingAddress === undefined) {
        item.shippingAddress = null
      }
  })

  return orders
}

export async function createShopOrder(data: NewShopOrder) {
  const db = useDB()

  const [order] = await (db as any)
    .insert(tables.shopOrders)
    .values(data)
    .returning()

  return order
}

export async function updateShopOrder(
  recordId: string,
  teamId: string,
  ownerId: string,
  updates: Partial<ShopOrder>
) {
  const db = useDB()

  const [order] = await (db as any)
    .update(tables.shopOrders)
    .set({
      ...updates,
      updatedBy: ownerId
    })
    .where(
      and(
        eq(tables.shopOrders.id, recordId),
        eq(tables.shopOrders.teamId, teamId),
        eq(tables.shopOrders.owner, ownerId)
      )
    )
    .returning()

  if (!order) {
    throw createError({
      status: 404,
      statusText: 'ShopOrder not found or unauthorized'
    })
  }

  return order
}

export async function deleteShopOrder(
  recordId: string,
  teamId: string,
  ownerId: string
) {
  const db = useDB()

  const [deleted] = await (db as any)
    .delete(tables.shopOrders)
    .where(
      and(
        eq(tables.shopOrders.id, recordId),
        eq(tables.shopOrders.teamId, teamId),
        eq(tables.shopOrders.owner, ownerId)
      )
    )
    .returning()

  if (!deleted) {
    throw createError({
      status: 404,
      statusText: 'ShopOrder not found or unauthorized'
    })
  }

  return { success: true }
}