// Team-based endpoint - requires @friendlyinternet/nuxt-crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { deletePagesPage } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@friendlyinternet/nuxt-crouton-auth/server/utils/team'

export default defineEventHandler(async (event) => {
  const { pageId } = getRouterParams(event)
  if (!pageId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing page ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  return await deletePagesPage(pageId, team.id, user.id)
})