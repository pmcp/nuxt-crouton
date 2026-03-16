// Generated with JSON field post-processing support (v2025-01-11)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { ThinkgraphInjectRequest, NewThinkgraphInjectRequest } from '../../types'
import * as nodesSchema from '../../../nodes/server/database/schema'
import { user } from '~~/server/db/schema'

export async function getAllThinkgraphInjectRequests(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')

  const injectRequests = await (db as any)
    .select({
      ...tables.thinkgraphInjectRequests,
      nodeIdData: nodesSchema.thinkgraphNodes,
      ownerUser: {
        id: ownerUser.id,
        name: ownerUser.name,
        email: ownerUser.email,
        image: ownerUser.image
      }
    } as any)
    .from(tables.thinkgraphInjectRequests)
    .leftJoin(nodesSchema.thinkgraphNodes, eq(tables.thinkgraphInjectRequests.nodeId, nodesSchema.thinkgraphNodes.id))
    .leftJoin(ownerUser, eq(tables.thinkgraphInjectRequests.owner, ownerUser.id))
    .where(eq(tables.thinkgraphInjectRequests.teamId, teamId))
    .orderBy(desc(tables.thinkgraphInjectRequests.createdAt))

  return injectRequests
}

export async function getThinkgraphInjectRequestsByIds(teamId: string, injectRequestIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')

  const injectRequests = await (db as any)
    .select({
      ...tables.thinkgraphInjectRequests,
      nodeIdData: nodesSchema.thinkgraphNodes,
      ownerUser: {
        id: ownerUser.id,
        name: ownerUser.name,
        email: ownerUser.email,
        image: ownerUser.image
      }
    } as any)
    .from(tables.thinkgraphInjectRequests)
    .leftJoin(nodesSchema.thinkgraphNodes, eq(tables.thinkgraphInjectRequests.nodeId, nodesSchema.thinkgraphNodes.id))
    .leftJoin(ownerUser, eq(tables.thinkgraphInjectRequests.owner, ownerUser.id))
    .where(
      and(
        eq(tables.thinkgraphInjectRequests.teamId, teamId),
        inArray(tables.thinkgraphInjectRequests.id, injectRequestIds)
      )
    )
    .orderBy(desc(tables.thinkgraphInjectRequests.createdAt))

  return injectRequests
}

export async function createThinkgraphInjectRequest(data: NewThinkgraphInjectRequest) {
  const db = useDB()

  const [injectRequest] = await (db as any)
    .insert(tables.thinkgraphInjectRequests)
    .values(data)
    .returning()

  return injectRequest
}

export async function updateThinkgraphInjectRequest(
  recordId: string,
  teamId: string,
  userId: string,
  updates: Partial<ThinkgraphInjectRequest>,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.thinkgraphInjectRequests.id, recordId),
    eq(tables.thinkgraphInjectRequests.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.thinkgraphInjectRequests.owner, userId))
  }

  const [injectRequest] = await (db as any)
    .update(tables.thinkgraphInjectRequests)
    .set({
      ...updates,
      updatedBy: userId
    })
    .where(and(...conditions))
    .returning()

  if (!injectRequest) {
    throw createError({
      status: 404,
      statusText: 'ThinkgraphInjectRequest not found or unauthorized'
    })
  }

  return injectRequest
}

export async function deleteThinkgraphInjectRequest(
  recordId: string,
  teamId: string,
  userId: string,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.thinkgraphInjectRequests.id, recordId),
    eq(tables.thinkgraphInjectRequests.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.thinkgraphInjectRequests.owner, userId))
  }

  const [deleted] = await (db as any)
    .delete(tables.thinkgraphInjectRequests)
    .where(and(...conditions))
    .returning()

  if (!deleted) {
    throw createError({
      status: 404,
      statusText: 'ThinkgraphInjectRequest not found or unauthorized'
    })
  }

  return { success: true }
}