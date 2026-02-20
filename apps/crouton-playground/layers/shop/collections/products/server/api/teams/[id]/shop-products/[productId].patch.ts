// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updateShopProduct } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import type { ShopProduct } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const { productId } = getRouterParams(event)
  if (!productId) {
    throw createError({ status: 400, statusText: 'Missing product ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const body = await readBody<Partial<ShopProduct>>(event)

  return await updateShopProduct(productId, team.id, user.id, {
    name: body.name,
    description: body.description,
    shortDescription: body.shortDescription,
    price: body.price,
    stock: body.stock,
    featured: body.featured,
    inStock: body.inStock,
    thumbnail: body.thumbnail,
    tags: body.tags
  })
})