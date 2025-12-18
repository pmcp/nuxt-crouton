// Team-based endpoint - requires @friendlyinternet/nuxt-crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updatePlaygroundTag } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@friendlyinternet/nuxt-crouton-auth/server/utils/team'
import type { PlaygroundTag } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const { tagId } = getRouterParams(event)
  if (!tagId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing tag ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const body = await readBody<Partial<PlaygroundTag>>(event)

  return await updatePlaygroundTag(tagId, team.id, user.id, {
    id: body.id,
    name: body.name,
    slug: body.slug,
    color: body.color,
    order: body.order
  })
})