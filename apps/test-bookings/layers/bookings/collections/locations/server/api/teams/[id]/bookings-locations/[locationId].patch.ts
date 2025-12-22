// Team-based endpoint - requires @friendlyinternet/nuxt-crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updateBookingsLocation, getBookingsLocationsByIds } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@friendlyinternet/nuxt-crouton-auth/server/utils/team'
import type { BookingsLocation } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const { locationId } = getRouterParams(event)
  if (!locationId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing location ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const body = await readBody<Partial<BookingsLocation>>(event)

  // Handle translation updates properly
  if (body.translations && body.locale) {
    const [existing] = await getBookingsLocationsByIds(team.id, [locationId]) as any[]
    if (existing) {
      body.translations = {
        ...existing.translations,
        [body.locale]: {
          ...existing.translations?.[body.locale],
          ...body.translations[body.locale]
        }
      }
    }
  }

  return await updateBookingsLocation(locationId, team.id, user.id, {
    title: body.title,
    street: body.street,
    zip: body.zip,
    city: body.city,
    location: body.location,
    content: body.content,
    allowedMemberIds: body.allowedMemberIds,
    slots: body.slots,
    inventoryMode: body.inventoryMode,
    quantity: body.quantity,
    translations: body.translations
  })
})