// Team-based endpoint - requires @friendlyinternet/nuxt-crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updatePlaygroundDecision } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@friendlyinternet/nuxt-crouton-auth/server/utils/team-auth'
import type { PlaygroundDecision } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const { decisionId } = getRouterParams(event)
  if (!decisionId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing decision ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const body = await readBody<Partial<PlaygroundDecision>>(event)

  return await updatePlaygroundDecision(decisionId, team.id, user.id, {
    id: body.id,
    title: body.title,
    description: body.description,
    type: body.type,
    status: body.status,
    position: body.position
  })
})