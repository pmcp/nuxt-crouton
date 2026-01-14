// Team-based endpoint - requires @friendlyinternet/nuxt-crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { deleteBookingsEmailtemplate } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@friendlyinternet/nuxt-crouton-auth/server/utils/team'

export default defineEventHandler(async (event) => {
  const { emailtemplateId } = getRouterParams(event)
  if (!emailtemplateId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing emailtemplate ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  return await deleteBookingsEmailtemplate(emailtemplateId, team.id, user.id)
})