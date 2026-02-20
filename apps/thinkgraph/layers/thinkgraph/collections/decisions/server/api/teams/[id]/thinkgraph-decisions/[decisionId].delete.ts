import { deleteThinkgraphDecision } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'

export default defineEventHandler(async (event) => {
  const { decisionId } = getRouterParams(event)
  if (!decisionId) {
    throw createError({ status: 400, statusText: 'Missing decision ID' })
  }

  const { team, user } = await resolveTeamAndCheckMembership(event)

  return await deleteThinkgraphDecision(decisionId, team.id, user.id)
})
