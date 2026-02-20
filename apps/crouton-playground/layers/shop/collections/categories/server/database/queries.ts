// Generated with JSON field post-processing support (v2025-01-11)
import { eq, and, desc, asc, inArray, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { ShopCategorie, NewShopCategorie } from '../../types'
import { user } from '~~/server/db/schema'

export async function getAllShopCategories(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const categories = await (db as any)
    .select({
      ...tables.shopCategories,
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
    .from(tables.shopCategories)
    .leftJoin(ownerUser, eq(tables.shopCategories.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.shopCategories.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.shopCategories.updatedBy, updatedByUser.id))
    .where(eq(tables.shopCategories.teamId, teamId))
    .orderBy(desc(tables.shopCategories.createdAt))

  return categories
}

export async function getShopCategoriesByIds(teamId: string, categorieIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const categories = await (db as any)
    .select({
      ...tables.shopCategories,
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
    .from(tables.shopCategories)
    .leftJoin(ownerUser, eq(tables.shopCategories.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.shopCategories.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.shopCategories.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.shopCategories.teamId, teamId),
        inArray(tables.shopCategories.id, categorieIds)
      )
    )
    .orderBy(desc(tables.shopCategories.createdAt))

  return categories
}

export async function createShopCategorie(data: NewShopCategorie) {
  const db = useDB()

  const [categorie] = await (db as any)
    .insert(tables.shopCategories)
    .values(data)
    .returning()

  return categorie
}

export async function updateShopCategorie(
  recordId: string,
  teamId: string,
  ownerId: string,
  updates: Partial<ShopCategorie>
) {
  const db = useDB()

  const [categorie] = await (db as any)
    .update(tables.shopCategories)
    .set({
      ...updates,
      updatedBy: ownerId
    })
    .where(
      and(
        eq(tables.shopCategories.id, recordId),
        eq(tables.shopCategories.teamId, teamId),
        eq(tables.shopCategories.owner, ownerId)
      )
    )
    .returning()

  if (!categorie) {
    throw createError({
      status: 404,
      statusText: 'ShopCategorie not found or unauthorized'
    })
  }

  return categorie
}

export async function deleteShopCategorie(
  recordId: string,
  teamId: string,
  ownerId: string
) {
  const db = useDB()

  const [deleted] = await (db as any)
    .delete(tables.shopCategories)
    .where(
      and(
        eq(tables.shopCategories.id, recordId),
        eq(tables.shopCategories.teamId, teamId),
        eq(tables.shopCategories.owner, ownerId)
      )
    )
    .returning()

  if (!deleted) {
    throw createError({
      status: 404,
      statusText: 'ShopCategorie not found or unauthorized'
    })
  }

  return { success: true }
}

// Tree hierarchy queries (auto-generated when hierarchy: true)
// Type: ShopCategorie with hierarchy fields

interface TreeItem {
  id: string
  path: string
  depth: number
  order: number
  [key: string]: any
}

export async function getTreeDataShopCategories(teamId: string) {
  const db = useDB()

  const categories = await (db as any)
    .select()
    .from(tables.shopCategories)
    .where(eq(tables.shopCategories.teamId, teamId))
    .orderBy(tables.shopCategories.path, tables.shopCategories.order)

  return categories as TreeItem[]
}

export async function updatePositionShopCategorie(
  teamId: string,
  id: string,
  newParentId: string | null,
  newOrder: number
) {
  const db = useDB()

  // Get the current item to find its path
  const [current] = await (db as any)
    .select()
    .from(tables.shopCategories)
    .where(
      and(
        eq(tables.shopCategories.id, id),
        eq(tables.shopCategories.teamId, teamId)
      )
    ) as TreeItem[]

  if (!current) {
    throw createError({
      status: 404,
      statusText: 'ShopCategorie not found'
    })
  }

  // Calculate new path and depth
  let newPath: string
  let newDepth: number

  if (newParentId) {
    const [parent] = await (db as any)
      .select()
      .from(tables.shopCategories)
      .where(
        and(
          eq(tables.shopCategories.id, newParentId),
          eq(tables.shopCategories.teamId, teamId)
        )
      ) as TreeItem[]

    if (!parent) {
      throw createError({
        status: 400,
        statusText: 'Parent ShopCategorie not found'
      })
    }

    // Prevent moving item to its own descendant
    if (parent.path.startsWith(current.path)) {
      throw createError({
        status: 400,
        statusText: 'Cannot move item to its own descendant'
      })
    }

    newPath = `${parent.path}${id}/`
    newDepth = parent.depth + 1
  } else {
    newPath = `/${id}/`
    newDepth = 0
  }

  const oldPath = current.path

  // Update the item itself
  const [updated] = await (db as any)
    .update(tables.shopCategories)
    .set({
      parentId: newParentId,
      path: newPath,
      depth: newDepth,
      order: newOrder
    })
    .where(
      and(
        eq(tables.shopCategories.id, id),
        eq(tables.shopCategories.teamId, teamId)
      )
    )
    .returning()

  // Update all descendants' paths if the path changed
  if (oldPath !== newPath) {
    // Get all descendants
    const descendants = await (db as any)
      .select()
      .from(tables.shopCategories)
      .where(
        and(
          eq(tables.shopCategories.teamId, teamId),
          sql`${tables.shopCategories.path} LIKE ${oldPath + '%'} AND ${tables.shopCategories.id} != ${id}`
        )
      ) as TreeItem[]

    // Update each descendant's path and depth
    for (const descendant of descendants) {
      const descendantNewPath = descendant.path.replace(oldPath, newPath)
      const depthDiff = newDepth - current.depth

      await (db as any)
        .update(tables.shopCategories)
        .set({
          path: descendantNewPath,
          depth: descendant.depth + depthDiff
        })
        .where(eq(tables.shopCategories.id, descendant.id))
    }
  }

  return updated
}

export async function reorderSiblingsShopCategories(
  teamId: string,
  updates: { id: string; order: number }[]
) {
  const db = useDB()

  const results = []

  for (const update of updates) {
    const [updated] = await (db as any)
      .update(tables.shopCategories)
      .set({ order: update.order })
      .where(
        and(
          eq(tables.shopCategories.id, update.id),
          eq(tables.shopCategories.teamId, teamId)
        )
      )
      .returning()

    if (updated) {
      results.push(updated)
    }
  }

  return results
}