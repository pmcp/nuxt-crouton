// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { deleteContentArticle } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'

export default defineEventHandler(async (event) => {
  const { articleId } = getRouterParams(event)
  if (!articleId) {
    throw createError({ status: 400, statusText: 'Missing article ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  return await deleteContentArticle(articleId, team.id, user.id)
})