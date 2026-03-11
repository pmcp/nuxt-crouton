// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updateContentPerson } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import type { ContentPerson } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const timing = useServerTiming(event)

  const { personId } = getRouterParams(event)
  if (!personId) {
    throw createError({ status: 400, statusText: 'Missing person ID' })
  }

  const authTimer = timing.start('auth')
  const { team, user, membership } = await resolveTeamAndCheckMembership(event)
  authTimer.end()

  const body = await readBody<Partial<ContentPerson>>(event)

  const dbTimer = timing.start('db')
  const result = await updateContentPerson(personId, team.id, user.id, {
    firstName: body.firstName,
    lastName: body.lastName,
    role: body.role,
    image: body.image,
    order: body.order
  }, { role: membership.role })
  dbTimer.end()
  return result
})