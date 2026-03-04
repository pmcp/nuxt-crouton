import { updateThinkgraphDecision } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import type { ThinkgraphDecision } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const { decisionId } = getRouterParams(event)
  if (!decisionId) {
    throw createError({ status: 400, statusText: 'Missing decision ID' })
  }

  const { team, user } = await resolveTeamAndCheckMembership(event)

  const body = await readBody<Partial<ThinkgraphDecision>>(event)

  return await updateThinkgraphDecision(decisionId, team.id, {
    content: body.content,
    type: body.type,
    pathType: body.pathType,
    starred: body.starred,
    branchName: body.branchName,
    versionTag: body.versionTag,
    source: body.source,
    model: body.model,
    parentId: body.parentId,
    updatedBy: user.id
  })
})
