// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updateDesignerField } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import type { DesignerField } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const { fieldId } = getRouterParams(event)
  if (!fieldId) {
    throw createError({ status: 400, statusText: 'Missing field ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const body = await readBody<Partial<DesignerField>>(event)

  return await updateDesignerField(fieldId, team.id, user.id, {
    id: body.id,
    collectionId: body.collectionId,
    name: body.name,
    type: body.type,
    meta: body.meta,
    refTarget: body.refTarget,
    sortOrder: body.sortOrder
  })
})