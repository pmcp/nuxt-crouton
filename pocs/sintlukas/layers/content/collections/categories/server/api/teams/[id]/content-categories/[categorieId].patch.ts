// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updateContentCategorie, getContentCategoriesByIds } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import type { ContentCategorie } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const timing = useServerTiming(event)

  const { categorieId } = getRouterParams(event)
  if (!categorieId) {
    throw createError({ status: 400, statusText: 'Missing categorie ID' })
  }

  const authTimer = timing.start('auth')
  const { team, user, membership } = await resolveTeamAndCheckMembership(event)
  authTimer.end()

  const body = await readBody<Partial<ContentCategorie>>(event)

  // Handle translation updates properly
  if (body.translations && body.locale) {
    const [existing] = await getContentCategoriesByIds(team.id, [categorieId]) as any[]
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
  const result = await updateContentCategorie(categorieId, team.id, user.id, {
    title: body.title,
    order: body.order,
    color: body.color,
    thumbnail: body.thumbnail,
    background: body.background,
    isSidebar: body.isSidebar,
    translations: body.translations
  }, { role: membership.role })
  dbTimer.end()
  return result
})