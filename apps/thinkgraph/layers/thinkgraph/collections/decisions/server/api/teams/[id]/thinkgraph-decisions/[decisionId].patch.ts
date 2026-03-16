// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updateThinkgraphDecision } from '../../../../database/queries'
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

  const body = await readBody<Partial<ThinkgraphDecision>>(event)

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
    model: body.model
  }, { role: membership.role })
  dbTimer.end()
  return result
})