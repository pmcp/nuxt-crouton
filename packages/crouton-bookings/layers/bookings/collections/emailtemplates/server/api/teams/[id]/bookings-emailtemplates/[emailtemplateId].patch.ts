// Team-based endpoint - requires @friendlyinternet/nuxt-crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updateBookingsEmailtemplate, getBookingsEmailtemplatesByIds } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@friendlyinternet/nuxt-crouton-auth/server/utils/team'
import type { BookingsEmailtemplate } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const { emailtemplateId } = getRouterParams(event)
  if (!emailtemplateId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing emailtemplate ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const body = await readBody<Partial<BookingsEmailtemplate>>(event)

  // Handle translation updates properly
  if (body.translations && body.locale) {
    const [existing] = await getBookingsEmailtemplatesByIds(team.id, [emailtemplateId]) as any[]
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

  return await updateBookingsEmailtemplate(emailtemplateId, team.id, user.id, {
    name: body.name,
    subject: body.subject,
    body: body.body,
    fromEmail: body.fromEmail,
    triggerType: body.triggerType,
    recipientType: body.recipientType,
    isActive: body.isActive,
    daysOffset: body.daysOffset,
    locationId: body.locationId,
    translations: body.translations
  })
})