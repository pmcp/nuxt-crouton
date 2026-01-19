// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updateSalesEventSetting } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import type { SalesEventSetting } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const { eventsettingId } = getRouterParams(event)
  if (!eventsettingId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing eventsetting ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const body = await readBody<Partial<SalesEventSetting>>(event)

  return await updateSalesEventSetting(eventsettingId, team.id, user.id, {
    id: body.id,
    eventId: body.eventId,
    settingKey: body.settingKey,
    settingValue: body.settingValue,
    description: body.description
  })
})