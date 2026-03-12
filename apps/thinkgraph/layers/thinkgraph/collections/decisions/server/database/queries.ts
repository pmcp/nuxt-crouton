// Generated with JSON field post-processing support (v2025-01-11)
import { eq, and, desc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'
import * as tables from './schema'
import type { ThinkgraphDecision, NewThinkgraphDecision } from '../../types'
import { user } from '~~/server/db/schema'

export async function getAllThinkgraphDecisions(teamId: string, graphId?: string) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')

  const conditions = [eq(tables.thinkgraphDecisions.teamId, teamId)]
  if (graphId) {
    conditions.push(eq(tables.thinkgraphDecisions.graphId, graphId))
  }

  const decisions = await (db as any)
    .select({
      ...tables.thinkgraphDecisions,
      ownerUser: {
        id: ownerUser.id,
        name: ownerUser.name,
        email: ownerUser.email,
        image: ownerUser.image
      }
    } as any)
    .from(tables.thinkgraphDecisions)
    .leftJoin(ownerUser, eq(tables.thinkgraphDecisions.owner, ownerUser.id))
    .where(and(...conditions))
    .orderBy(desc(tables.thinkgraphDecisions.createdAt))

  // Post-query processing for JSON fields (repeater/json types)
  decisions.forEach((item: any) => {
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

  return decisions
}

export async function getThinkgraphDecisionsByIds(teamId: string, decisionIds: string[]) {
  const db = useDB()

  const ownerUser = alias(user as any, 'ownerUser')

  const decisions = await (db as any)
    .select({
      ...tables.thinkgraphDecisions,
      ownerUser: {
        id: ownerUser.id,
        name: ownerUser.name,
        email: ownerUser.email,
        image: ownerUser.image
      }
    } as any)
    .from(tables.thinkgraphDecisions)
    .leftJoin(ownerUser, eq(tables.thinkgraphDecisions.owner, ownerUser.id))
    .where(
      and(
        eq(tables.thinkgraphDecisions.teamId, teamId),
        inArray(tables.thinkgraphDecisions.id, decisionIds)
      )
    )
    .orderBy(desc(tables.thinkgraphDecisions.createdAt))

  // Post-query processing for JSON fields (repeater/json types)
  decisions.forEach((item: any) => {
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

  return decisions
}

export async function createThinkgraphDecision(data: NewThinkgraphDecision) {
  const db = useDB()

  const [decision] = await (db as any)
    .insert(tables.thinkgraphDecisions)
    .values(data)
    .returning()

  return decision
}

export async function updateThinkgraphDecision(
  recordId: string,
  teamId: string,
  userId: string,
  updates: Partial<ThinkgraphDecision>,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.thinkgraphDecisions.id, recordId),
    eq(tables.thinkgraphDecisions.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.thinkgraphDecisions.owner, userId))
  }

  const [decision] = await (db as any)
    .update(tables.thinkgraphDecisions)
    .set({
      ...updates,
      updatedBy: userId
    })
    .where(and(...conditions))
    .returning()

  if (!decision) {
    throw createError({
      status: 404,
      statusText: 'ThinkgraphDecision not found or unauthorized'
    })
  }

  return decision
}

export async function deleteThinkgraphDecision(
  recordId: string,
  teamId: string,
  userId: string,
  options?: { role?: string }
) {
  const db = useDB()
  const isAdmin = options?.role === 'admin' || options?.role === 'owner'

  const conditions = [
    eq(tables.thinkgraphDecisions.id, recordId),
    eq(tables.thinkgraphDecisions.teamId, teamId),
  ]
  if (!isAdmin) {
    conditions.push(eq(tables.thinkgraphDecisions.owner, userId))
  }

  const [deleted] = await (db as any)
    .delete(tables.thinkgraphDecisions)
    .where(and(...conditions))
    .returning()

  if (!deleted) {
    throw createError({
      status: 404,
      statusText: 'ThinkgraphDecision not found or unauthorized'
    })
  }

  return { success: true }
}