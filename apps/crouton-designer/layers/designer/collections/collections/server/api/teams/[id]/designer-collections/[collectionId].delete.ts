// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { deleteDesignerCollection } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'

export default defineEventHandler(async (event) => {
  const { collectionId } = getRouterParams(event)
  if (!collectionId) {
    throw createError({ status: 400, statusText: 'Missing collection ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  return await deleteDesignerCollection(collectionId, team.id, user.id)
})