// Team-based endpoint - requires @friendlyinternet/nuxt-crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { deleteBlogPost } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@friendlyinternet/nuxt-crouton-auth/server/utils/team'

export default defineEventHandler(async (event) => {
  const { postId } = getRouterParams(event)
  if (!postId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing post ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  return await deleteBlogPost(postId, team.id, user.id)
})