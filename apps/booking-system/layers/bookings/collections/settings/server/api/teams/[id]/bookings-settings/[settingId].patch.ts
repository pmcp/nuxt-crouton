// Team-based endpoint - requires @friendlyinternet/nuxt-crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updateBookingsSetting } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@friendlyinternet/nuxt-crouton-auth/server/utils/team'
import type { BookingsSetting } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const { settingId } = getRouterParams(event)
  if (!settingId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing setting ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const body = await readBody<Partial<BookingsSetting>>(event)

  return await updateBookingsSetting(settingId, team.id, user.id, {
    id: body.id,
    statuses: body.statuses,
    groups: body.groups
  })
})