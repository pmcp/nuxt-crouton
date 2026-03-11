import { createCroutonRedirect } from '../../../../database/queries/redirects'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { invalidateRedirectCache } from '../../../../utils/redirectCache'

export default defineEventHandler(async (event) => {
  const timing = useServerTiming(event)

  const authTimer = timing.start('auth')
  const { team, user } = await resolveTeamAndCheckMembership(event)
  authTimer.end()

  const body = await readBody(event)
  const { id, ...dataWithoutId } = body

  const dbTimer = timing.start('db')
  const result = await createCroutonRedirect({
    ...dataWithoutId,
    teamId: team.id,
    owner: user.id,
    createdBy: user.id,
    updatedBy: user.id
  })
  dbTimer.end()

  invalidateRedirectCache()

  return result
})
