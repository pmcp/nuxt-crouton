// Team-based endpoint - requires @friendlyinternet/nuxt-crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updatePlaygroundOption } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@friendlyinternet/nuxt-crouton-auth/server/utils/team'
import type { PlaygroundOption } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const { optionId } = getRouterParams(event)
  if (!optionId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing option ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const body = await readBody<Partial<PlaygroundOption>>(event)

  return await updatePlaygroundOption(optionId, team.id, user.id, {
    id: body.id,
    title: body.title,
    description: body.description,
    icon: body.icon,
    category: body.category
  })
})