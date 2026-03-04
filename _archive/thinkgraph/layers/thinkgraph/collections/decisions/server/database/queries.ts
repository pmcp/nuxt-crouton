import { eq, and, desc } from 'drizzle-orm'
import * as tables from './schema'
import type { ThinkgraphDecision, NewThinkgraphDecision } from '../../types'

export async function getAllThinkgraphDecisions(teamId: string) {
  const db = useDB()

  return await (db as any)
    .select()
    .from(tables.thinkgraphDecisions)
    .where(eq(tables.thinkgraphDecisions.teamId, teamId))
    .orderBy(desc(tables.thinkgraphDecisions.createdAt))
}

export async function getThinkgraphDecisionById(id: string, teamId: string) {
  const db = useDB()

  const [decision] = await (db as any)
    .select()
    .from(tables.thinkgraphDecisions)
    .where(
      and(
        eq(tables.thinkgraphDecisions.id, id),
        eq(tables.thinkgraphDecisions.teamId, teamId)
      )
    )
    .limit(1)

  return decision ?? null
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
  updates: Partial<ThinkgraphDecision>
) {
  const db = useDB()

  const [decision] = await (db as any)
    .update(tables.thinkgraphDecisions)
    .set(updates)
    .where(
      and(
        eq(tables.thinkgraphDecisions.id, recordId),
        eq(tables.thinkgraphDecisions.teamId, teamId)
      )
    )
    .returning()

  if (!decision) {
    throw createError({
      status: 404,
      statusText: 'Decision not found or unauthorized'
    })
  }

  return decision
}

export async function deleteThinkgraphDecision(
  recordId: string,
  teamId: string,
  ownerId: string
) {
  const db = useDB()

  const [deleted] = await (db as any)
    .delete(tables.thinkgraphDecisions)
    .where(
      and(
        eq(tables.thinkgraphDecisions.id, recordId),
        eq(tables.thinkgraphDecisions.teamId, teamId),
        eq(tables.thinkgraphDecisions.owner, ownerId)
      )
    )
    .returning()

  if (!deleted) {
    throw createError({
      status: 404,
      statusText: 'Decision not found or unauthorized'
    })
  }

  return { success: true }
}

export async function getAncestorChain(nodeId: string, teamId: string): Promise<ThinkgraphDecision[]> {
  const chain: ThinkgraphDecision[] = []
  let currentId: string | null = nodeId

  while (currentId) {
    const node = await getThinkgraphDecisionById(currentId, teamId)
    if (!node) break
    chain.unshift(node)
    currentId = node.parentId ?? null
  }

  return chain
}
