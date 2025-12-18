// Generated with array reference post-processing support (v2024-10-12)
import { eq, and, desc, asc, inArray, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { PlaygroundDecision, NewPlaygroundDecision } from '../../types'
import { user } from '~~/server/database/schema'

export async function getAllPlaygroundDecisions(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const decisions = await (db as any)
    .select({
      ...tables.playgroundDecisions,
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
    .from(tables.playgroundDecisions)
    .leftJoin(ownerUser, eq(tables.playgroundDecisions.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.playgroundDecisions.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.playgroundDecisions.updatedBy, updatedByUser.id))
    .where(eq(tables.playgroundDecisions.teamId, teamId))
    .orderBy(desc(tables.playgroundDecisions.createdAt))

  return decisions
}

export async function getPlaygroundDecisionsByIds(teamId: string, decisionIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')
  const createdByUser = alias(user as any, 'createdByUser')
  const updatedByUser = alias(user as any, 'updatedByUser')

  const decisions = await (db as any)
    .select({
      ...tables.playgroundDecisions,
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
    .from(tables.playgroundDecisions)
    .leftJoin(ownerUser, eq(tables.playgroundDecisions.owner, ownerUser.id))
    .leftJoin(createdByUser, eq(tables.playgroundDecisions.createdBy, createdByUser.id))
    .leftJoin(updatedByUser, eq(tables.playgroundDecisions.updatedBy, updatedByUser.id))
    .where(
      and(
        eq(tables.playgroundDecisions.teamId, teamId),
        inArray(tables.playgroundDecisions.id, decisionIds)
      )
    )
    .orderBy(desc(tables.playgroundDecisions.createdAt))

  return decisions
}

export async function createPlaygroundDecision(data: NewPlaygroundDecision) {
  const db = useDB()

  const [decision] = await (db as any)
    .insert(tables.playgroundDecisions)
    .values(data)
    .returning()

  return decision
}

export async function updatePlaygroundDecision(
  recordId: string,
  teamId: string,
  ownerId: string,
  updates: Partial<PlaygroundDecision>
) {
  const db = useDB()

  const [decision] = await (db as any)
    .update(tables.playgroundDecisions)
    .set({
      ...updates,
      updatedBy: ownerId
    })
    .where(
      and(
        eq(tables.playgroundDecisions.id, recordId),
        eq(tables.playgroundDecisions.teamId, teamId),
        eq(tables.playgroundDecisions.owner, ownerId)
      )
    )
    .returning()

  if (!decision) {
    throw createError({
      statusCode: 404,
      statusMessage: 'PlaygroundDecision not found or unauthorized'
    })
  }

  return decision
}

export async function deletePlaygroundDecision(
  recordId: string,
  teamId: string,
  ownerId: string
) {
  const db = useDB()

  const [deleted] = await (db as any)
    .delete(tables.playgroundDecisions)
    .where(
      and(
        eq(tables.playgroundDecisions.id, recordId),
        eq(tables.playgroundDecisions.teamId, teamId),
        eq(tables.playgroundDecisions.owner, ownerId)
      )
    )
    .returning()

  if (!deleted) {
    throw createError({
      statusCode: 404,
      statusMessage: 'PlaygroundDecision not found or unauthorized'
    })
  }

  return { success: true }
}

// Tree hierarchy queries (auto-generated when hierarchy: true)
// Type: PlaygroundDecision with hierarchy fields

interface TreeItem {
  id: string
  path: string
  depth: number
  order: number
  [key: string]: any
}

export async function getTreeDataPlaygroundDecisions(teamId: string) {
  const db = useDB()

  const decisions = await (db as any)
    .select()
    .from(tables.playgroundDecisions)
    .where(eq(tables.playgroundDecisions.teamId, teamId))
    .orderBy(tables.playgroundDecisions.path, tables.playgroundDecisions.order)

  return decisions as TreeItem[]
}

export async function updatePositionPlaygroundDecision(
  teamId: string,
  id: string,
  newParentId: string | null,
  newOrder: number
) {
  const db = useDB()

  // Get the current item to find its path
  const [current] = await (db as any)
    .select()
    .from(tables.playgroundDecisions)
    .where(
      and(
        eq(tables.playgroundDecisions.id, id),
        eq(tables.playgroundDecisions.teamId, teamId)
      )
    ) as TreeItem[]

  if (!current) {
    throw createError({
      statusCode: 404,
      statusMessage: 'PlaygroundDecision not found'
    })
  }

  // Calculate new path and depth
  let newPath: string
  let newDepth: number

  if (newParentId) {
    const [parent] = await (db as any)
      .select()
      .from(tables.playgroundDecisions)
      .where(
        and(
          eq(tables.playgroundDecisions.id, newParentId),
          eq(tables.playgroundDecisions.teamId, teamId)
        )
      ) as TreeItem[]

    if (!parent) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Parent PlaygroundDecision not found'
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
    .update(tables.playgroundDecisions)
    .set({
      parentId: newParentId,
      path: newPath,
      depth: newDepth,
      order: newOrder
    })
    .where(
      and(
        eq(tables.playgroundDecisions.id, id),
        eq(tables.playgroundDecisions.teamId, teamId)
      )
    )
    .returning()

  // Update all descendants' paths if the path changed
  if (oldPath !== newPath) {
    // Get all descendants
    const descendants = await (db as any)
      .select()
      .from(tables.playgroundDecisions)
      .where(
        and(
          eq(tables.playgroundDecisions.teamId, teamId),
          sql`${tables.playgroundDecisions.path} LIKE ${oldPath + '%'} AND ${tables.playgroundDecisions.id} != ${id}`
        )
      ) as TreeItem[]

    // Update each descendant's path and depth
    for (const descendant of descendants) {
      const descendantNewPath = descendant.path.replace(oldPath, newPath)
      const depthDiff = newDepth - current.depth

      await (db as any)
        .update(tables.playgroundDecisions)
        .set({
          path: descendantNewPath,
          depth: descendant.depth + depthDiff
        })
        .where(eq(tables.playgroundDecisions.id, descendant.id))
    }
  }

  return updated
}

export async function reorderSiblingsPlaygroundDecisions(
  teamId: string,
  updates: { id: string; order: number }[]
) {
  const db = useDB()

  const results = []

  for (const update of updates) {
    const [updated] = await (db as any)
      .update(tables.playgroundDecisions)
      .set({ order: update.order })
      .where(
        and(
          eq(tables.playgroundDecisions.id, update.id),
          eq(tables.playgroundDecisions.teamId, teamId)
        )
      )
      .returning()

    if (updated) {
      results.push(updated)
    }
  }

  return results
}