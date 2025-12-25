// Team-based endpoint - requires @friendlyinternet/nuxt-crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updateSalesCategorie } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@friendlyinternet/nuxt-crouton-auth/server/utils/team'
import type { SalesCategorie } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const { categorieId } = getRouterParams(event)
  if (!categorieId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing categorie ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const body = await readBody<Partial<SalesCategorie>>(event)

  return await updateSalesCategorie(categorieId, team.id, user.id, {
    id: body.id,
    eventId: body.eventId,
    title: body.title,
    displayOrder: body.displayOrder
  })
})