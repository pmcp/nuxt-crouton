// Generated with array reference post-processing support (v2024-10-12)
import { eq, and, desc, asc, inArray, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { PlaygroundCategorie, NewPlaygroundCategorie } from '../../types'
import { user } from '~~/server/database/schema'

export async function getAllPlaygroundCategories(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const categories = await (db as any)
    .select({
      ...tables.playgroundCategories,
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
    .from(tables.playgroundCategories)
    .leftJoin(ownerUser, eq(tables.playgroundCategories.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.playgroundCategories.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.playgroundCategories.updatedBy, updatedByUser.id))
    .where(eq(tables.playgroundCategories.teamId, teamId))
    .orderBy(desc(tables.playgroundCategories.createdAt))

  return categories
}

export async function getPlaygroundCategoriesByIds(teamId: string, categorieIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const categories = await (db as any)
    .select({
      ...tables.playgroundCategories,
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
    .from(tables.playgroundCategories)
    .leftJoin(ownerUser, eq(tables.playgroundCategories.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.playgroundCategories.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.playgroundCategories.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.playgroundCategories.teamId, teamId),
        inArray(tables.playgroundCategories.id, categorieIds)
      )
    )
    .orderBy(desc(tables.playgroundCategories.createdAt))

  return categories
}

export async function createPlaygroundCategorie(data: NewPlaygroundCategorie) {
  const db = useDB()

  const [categorie] = await (db as any)
    .insert(tables.playgroundCategories)
    .values(data)
    .returning()

  return categorie
}

export async function updatePlaygroundCategorie(
  recordId: string,
  teamId: string,
  ownerId: string,
  updates: Partial<PlaygroundCategorie>
) {
  const db = useDB()

  const [categorie] = await (db as any)
    .update(tables.playgroundCategories)
    .set({
      ...updates,
      updatedBy: ownerId
    })
    .where(
      and(
        eq(tables.playgroundCategories.id, recordId),
        eq(tables.playgroundCategories.teamId, teamId),
        eq(tables.playgroundCategories.owner, ownerId)
      )
    )
    .returning()

  if (!categorie) {
    throw createError({
      statusCode: 404,
      statusMessage: 'PlaygroundCategorie not found or unauthorized'
    })
  }

  return categorie
}

export async function deletePlaygroundCategorie(
  recordId: string,
  teamId: string,
  ownerId: string
) {
  const db = useDB()

  const [deleted] = await (db as any)
    .delete(tables.playgroundCategories)
    .where(
      and(
        eq(tables.playgroundCategories.id, recordId),
        eq(tables.playgroundCategories.teamId, teamId),
        eq(tables.playgroundCategories.owner, ownerId)
      )
    )
    .returning()

  if (!deleted) {
    throw createError({
      statusCode: 404,
      statusMessage: 'PlaygroundCategorie not found or unauthorized'
    })
  }

  return { success: true }
}

// Tree hierarchy queries (auto-generated when hierarchy: true)
// Type: PlaygroundCategorie with hierarchy fields

interface TreeItem {
  id: string
  path: string
  depth: number
  order: number
  [key: string]: any
}

export async function getTreeDataPlaygroundCategories(teamId: string) {
  const db = useDB()

  const categories = await (db as any)
    .select()
    .from(tables.playgroundCategories)
    .where(eq(tables.playgroundCategories.teamId, teamId))
    .orderBy(tables.playgroundCategories.path, tables.playgroundCategories.order)

  return categories as TreeItem[]
}

export async function updatePositionPlaygroundCategorie(
  teamId: string,
  id: string,
  newParentId: string | null,
  newOrder: number
) {
  const db = useDB()

  // Get the current item to find its path
  const [current] = await (db as any)
    .select()
    .from(tables.playgroundCategories)
    .where(
      and(
        eq(tables.playgroundCategories.id, id),
        eq(tables.playgroundCategories.teamId, teamId)
      )
    ) as TreeItem[]

  if (!current) {
    throw createError({
      statusCode: 404,
      statusMessage: 'PlaygroundCategorie not found'
    })
  }

  // Calculate new path and depth
  let newPath: string
  let newDepth: number

  if (newParentId) {
    const [parent] = await (db as any)
      .select()
      .from(tables.playgroundCategories)
      .where(
        and(
          eq(tables.playgroundCategories.id, newParentId),
          eq(tables.playgroundCategories.teamId, teamId)
        )
      ) as TreeItem[]

    if (!parent) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Parent PlaygroundCategorie not found'
      })
    }

    // Prevent moving item to its own descendant
    if (parent.path.startsWith(current.path)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Cannot move item to its own descendant'
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
    .update(tables.playgroundCategories)
    .set({
      parentId: newParentId,
      path: newPath,
      depth: newDepth,
      order: newOrder
    })
    .where(
      and(
        eq(tables.playgroundCategories.id, id),
        eq(tables.playgroundCategories.teamId, teamId)
      )
    )
    .returning()

  // Update all descendants' paths if the path changed
  if (oldPath !== newPath) {
    // Get all descendants
    const descendants = await (db as any)
      .select()
      .from(tables.playgroundCategories)
      .where(
        and(
          eq(tables.playgroundCategories.teamId, teamId),
          sql`${tables.playgroundCategories.path} LIKE ${oldPath + '%'} AND ${tables.playgroundCategories.id} != ${id}`
        )
      ) as TreeItem[]

    // Update each descendant's path and depth
    for (const descendant of descendants) {
      const descendantNewPath = descendant.path.replace(oldPath, newPath)
      const depthDiff = newDepth - current.depth

      await (db as any)
        .update(tables.playgroundCategories)
        .set({
          path: descendantNewPath,
          depth: descendant.depth + depthDiff
        })
        .where(eq(tables.playgroundCategories.id, descendant.id))
    }
  }

  return updated
}

export async function reorderSiblingsPlaygroundCategories(
  teamId: string,
  updates: { id: string; order: number }[]
) {
  const db = useDB()

  const results = []

  for (const update of updates) {
    const [updated] = await (db as any)
      .update(tables.playgroundCategories)
      .set({ order: update.order })
      .where(
        and(
          eq(tables.playgroundCategories.id, update.id),
          eq(tables.playgroundCategories.teamId, teamId)
        )
      )
      .returning()

    if (updated) {
      results.push(updated)
    }
  }

  return results
}