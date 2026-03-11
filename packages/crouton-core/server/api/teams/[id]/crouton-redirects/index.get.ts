import { getAllCroutonRedirects, getCroutonRedirectsByIds } from '../../../../database/queries/redirects'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'

export default defineEventHandler(async (event) => {
  const timing = useServerTiming(event)

  const authTimer = timing.start('auth')
  const { team } = await resolveTeamAndCheckMembership(event)
  authTimer.end()

  const query = getQuery(event)

  const dbTimer = timing.start('db')
  if (query.ids) {
    const ids = String(query.ids).split(',')
    const result = await getCroutonRedirectsByIds(team.id, ids)
    dbTimer.end()
    return result
  }

  const result = await getAllCroutonRedirects(team.id)
  dbTimer.end()
  return result
})
