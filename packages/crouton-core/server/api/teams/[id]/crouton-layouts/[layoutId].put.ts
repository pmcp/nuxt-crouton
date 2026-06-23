import { eq, and } from 'drizzle-orm'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { layoutConfigs } from '../../../../database/schema/layoutConfigs'

/**
 * Upsert a saved layout tree by id, scoped to the caller's team (Sprint 0 spike, #713).
 *
 * The tree is untrusted input — it's stored verbatim here, and the renderer
 * resolves block ids through an allowlisted map (so a hostile/unknown id can
 * never instantiate an arbitrary component). Per-block config validation against
 * the registry's config schema lands in Sprint 1 (#704).
 */
export default defineEventHandler(async (event) => {
  const { team } = await resolveTeamAndCheckMembership(event)
  const db = useDB()
  const layoutId = getRouterParam(event, 'layoutId')!

  const body = await readBody<{ tree?: unknown }>(event)
  if (!body?.tree || typeof body.tree !== 'object') {
    throw createError({ status: 400, statusText: 'tree object required' })
  }

  const [existing] = await db
    .select()
    .from(layoutConfigs)
    .where(and(eq(layoutConfigs.id, layoutId), eq(layoutConfigs.teamId, team.id)))
    .limit(1)

  if (existing) {
    await db
      .update(layoutConfigs)
      .set({ tree: body.tree as Record<string, unknown> })
      .where(and(eq(layoutConfigs.id, layoutId), eq(layoutConfigs.teamId, team.id)))
  }
  else {
    await db.insert(layoutConfigs).values({
      id: layoutId,
      teamId: team.id,
      name: 'spike',
      renderer: 'panes',
      tree: body.tree as Record<string, unknown>,
    })
  }

  return { ok: true }
})
