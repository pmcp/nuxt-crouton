// Generated with array reference post-processing support (v2024-10-12)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { SalesOrderItem, NewSalesOrderItem } from '../../types'
import * as ordersSchema from '../../../orders/server/database/schema'
import * as productsSchema from '../../../products/server/database/schema'
import { user } from '~~/server/db/schema'

export async function getAllSalesOrderItems(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const orderitems = await (db as any)
    .select({
      ...tables.salesOrderitems,
      orderIdData: ordersSchema.salesOrders,
      productIdData: productsSchema.salesProducts,
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
    .from(tables.salesOrderitems)
    .leftJoin(ordersSchema.salesOrders, eq(tables.salesOrderitems.orderId, ordersSchema.salesOrders.id))
    .leftJoin(productsSchema.salesProducts, eq(tables.salesOrderitems.productId, productsSchema.salesProducts.id))
    .leftJoin(ownerUser, eq(tables.salesOrderitems.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.salesOrderitems.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.salesOrderitems.updatedBy, updatedByUser.id))
    .where(eq(tables.salesOrderitems.teamId, teamId))
    .orderBy(desc(tables.salesOrderitems.createdAt))

  return orderitems
}

export async function getSalesOrderItemsByIds(teamId: string, orderitemIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const orderitems = await (db as any)
    .select({
      ...tables.salesOrderitems,
      orderIdData: ordersSchema.salesOrders,
      productIdData: productsSchema.salesProducts,
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
    .from(tables.salesOrderitems)
    .leftJoin(ordersSchema.salesOrders, eq(tables.salesOrderitems.orderId, ordersSchema.salesOrders.id))
    .leftJoin(productsSchema.salesProducts, eq(tables.salesOrderitems.productId, productsSchema.salesProducts.id))
    .leftJoin(ownerUser, eq(tables.salesOrderitems.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.salesOrderitems.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.salesOrderitems.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.salesOrderitems.teamId, teamId),
        inArray(tables.salesOrderitems.id, orderitemIds)
      )
    )
    .orderBy(desc(tables.salesOrderitems.createdAt))

  return orderitems
}

export async function createSalesOrderItem(data: NewSalesOrderItem) {
  const db = useDB()

  const [orderitem] = await (db as any)
    .insert(tables.salesOrderitems)
    .values(data)
    .returning()

  return orderitem
}

export async function updateSalesOrderItem(
  recordId: string,
  teamId: string,
  ownerId: string,
  updates: Partial<SalesOrderItem>
) {
  const db = useDB()

  const [orderitem] = await (db as any)
    .update(tables.salesOrderitems)
    .set({
      ...updates,
      updatedBy: ownerId
    })
    .where(
      and(
        eq(tables.salesOrderitems.id, recordId),
        eq(tables.salesOrderitems.teamId, teamId),
        eq(tables.salesOrderitems.owner, ownerId)
      )
    )
    .returning()

  if (!orderitem) {
    throw createError({
      statusCode: 404,
      statusMessage: 'SalesOrderItem not found or unauthorized'
    })
  }

  return orderitem
}

export async function deleteSalesOrderItem(
  recordId: string,
  teamId: string,
  ownerId: string
) {
  const db = useDB()

  const [deleted] = await (db as any)
    .delete(tables.salesOrderitems)
    .where(
      and(
        eq(tables.salesOrderitems.id, recordId),
        eq(tables.salesOrderitems.teamId, teamId),
        eq(tables.salesOrderitems.owner, ownerId)
      )
    )
    .returning()

  if (!deleted) {
    throw createError({
      statusCode: 404,
      statusMessage: 'SalesOrderItem not found or unauthorized'
    })
  }

  return { success: true }
}