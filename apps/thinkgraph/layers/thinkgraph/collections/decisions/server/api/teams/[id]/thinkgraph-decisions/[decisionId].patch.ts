// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { eq, and } from 'drizzle-orm'
import { updateThinkgraphDecision } from '../../../../database/queries'
import * as tables from '../../../../database/schema'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import type { ThinkgraphDecision } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const timing = useServerTiming(event)

  const { decisionId } = getRouterParams(event)
  if (!decisionId) {
    throw createError({ status: 400, statusText: 'Missing decision ID' })
  }

  const authTimer = timing.start('auth')
  const { team, user, membership } = await resolveTeamAndCheckMembership(event)
  authTimer.end()

  const body = await readBody<Partial<ThinkgraphDecision> & { _expectedStatus?: string }>(event)

  // Optimistic concurrency: if _expectedStatus is set, verify current status matches
  if (body._expectedStatus) {
    const db = useDB()
    const [current] = await (db as any)
      .select({ status: tables.thinkgraphDecisions.status })
      .from(tables.thinkgraphDecisions)
      .where(and(
        eq(tables.thinkgraphDecisions.id, decisionId),
        eq(tables.thinkgraphDecisions.teamId, team.id),
      ))
    if (!current || current.status !== body._expectedStatus) {
      throw createError({ status: 409, statusText: 'Status conflict — node already claimed' })
    }
  }

  const dbTimer = timing.start('db')
  const result = await updateThinkgraphDecision(decisionId, team.id, user.id, {
    content: body.content,
    nodeType: body.nodeType,
    pathType: body.pathType,
    starred: body.starred,
    pinned: body.pinned,
    branchName: body.branchName,
    versionTag: body.versionTag,
    parentId: body.parentId,
    source: body.source,
    model: body.model,
    status: body.status,
    brief: body.brief,
    artifacts: body.artifacts,
    origin: body.origin,
    contextScope: body.contextScope,
  }, { role: membership.role })
  dbTimer.end()
  return result
})