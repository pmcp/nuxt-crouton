// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updateContentNew, getContentNewsByIds } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import type { ContentNew } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const timing = useServerTiming(event)

  const { newId } = getRouterParams(event)
  if (!newId) {
    throw createError({ status: 400, statusText: 'Missing new ID' })
  }

  const authTimer = timing.start('auth')
  const { team, user, membership } = await resolveTeamAndCheckMembership(event)
  authTimer.end()

  const body = await readBody<Partial<ContentNew>>(event)

  // Handle translation updates properly
  if (body.translations && body.locale) {
    const [existing] = await getContentNewsByIds(team.id, [newId]) as any[]
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
  const result = await updateContentNew(newId, team.id, user.id, {
    title: body.title,
    date: body.date ? new Date(body.date) : body.date,
    image: body.image,
    text: body.text,
    link: body.link,
    status: body.status,
    translations: body.translations
  }, { role: membership.role })
  dbTimer.end()
  return result
})