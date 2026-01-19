// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updatePlaygroundCategorie, getPlaygroundCategoriesByIds } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import type { PlaygroundCategorie } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const { categorieId } = getRouterParams(event)
  if (!categorieId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing categorie ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const body = await readBody<Partial<PlaygroundCategorie>>(event)

  // Handle translation updates properly
  if (body.translations && body.locale) {
    const [existing] = await getPlaygroundCategoriesByIds(team.id, [categorieId]) as any[]
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

  return await updatePlaygroundCategorie(categorieId, team.id, user.id, {
    id: body.id,
    name: body.name,
    description: body.description,
    icon: body.icon,
    color: body.color,
    translations: body.translations
  })
})