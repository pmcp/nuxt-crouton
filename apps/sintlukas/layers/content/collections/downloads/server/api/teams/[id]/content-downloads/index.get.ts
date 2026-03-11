// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { getAllContentDownloads, getContentDownloadsByIds } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'

export default defineEventHandler(async (event) => {
  const timing = useServerTiming(event)

  const authTimer = timing.start('auth')
  const { team } = await resolveTeamAndCheckMembership(event)
  authTimer.end()

  const query = getQuery(event)
  // Accept locale for future translation handling
  const locale = String(query.locale || 'en')

  const dbTimer = timing.start('db')
  if (query.ids) {
    const ids = String(query.ids).split(',')
    const result = await getContentDownloadsByIds(team.id, ids)
    dbTimer.end()
    return result
  }

  const result = await getAllContentDownloads(team.id)
  dbTimer.end()
  return result
})