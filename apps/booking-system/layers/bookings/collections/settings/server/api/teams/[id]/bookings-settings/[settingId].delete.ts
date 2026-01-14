// Team-based endpoint - requires @friendlyinternet/nuxt-crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { deleteBookingsSetting } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@friendlyinternet/nuxt-crouton-auth/server/utils/team'

export default defineEventHandler(async (event) => {
  const { settingId } = getRouterParams(event)
  if (!settingId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing setting ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  return await deleteBookingsSetting(settingId, team.id, user.id)
})