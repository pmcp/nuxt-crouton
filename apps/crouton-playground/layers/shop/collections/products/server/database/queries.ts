// Generated with JSON field post-processing support (v2025-01-11)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { ShopProduct, NewShopProduct } from '../../types'
import { user } from '~~/server/db/schema'

export async function getAllShopProducts(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const products = await (db as any)
    .select({
      ...tables.shopProducts,
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
    .from(tables.shopProducts)
    .leftJoin(ownerUser, eq(tables.shopProducts.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.shopProducts.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.shopProducts.updatedBy, updatedByUser.id))
    .where(eq(tables.shopProducts.teamId, teamId))
    .orderBy(desc(tables.shopProducts.createdAt))

  return products
}

export async function getShopProductsByIds(teamId: string, productIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const products = await (db as any)
    .select({
      ...tables.shopProducts,
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
    .from(tables.shopProducts)
    .leftJoin(ownerUser, eq(tables.shopProducts.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.shopProducts.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.shopProducts.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.shopProducts.teamId, teamId),
        inArray(tables.shopProducts.id, productIds)
      )
    )
    .orderBy(desc(tables.shopProducts.createdAt))

  return products
}

export async function createShopProduct(data: NewShopProduct) {
  const db = useDB()

  const [product] = await (db as any)
    .insert(tables.shopProducts)
    .values(data)
    .returning()

  return product
}

export async function updateShopProduct(
  recordId: string,
  teamId: string,
  ownerId: string,
  updates: Partial<ShopProduct>
) {
  const db = useDB()

  const [product] = await (db as any)
    .update(tables.shopProducts)
    .set({
      ...updates,
      updatedBy: ownerId
    })
    .where(
      and(
        eq(tables.shopProducts.id, recordId),
        eq(tables.shopProducts.teamId, teamId),
        eq(tables.shopProducts.owner, ownerId)
      )
    )
    .returning()

  if (!product) {
    throw createError({
      status: 404,
      statusText: 'ShopProduct not found or unauthorized'
    })
  }

  return product
}

export async function deleteShopProduct(
  recordId: string,
  teamId: string,
  ownerId: string
) {
  const db = useDB()

  const [deleted] = await (db as any)
    .delete(tables.shopProducts)
    .where(
      and(
        eq(tables.shopProducts.id, recordId),
        eq(tables.shopProducts.teamId, teamId),
        eq(tables.shopProducts.owner, ownerId)
      )
    )
    .returning()

  if (!deleted) {
    throw createError({
      status: 404,
      statusText: 'ShopProduct not found or unauthorized'
    })
  }

  return { success: true }
}