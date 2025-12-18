// Team-based endpoint - requires @friendlyinternet/nuxt-crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { deletePlaygroundTag } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@friendlyinternet/nuxt-crouton-auth/server/utils/team-auth'

export default defineEventHandler(async (event) => {
  const { tagId } = getRouterParams(event)
  const { team, user } = await resolveTeamAndCheckMembership(event)

  return await deletePlaygroundTag(tagId, team.id, user.id)
})