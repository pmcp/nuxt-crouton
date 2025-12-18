// Generated with array reference post-processing support (v2024-10-12)
import { eq, and, desc, asc, inArray, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { PlaygroundDecision, NewPlaygroundDecision } from '../../types'
import { user } from '~~/server/database/schema'

export async function getAllPlaygroundDecisions(teamId: string) {
  const db = useDB()

  const ownerUsers = alias(user, 'ownerUsers')
  const createdByUsers = alias(user, 'createdByUsers')
  const updatedByUsers = alias(user, 'updatedByUsers')

  // @ts-expect-error Complex select with joins requires type assertion
  const decisions = await db
    .select({
      ...tables.playgroundDecisions,
      ownerUser: {
        id: ownerUsers.id,
        name: ownerUsers.name,
        email: ownerUsers.email,
        avatarUrl: ownerUsers.avatarUrl
      },
      createdByUser: {
        id: createdByUsers.id,
        name: createdByUsers.name,
        email: createdByUsers.email,
        avatarUrl: createdByUsers.avatarUrl
      },
      updatedByUser: {
        id: updatedByUsers.id,
        name: updatedByUsers.name,
        email: updatedByUsers.email,
        avatarUrl: updatedByUsers.avatarUrl
      }
    })
    .from(tables.playgroundDecisions)
    .leftJoin(ownerUsers, eq(tables.playgroundDecisions.owner, ownerUsers.id))
    .leftJoin(createdByUsers, eq(tables.playgroundDecisions.createdBy, createdByUsers.id))
    .leftJoin(updatedByUsers, eq(tables.playgroundDecisions.updatedBy, updatedByUsers.id))
    .where(eq(tables.playgroundDecisions.teamId, teamId))
    .orderBy(desc(tables.playgroundDecisions.createdAt))

  return decisions
}

export async function getPlaygroundDecisionsByIds(teamId: string, decisionIds: string[]) {
  const db = useDB()

  const ownerUsers = alias(user, 'ownerUsers')
  const createdByUsers = alias(user, 'createdByUsers')
  const updatedByUsers = alias(user, 'updatedByUsers')

  // @ts-expect-error Complex select with joins requires type assertion
  const decisions = await db
    .select({
      ...tables.playgroundDecisions,
      ownerUser: {
        id: ownerUsers.id,
        name: ownerUsers.name,
        email: ownerUsers.email,
        avatarUrl: ownerUsers.avatarUrl
      },
      createdByUser: {
        id: createdByUsers.id,
        name: createdByUsers.name,
        email: createdByUsers.email,
        avatarUrl: createdByUsers.avatarUrl
      },
      updatedByUser: {
        id: updatedByUsers.id,
        name: updatedByUsers.name,
        email: updatedByUsers.email,
        avatarUrl: updatedByUsers.avatarUrl
      }
    })
    .from(tables.playgroundDecisions)
    .leftJoin(ownerUsers, eq(tables.playgroundDecisions.owner, ownerUsers.id))
    .leftJoin(createdByUsers, eq(tables.playgroundDecisions.createdBy, createdByUsers.id))
    .leftJoin(updatedByUsers, eq(tables.playgroundDecisions.updatedBy, updatedByUsers.id))
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

  const [decision] = await db
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

  const [decision] = await db
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

  const [deleted] = await db
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

export async function getTreeDataPlaygroundDecisions(teamId: string) {
  const db = useDB()

  const decisions = await db
    .select()
    .from(tables.playgroundDecisions)
    .where(eq(tables.playgroundDecisions.teamId, teamId))
    .orderBy(tables.playgroundDecisions.path, tables.playgroundDecisions.order)

  return decisions
}

export async function updatePositionPlaygroundDecision(
  teamId: string,
  id: string,
  newParentId: string | null,
  newOrder: number
) {
  const db = useDB()

  // Get the current item to find its path
  const [current] = await db
    .select()
    .from(tables.playgroundDecisions)
    .where(
      and(
        eq(tables.playgroundDecisions.id, id),
        eq(tables.playgroundDecisions.teamId, teamId)
      )
    )

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
    const [parent] = await db
      .select()
      .from(tables.playgroundDecisions)
      .where(
        and(
          eq(tables.playgroundDecisions.id, newParentId),
          eq(tables.playgroundDecisions.teamId, teamId)
        )
      )

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
  const [updated] = await db
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
    const descendants = await db
      .select()
      .from(tables.playgroundDecisions)
      .where(
        and(
          eq(tables.playgroundDecisions.teamId, teamId),
          sql`${tables.playgroundDecisions.path} LIKE ${oldPath + '%'} AND ${tables.playgroundDecisions.id} != ${id}`
        )
      )

    // Update each descendant's path and depth
    for (const descendant of descendants) {
      const descendantNewPath = descendant.path.replace(oldPath, newPath)
      const depthDiff = newDepth - current.depth

      await db
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
    const [updated] = await db
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