import { getThinkgraphDecisionById } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'

export default defineEventHandler(async (event) => {
  const { decisionId } = getRouterParams(event)
  if (!decisionId) {
    throw createError({ status: 400, statusText: 'Missing decision ID' })
  }

  const { team } = await resolveTeamAndCheckMembership(event)

  const decision = await getThinkgraphDecisionById(decisionId, team.id)

  if (!decision) {
    throw createError({ status: 404, statusText: 'Decision not found' })
  }

  return decision
})
