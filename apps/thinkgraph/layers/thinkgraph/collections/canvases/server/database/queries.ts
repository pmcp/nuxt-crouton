// Generated with JSON field post-processing support (v2025-01-11)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { ThinkgraphCanvase, NewThinkgraphCanvase } from '../../types'
import { user } from '~~/server/db/schema'

export async function getAllThinkgraphCanvases(teamId: string) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')

  const canvases = await (db as any)
    .select({
      ...tables.thinkgraphCanvases,
      ownerUser: {
        id: ownerUser.id,
        name: ownerUser.name,
        email: ownerUser.email,
        image: ownerUser.image
      }
    } as any)
    .from(tables.thinkgraphCanvases)
    .leftJoin(ownerUser, eq(tables.thinkgraphCanvases.owner, ownerUser.id))
    .where(eq(tables.thinkgraphCanvases.teamId, teamId))
    .orderBy(desc(tables.thinkgraphCanvases.order))

  return canvases
}

export async function getThinkgraphCanvasesByIds(teamId: string, canvaseIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')

  const canvases = await (db as any)
    .select({
      ...tables.thinkgraphCanvases,
      ownerUser: {
        id: ownerUser.id,
        name: ownerUser.name,
        email: ownerUser.email,
        image: ownerUser.image
      }
    } as any)
    .from(tables.thinkgraphCanvases)
    .leftJoin(ownerUser, eq(tables.thinkgraphCanvases.owner, ownerUser.id))
    .where(
      and(
        eq(tables.thinkgraphCanvases.teamId, teamId),
        inArray(tables.thinkgraphCanvases.id, canvaseIds)
      )
    )
    .orderBy(desc(tables.thinkgraphCanvases.order))

  return canvases
}

export async function createThinkgraphCanvase(data: NewThinkgraphCanvase) {
  const db = useDB()

  const [canvase] = await (db as any)
    .insert(tables.thinkgraphCanvases)
    .values(data)
    .returning()

  return canvase
}

export async function updateThinkgraphCanvase(
  recordId: string,
  teamId: string,
  userId: string,
  updates: Partial<ThinkgraphCanvase>,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.thinkgraphCanvases.id, recordId),
    eq(tables.thinkgraphCanvases.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.thinkgraphCanvases.owner, userId))
  }

  const [canvase] = await (db as any)
    .update(tables.thinkgraphCanvases)
    .set({
      ...updates,
      updatedBy: userId
    })
    .where(and(...conditions))
    .returning()

  if (!canvase) {
    throw createError({
      status: 404,
      statusText: 'ThinkgraphCanvase not found or unauthorized'
    })
  }

  return canvase
}

export async function deleteThinkgraphCanvase(
  recordId: string,
  teamId: string,
  userId: string,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.thinkgraphCanvases.id, recordId),
    eq(tables.thinkgraphCanvases.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.thinkgraphCanvases.owner, userId))
  }

  const [deleted] = await (db as any)
    .delete(tables.thinkgraphCanvases)
    .where(and(...conditions))
    .returning()

  if (!deleted) {
    throw createError({
      status: 404,
      statusText: 'ThinkgraphCanvase not found or unauthorized'
    })
  }

  return { success: true }
}