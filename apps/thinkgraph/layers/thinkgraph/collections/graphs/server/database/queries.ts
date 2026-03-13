// Generated with JSON field post-processing support (v2025-01-11)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { ThinkgraphGraph, NewThinkgraphGraph } from '../../types'
import { user } from '~~/server/db/schema'

export async function getAllThinkgraphGraphs(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')

  const graphs = await (db as any)
    .select({
      ...tables.thinkgraphGraphs,
      ownerUser: {
        id: ownerUser.id,
        name: ownerUser.name,
        email: ownerUser.email,
        image: ownerUser.image
      }
    } as any)
    .from(tables.thinkgraphGraphs)
    .leftJoin(ownerUser, eq(tables.thinkgraphGraphs.owner, ownerUser.id))
    .where(eq(tables.thinkgraphGraphs.teamId, teamId))
    .orderBy(desc(tables.thinkgraphGraphs.order))

  return graphs
}

export async function getThinkgraphGraphsByIds(teamId: string, graphIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')

  const graphs = await (db as any)
    .select({
      ...tables.thinkgraphGraphs,
      ownerUser: {
        id: ownerUser.id,
        name: ownerUser.name,
        email: ownerUser.email,
        image: ownerUser.image
      }
    } as any)
    .from(tables.thinkgraphGraphs)
    .leftJoin(ownerUser, eq(tables.thinkgraphGraphs.owner, ownerUser.id))
    .where(
      and(
        eq(tables.thinkgraphGraphs.teamId, teamId),
        inArray(tables.thinkgraphGraphs.id, graphIds)
      )
    )
    .orderBy(desc(tables.thinkgraphGraphs.order))

  return graphs
}

export async function createThinkgraphGraph(data: NewThinkgraphGraph) {
  const db = useDB()

  const [graph] = await (db as any)
    .insert(tables.thinkgraphGraphs)
    .values(data)
    .returning()

  return graph
}

export async function updateThinkgraphGraph(
  recordId: string,
  teamId: string,
  userId: string,
  updates: Partial<ThinkgraphGraph>,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.thinkgraphGraphs.id, recordId),
    eq(tables.thinkgraphGraphs.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.thinkgraphGraphs.owner, userId))
  }

  const [graph] = await (db as any)
    .update(tables.thinkgraphGraphs)
    .set(updates)
    .where(and(...conditions))
    .returning()

  if (!graph) {
    throw createError({
      status: 404,
      statusText: 'ThinkgraphGraph not found or unauthorized'
    })
  }

  return graph
}

export async function deleteThinkgraphGraph(
  recordId: string,
  teamId: string,
  userId: string,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.thinkgraphGraphs.id, recordId),
    eq(tables.thinkgraphGraphs.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.thinkgraphGraphs.owner, userId))
  }

  const [deleted] = await (db as any)
    .delete(tables.thinkgraphGraphs)
    .where(and(...conditions))
    .returning()

  if (!deleted) {
    throw createError({
      status: 404,
      statusText: 'ThinkgraphGraph not found or unauthorized'
    })
  }

  return { success: true }
}