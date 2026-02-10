// Team-based endpoint - requires @fyit/crouton-auth package
// The resolveTeamAndCheckMembership utility handles team resolution and auth
import { updateTriageUserMapping } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import type { TriageUserMapping } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const { userMappingId } = getRouterParams(event)
  if (!userMappingId) {
    throw createError({ status: 400, statusText: 'Missing usermapping ID' })
  }
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const body = await readBody<Partial<TriageUserMapping>>(event)

  return await updateTriageUserMapping(userMappingId, team.id, user.id, {
    sourceType: body.sourceType,
    sourceWorkspaceId: body.sourceWorkspaceId,
    sourceUserId: body.sourceUserId,
    sourceUserEmail: body.sourceUserEmail,
    sourceUserName: body.sourceUserName,
    notionUserId: body.notionUserId,
    notionUserName: body.notionUserName,
    notionUserEmail: body.notionUserEmail,
    mappingType: body.mappingType,
    confidence: body.confidence,
    active: body.active,
    lastSyncedAt: body.lastSyncedAt,
    metadata: body.metadata
  })
})