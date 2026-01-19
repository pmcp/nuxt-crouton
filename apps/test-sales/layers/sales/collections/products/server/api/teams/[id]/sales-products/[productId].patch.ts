// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updateSalesProduct } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import type { SalesProduct } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const { productId } = getRouterParams(event)
  if (!productId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing product ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const body = await readBody<Partial<SalesProduct>>(event)

  return await updateSalesProduct(productId, team.id, user.id, {
    id: body.id,
    eventId: body.eventId,
    categoryId: body.categoryId,
    locationId: body.locationId,
    title: body.title,
    description: body.description,
    price: body.price,
    isActive: body.isActive,
    requiresRemark: body.requiresRemark,
    remarkPrompt: body.remarkPrompt,
    hasOptions: body.hasOptions,
    multipleOptionsAllowed: body.multipleOptionsAllowed,
    options: body.options,
    sortOrder: body.sortOrder
  })
})