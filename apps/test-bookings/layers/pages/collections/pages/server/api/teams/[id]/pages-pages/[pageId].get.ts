// Team-based endpoint - requires @friendlyinternet/nuxt-crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { getPagesPagesByIds } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@friendlyinternet/nuxt-crouton-auth/server/utils/team'

export default defineEventHandler(async (event) => {
  const { pageId } = getRouterParams(event)
  if (!pageId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing page ID' })
  }

  const { team } = await resolveTeamAndCheckMembership(event)

  const pages = await getPagesPagesByIds(team.id, [pageId])

  if (!pages.length) {
    throw createError({ statusCode: 404, statusMessage: 'Page not found' })
  }

  return pages[0]
})
