import { eq, and } from 'drizzle-orm'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { flowConfigs } from '../../../../../../database/schema'

export default defineEventHandler(async (event) => {
  const { team } = await resolveTeamAndCheckMembership(event)
  const db = useDB()
  const flowId = getRouterParam(event, 'flowId')!

  const [existing] = await db
    .select()
    .from(flowConfigs)
    .where(and(eq(flowConfigs.id, flowId), eq(flowConfigs.teamId, team.id)))
    .limit(1)

  if (!existing) {
    throw createError({ status: 404, statusText: 'Flow not found' })
  }

  const body = await readBody<{ positions: Record<string, { x: number; y: number }> }>(event)

  if (!body.positions || typeof body.positions !== 'object') {
    throw createError({ status: 400, statusText: 'positions object required' })
  }

  // Merge with existing positions (so we don't lose positions for nodes not in this update)
  const merged = {
    ...(existing.nodePositions as Record<string, { x: number; y: number }> || {}),
    ...body.positions,
  }

  await db
    .update(flowConfigs)
    .set({ nodePositions: merged })
    .where(eq(flowConfigs.id, flowId))

  return { ok: true }
})
