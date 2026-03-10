// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updateContentTag } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import type { ContentTag } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const timing = useServerTiming(event)

  const { tagId } = getRouterParams(event)
  if (!tagId) {
    throw createError({ status: 400, statusText: 'Missing tag ID' })
  }

  const authTimer = timing.start('auth')
  const { team, user, membership } = await resolveTeamAndCheckMembership(event)
  authTimer.end()

  const body = await readBody<Partial<ContentTag>>(event)

  const dbTimer = timing.start('db')
  const result = await updateContentTag(tagId, team.id, user.id, {
    name: body.name,
    color: body.color
  }, { role: membership.role })
  dbTimer.end()
  return result
})