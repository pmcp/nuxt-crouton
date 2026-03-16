// Generated with JSON field post-processing support (v2025-01-11)
import { eq, and, desc, asc, inArray, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { ThinkgraphNode, NewThinkgraphNode } from '../../types'
import * as canvasesSchema from '../../../canvases/server/database/schema'
import * as nodesSchema from '../../../nodes/server/database/schema'
import { user } from '~~/server/db/schema'

export async function getAllThinkgraphNodes(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')

  const nodes = await (db as any)
    .select({
      ...tables.thinkgraphNodes,
      canvasIdData: canvasesSchema.thinkgraphCanvases,
      parentIdData: nodesSchema.thinkgraphNodes,
      ownerUser: {
        id: ownerUser.id,
        name: ownerUser.name,
        email: ownerUser.email,
        image: ownerUser.image
      }
    } as any)
    .from(tables.thinkgraphNodes)
    .leftJoin(canvasesSchema.thinkgraphCanvases, eq(tables.thinkgraphNodes.canvasId, canvasesSchema.thinkgraphCanvases.id))
    .leftJoin(nodesSchema.thinkgraphNodes, eq(tables.thinkgraphNodes.parentId, nodesSchema.thinkgraphNodes.id))
    .leftJoin(ownerUser, eq(tables.thinkgraphNodes.owner, ownerUser.id))
    .where(eq(tables.thinkgraphNodes.teamId, teamId))
    .orderBy(desc(tables.thinkgraphNodes.createdAt))

  // Post-query processing for JSON fields (repeater/json types)
  nodes.forEach((item: any) => {
      // Parse handoffMeta from JSON string
      if (typeof item.handoffMeta === 'string') {
        try {
          item.handoffMeta = JSON.parse(item.handoffMeta)
        } catch (e) {
          console.error('Error parsing handoffMeta:', e)
          item.handoffMeta = null
        }
      }
      if (item.handoffMeta === null || item.handoffMeta === undefined) {
        item.handoffMeta = null
      }
      // Parse contextNodeIds from JSON string
      if (typeof item.contextNodeIds === 'string') {
        try {
          item.contextNodeIds = JSON.parse(item.contextNodeIds)
        } catch (e) {
          console.error('Error parsing contextNodeIds:', e)
          item.contextNodeIds = null
        }
      }
      if (item.contextNodeIds === null || item.contextNodeIds === undefined) {
        item.contextNodeIds = null
      }
  })

  return nodes
}

export async function getThinkgraphNodesByIds(teamId: string, nodeIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')

  const nodes = await (db as any)
    .select({
      ...tables.thinkgraphNodes,
      canvasIdData: canvasesSchema.thinkgraphCanvases,
      parentIdData: nodesSchema.thinkgraphNodes,
      ownerUser: {
        id: ownerUser.id,
        name: ownerUser.name,
        email: ownerUser.email,
        image: ownerUser.image
      }
    } as any)
    .from(tables.thinkgraphNodes)
    .leftJoin(canvasesSchema.thinkgraphCanvases, eq(tables.thinkgraphNodes.canvasId, canvasesSchema.thinkgraphCanvases.id))
    .leftJoin(nodesSchema.thinkgraphNodes, eq(tables.thinkgraphNodes.parentId, nodesSchema.thinkgraphNodes.id))
    .leftJoin(ownerUser, eq(tables.thinkgraphNodes.owner, ownerUser.id))
    .where(
      and(
        eq(tables.thinkgraphNodes.teamId, teamId),
        inArray(tables.thinkgraphNodes.id, nodeIds)
      )
    )
    .orderBy(desc(tables.thinkgraphNodes.createdAt))

  // Post-query processing for JSON fields (repeater/json types)
  nodes.forEach((item: any) => {
      // Parse handoffMeta from JSON string
      if (typeof item.handoffMeta === 'string') {
        try {
          item.handoffMeta = JSON.parse(item.handoffMeta)
        } catch (e) {
          console.error('Error parsing handoffMeta:', e)
          item.handoffMeta = null
        }
      }
      if (item.handoffMeta === null || item.handoffMeta === undefined) {
        item.handoffMeta = null
      }
      // Parse contextNodeIds from JSON string
      if (typeof item.contextNodeIds === 'string') {
        try {
          item.contextNodeIds = JSON.parse(item.contextNodeIds)
        } catch (e) {
          console.error('Error parsing contextNodeIds:', e)
          item.contextNodeIds = null
        }
      }
      if (item.contextNodeIds === null || item.contextNodeIds === undefined) {
        item.contextNodeIds = null
      }
  })

  return nodes
}

export async function createThinkgraphNode(data: NewThinkgraphNode) {
  const db = useDB()

  const [node] = await (db as any)
    .insert(tables.thinkgraphNodes)
    .values(data)
    .returning()

  return node
}

export async function updateThinkgraphNode(
  recordId: string,
  teamId: string,
  userId: string,
  updates: Partial<ThinkgraphNode>,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.thinkgraphNodes.id, recordId),
    eq(tables.thinkgraphNodes.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.thinkgraphNodes.owner, userId))
  }

  const [node] = await (db as any)
    .update(tables.thinkgraphNodes)
    .set({
      ...updates,
      updatedBy: userId
    })
    .where(and(...conditions))
    .returning()

  if (!node) {
    throw createError({
      status: 404,
      statusText: 'ThinkgraphNode not found or unauthorized'
    })
  }

  return node
}

export async function deleteThinkgraphNode(
  recordId: string,
  teamId: string,
  userId: string,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.thinkgraphNodes.id, recordId),
    eq(tables.thinkgraphNodes.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.thinkgraphNodes.owner, userId))
  }

  const [deleted] = await (db as any)
    .delete(tables.thinkgraphNodes)
    .where(and(...conditions))
    .returning()

  if (!deleted) {
    throw createError({
      status: 404,
      statusText: 'ThinkgraphNode not found or unauthorized'
    })
  }

  return { success: true }
}

// Tree hierarchy queries (auto-generated when hierarchy: true)
// Type: ThinkgraphNode with hierarchy fields

interface TreeItem {
  id: string
  path: string
  depth: number
  order: number
  [key: string]: any
}

export async function getTreeDataThinkgraphNodes(teamId: string) {
  const db = useDB()

  const nodes = await (db as any)
    .select()
    .from(tables.thinkgraphNodes)
    .where(eq(tables.thinkgraphNodes.teamId, teamId))
    .orderBy(tables.thinkgraphNodes.path, tables.thinkgraphNodes.order)

  return nodes as TreeItem[]
}

export async function updatePositionThinkgraphNode(
  teamId: string,
  id: string,
  newParentId: string | null,
  newOrder: number
) {
  const db = useDB()

  // Get the current item to find its path
  const [current] = await (db as any)
    .select()
    .from(tables.thinkgraphNodes)
    .where(
      and(
        eq(tables.thinkgraphNodes.id, id),
        eq(tables.thinkgraphNodes.teamId, teamId)
      )
    ) as TreeItem[]

  if (!current) {
    throw createError({
      status: 404,
      statusText: 'ThinkgraphNode not found'
    })
  }

  // Calculate new path and depth
  let newPath: string
  let newDepth: number

  if (newParentId) {
    const [parent] = await (db as any)
      .select()
      .from(tables.thinkgraphNodes)
      .where(
        and(
          eq(tables.thinkgraphNodes.id, newParentId),
          eq(tables.thinkgraphNodes.teamId, teamId)
        )
      ) as TreeItem[]

    if (!parent) {
      throw createError({
        status: 400,
        statusText: 'Parent ThinkgraphNode not found'
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
    .update(tables.thinkgraphNodes)
    .set({
      parentId: newParentId,
      path: newPath,
      depth: newDepth,
      order: newOrder
    })
    .where(
      and(
        eq(tables.thinkgraphNodes.id, id),
        eq(tables.thinkgraphNodes.teamId, teamId)
      )
    )
    .returning()

  // Update all descendants' paths if the path changed
  if (oldPath !== newPath) {
    // Get all descendants
    const descendants = await (db as any)
      .select()
      .from(tables.thinkgraphNodes)
      .where(
        and(
          eq(tables.thinkgraphNodes.teamId, teamId),
          sql`${tables.thinkgraphNodes.path} LIKE ${oldPath + '%'} AND ${tables.thinkgraphNodes.id} != ${id}`
        )
      ) as TreeItem[]

    // Update each descendant's path and depth
    for (const descendant of descendants) {
      const descendantNewPath = descendant.path.replace(oldPath, newPath)
      const depthDiff = newDepth - current.depth

      await (db as any)
        .update(tables.thinkgraphNodes)
        .set({
          path: descendantNewPath,
          depth: descendant.depth + depthDiff
        })
        .where(eq(tables.thinkgraphNodes.id, descendant.id))
    }
  }

  return updated
}

export async function reorderSiblingsThinkgraphNodes(
  teamId: string,
  updates: { id: string; order: number }[]
) {
  const db = useDB()

  const results = []

  for (const update of updates) {
    const [updated] = await (db as any)
      .update(tables.thinkgraphNodes)
      .set({ order: update.order })
      .where(
        and(
          eq(tables.thinkgraphNodes.id, update.id),
          eq(tables.thinkgraphNodes.teamId, teamId)
        )
      )
      .returning()

    if (updated) {
      results.push(updated)
    }
  }

  return results
}