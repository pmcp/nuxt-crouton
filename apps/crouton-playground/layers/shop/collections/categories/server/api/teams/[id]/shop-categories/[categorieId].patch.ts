// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updateShopCategorie } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import type { ShopCategorie } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const { categorieId } = getRouterParams(event)
  if (!categorieId) {
    throw createError({ status: 400, statusText: 'Missing categorie ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const body = await readBody<Partial<ShopCategorie>>(event)

  return await updateShopCategorie(categorieId, team.id, user.id, {
    name: body.name,
    slug: body.slug,
    description: body.description,
    icon: body.icon
  })
})