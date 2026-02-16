// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updateDesignerCollection } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import type { DesignerCollection } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const { collectionId } = getRouterParams(event)
  if (!collectionId) {
    throw createError({ status: 400, statusText: 'Missing collection ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const body = await readBody<Partial<DesignerCollection>>(event)

  return await updateDesignerCollection(collectionId, team.id, user.id, {
    id: body.id,
    projectId: body.projectId,
    name: body.name,
    description: body.description,
    display: body.display,
    sortOrder: body.sortOrder
  })
})