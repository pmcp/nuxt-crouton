// Team-based endpoint - requires @friendlyinternet/nuxt-crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updatePagesPage } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@friendlyinternet/nuxt-crouton-auth/server/utils/team'
import type { PagesPage } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const { pageId } = getRouterParams(event)
  if (!pageId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing page ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const body = await readBody<Partial<PagesPage>>(event)

  return await updatePagesPage(pageId, team.id, user.id, {
    name: body.name,
    label: body.label,
    icon: body.icon,
    description: body.description,
    hierarchy: body.hierarchy,
    fields: body.fields
  })
})