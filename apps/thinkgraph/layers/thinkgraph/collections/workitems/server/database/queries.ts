// Generated with JSON field post-processing support (v2025-01-11)
import { eq, and, desc, asc, inArray, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { ThinkgraphWorkItem, NewThinkgraphWorkItem } from '../../types'
import * as projectsSchema from '../../../projects/server/database/schema'
import { user } from '~~/server/db/schema'

export async function getAllThinkgraphWorkItems(teamId: string, projectId?: string) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')

  const conditions = [eq(tables.thinkgraphWorkItems.teamId, teamId)]
  if (projectId) {
    conditions.push(eq(tables.thinkgraphWorkItems.projectId, projectId))
  }

  const workItems = await (db as any)
    .select({
      ...tables.thinkgraphWorkItems,
      projectIdData: projectsSchema.thinkgraphProjects,
      ownerUser: {
        id: ownerUser.id,
        name: ownerUser.name,
        email: ownerUser.email,
        image: ownerUser.image
      }
    } as any)
    .from(tables.thinkgraphWorkItems)
    .leftJoin(projectsSchema.thinkgraphProjects, eq(tables.thinkgraphWorkItems.projectId, projectsSchema.thinkgraphProjects.id))
    .leftJoin(ownerUser, eq(tables.thinkgraphWorkItems.owner, ownerUser.id))
    .where(and(...conditions))
    .orderBy(desc(tables.thinkgraphWorkItems.order))

  // Post-query processing for JSON fields (repeater/json types)
  workItems.forEach((item: any) => {
      // Parse artifacts from JSON string
      if (typeof item.artifacts === 'string') {
        try {
          item.artifacts = JSON.parse(item.artifacts)
        } catch (e) {
          console.error('Error parsing artifacts:', e)
          item.artifacts = null
        }
      }
      if (item.artifacts === null || item.artifacts === undefined) {
        item.artifacts = null
      }
  })

  return workItems
}

export async function getThinkgraphWorkItemsByIds(teamId: string, workItemIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')

  const workItems = await (db as any)
    .select({
      ...tables.thinkgraphWorkItems,
      projectIdData: projectsSchema.thinkgraphProjects,
      ownerUser: {
        id: ownerUser.id,
        name: ownerUser.name,
        email: ownerUser.email,
        image: ownerUser.image
      }
    } as any)
    .from(tables.thinkgraphWorkItems)
    .leftJoin(projectsSchema.thinkgraphProjects, eq(tables.thinkgraphWorkItems.projectId, projectsSchema.thinkgraphProjects.id))
    .leftJoin(ownerUser, eq(tables.thinkgraphWorkItems.owner, ownerUser.id))
    .where(
      and(
        eq(tables.thinkgraphWorkItems.teamId, teamId),
        inArray(tables.thinkgraphWorkItems.id, workItemIds)
      )
    )
    .orderBy(desc(tables.thinkgraphWorkItems.order))

  // Post-query processing for JSON fields (repeater/json types)
  workItems.forEach((item: any) => {
      // Parse artifacts from JSON string
      if (typeof item.artifacts === 'string') {
        try {
          item.artifacts = JSON.parse(item.artifacts)
        } catch (e) {
          console.error('Error parsing artifacts:', e)
          item.artifacts = null
        }
      }
      if (item.artifacts === null || item.artifacts === undefined) {
        item.artifacts = null
      }
  })

  return workItems
}

export async function createThinkgraphWorkItem(data: NewThinkgraphWorkItem) {
  const db = useDB()

  const [workItem] = await (db as any)
    .insert(tables.thinkgraphWorkItems)
    .values(data)
    .returning()

  return workItem
}

export async function updateThinkgraphWorkItem(
  recordId: string,
  teamId: string,
  userId: string,
  updates: Partial<ThinkgraphWorkItem>,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.thinkgraphWorkItems.id, recordId),
    eq(tables.thinkgraphWorkItems.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.thinkgraphWorkItems.owner, userId))
  }

  const [workItem] = await (db as any)
    .update(tables.thinkgraphWorkItems)
    .set({
      ...updates,
      updatedBy: userId
    })
    .where(and(...conditions))
    .returning()

  if (!workItem) {
    throw createError({
      status: 404,
      statusText: 'ThinkgraphWorkItem not found or unauthorized'
    })
  }

  return workItem
}

export async function deleteThinkgraphWorkItem(
  recordId: string,
  teamId: string,
  userId: string,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.thinkgraphWorkItems.id, recordId),
    eq(tables.thinkgraphWorkItems.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.thinkgraphWorkItems.owner, userId))
  }

  const [deleted] = await (db as any)
    .delete(tables.thinkgraphWorkItems)
    .where(and(...conditions))
    .returning()

  if (!deleted) {
    throw createError({
      status: 404,
      statusText: 'ThinkgraphWorkItem not found or unauthorized'
    })
  }

  return { success: true }
}

// Tree hierarchy queries (auto-generated when hierarchy: true)
// Type: ThinkgraphWorkItem with hierarchy fields

interface TreeItem {
  id: string
  path: string
  depth: number
  order: number
  [key: string]: any
}

export async function getTreeDataThinkgraphWorkItems(teamId: string) {
  const db = useDB()

  const workItems = await (db as any)
    .select()
    .from(tables.thinkgraphWorkItems)
    .where(eq(tables.thinkgraphWorkItems.teamId, teamId))
    .orderBy(tables.thinkgraphWorkItems.path, tables.thinkgraphWorkItems.order)

  return workItems as TreeItem[]
}

export async function updatePositionThinkgraphWorkItem(
  teamId: string,
  id: string,
  newParentId: string | null,
  newOrder: number
) {
  const db = useDB()

  // Get the current item to find its path
  const [current] = await (db as any)
    .select()
    .from(tables.thinkgraphWorkItems)
    .where(
      and(
        eq(tables.thinkgraphWorkItems.id, id),
        eq(tables.thinkgraphWorkItems.teamId, teamId)
      )
    ) as TreeItem[]

  if (!current) {
    throw createError({
      status: 404,
      statusText: 'ThinkgraphWorkItem not found'
    })
  }

  // Calculate new path and depth
  let newPath: string
  let newDepth: number

  if (newParentId) {
    const [parent] = await (db as any)
      .select()
      .from(tables.thinkgraphWorkItems)
      .where(
        and(
          eq(tables.thinkgraphWorkItems.id, newParentId),
          eq(tables.thinkgraphWorkItems.teamId, teamId)
        )
      ) as TreeItem[]

    if (!parent) {
      throw createError({
        status: 400,
        statusText: 'Parent ThinkgraphWorkItem not found'
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
    .update(tables.thinkgraphWorkItems)
    .set({
      parentId: newParentId,
      path: newPath,
      depth: newDepth,
      order: newOrder
    })
    .where(
      and(
        eq(tables.thinkgraphWorkItems.id, id),
        eq(tables.thinkgraphWorkItems.teamId, teamId)
      )
    )
    .returning()

  // Update all descendants' paths if the path changed
  if (oldPath !== newPath) {
    // Get all descendants
    const descendants = await (db as any)
      .select()
      .from(tables.thinkgraphWorkItems)
      .where(
        and(
          eq(tables.thinkgraphWorkItems.teamId, teamId),
          sql`${tables.thinkgraphWorkItems.path} LIKE ${oldPath + '%'} AND ${tables.thinkgraphWorkItems.id} != ${id}`
        )
      ) as TreeItem[]

    // Update each descendant's path and depth
    for (const descendant of descendants) {
      const descendantNewPath = descendant.path.replace(oldPath, newPath)
      const depthDiff = newDepth - current.depth

      await (db as any)
        .update(tables.thinkgraphWorkItems)
        .set({
          path: descendantNewPath,
          depth: descendant.depth + depthDiff
        })
        .where(eq(tables.thinkgraphWorkItems.id, descendant.id))
    }
  }

  return updated
}

export async function reorderSiblingsThinkgraphWorkItems(
  teamId: string,
  updates: { id: string; order: number }[]
) {
  const db = useDB()

  const results = []

  for (const update of updates) {
    const [updated] = await (db as any)
      .update(tables.thinkgraphWorkItems)
      .set({ order: update.order })
      .where(
        and(
          eq(tables.thinkgraphWorkItems.id, update.id),
          eq(tables.thinkgraphWorkItems.teamId, teamId)
        )
      )
      .returning()

    if (updated) {
      results.push(updated)
    }
  }

  return results
}