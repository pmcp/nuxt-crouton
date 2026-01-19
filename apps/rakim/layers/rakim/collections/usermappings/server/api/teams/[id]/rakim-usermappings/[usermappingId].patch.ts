// Team-based endpoint - requires @fyit/crouton package
// The #crouton/team-auth alias is provided by @fyit/crouton
// Install: pnpm add @fyit/crouton
// Config: Add '@fyit/crouton' to extends array in nuxt.config.ts
import { updateRakimUserMapping } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '#crouton/team-auth'
import type { RakimUserMapping } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const { usermappingId } = getRouterParams(event)
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const body = await readBody<Partial<RakimUserMapping>>(event)

  return await updateRakimUserMapping(usermappingId, team.id, user.id, {
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