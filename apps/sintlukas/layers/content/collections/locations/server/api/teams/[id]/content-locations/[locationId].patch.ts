// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updateContentLocation, getContentLocationsByIds } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import type { ContentLocation } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const timing = useServerTiming(event)

  const { locationId } = getRouterParams(event)
  if (!locationId) {
    throw createError({ status: 400, statusText: 'Missing location ID' })
  }

  const authTimer = timing.start('auth')
  const { team, user, membership } = await resolveTeamAndCheckMembership(event)
  authTimer.end()

  const body = await readBody<Partial<ContentLocation>>(event)

  // Handle translation updates properly
  if (body.translations && body.locale) {
    const [existing] = await getContentLocationsByIds(team.id, [locationId]) as any[]
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

  const dbTimer = timing.start('db')
  const result = await updateContentLocation(locationId, team.id, user.id, {
    title: body.title,
    street: body.street,
    zip: body.zip,
    city: body.city,
    location: body.location,
    info: body.info,
    isMain: body.isMain,
    order: body.order,
    translations: body.translations
  }, { role: membership.role })
  dbTimer.end()
  return result
})