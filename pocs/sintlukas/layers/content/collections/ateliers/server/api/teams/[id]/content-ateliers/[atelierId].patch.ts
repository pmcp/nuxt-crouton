// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updateContentAtelier, getContentAteliersByIds } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import type { ContentAtelier } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const timing = useServerTiming(event)

  const { atelierId } = getRouterParams(event)
  if (!atelierId) {
    throw createError({ status: 400, statusText: 'Missing atelier ID' })
  }

  const authTimer = timing.start('auth')
  const { team, user, membership } = await resolveTeamAndCheckMembership(event)
  authTimer.end()

  const body = await readBody<Partial<ContentAtelier>>(event)

  // Handle translation updates properly
  if (body.translations && body.locale) {
    const [existing] = await getContentAteliersByIds(team.id, [atelierId]) as any[]
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
  const result = await updateContentAtelier(atelierId, team.id, user.id, {
    title: body.title,
    category: body.category,
    age: body.age,
    mainImage: body.mainImage,
    cardImage: body.cardImage,
    content: body.content,
    sidebarContent: body.sidebarContent,
    persons: body.persons,
    images: body.images,
    order: body.order,
    status: body.status,
    translations: body.translations
  }, { role: membership.role })
  dbTimer.end()
  return result
})