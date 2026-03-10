// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updateContentCategorie } from '../../../../database/queries'
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

  const dbTimer = timing.start('db')
  const result = await updateContentCategorie(categorieId, team.id, user.id, {
    title: body.title,
    icon: body.icon
  }, { role: membership.role })
  dbTimer.end()
  return result
})