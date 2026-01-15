// Team-based endpoint - requires @friendlyinternet/nuxt-crouton package
// The #crouton/team-auth alias is provided by @friendlyinternet/nuxt-crouton
// Install: pnpm add @friendlyinternet/nuxt-crouton
// Config: Add '@friendlyinternet/nuxt-crouton' to extends array in nuxt.config.ts
import { updateDiscubotUserMapping } from '../../../../database/queries'
import { resolveTeamAndCheckMembership } from '#crouton/team-auth'
import type { DiscubotUserMapping } from '../../../../../types'

export default defineEventHandler(async (event) => {
  const { usermappingId } = getRouterParams(event)
  const { team, user } = await resolveTeamAndCheckMembership(event)

  const body = await readBody<Partial<DiscubotUserMapping>>(event)

  return await updateDiscubotUserMapping(usermappingId, team.id, user.id, {
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