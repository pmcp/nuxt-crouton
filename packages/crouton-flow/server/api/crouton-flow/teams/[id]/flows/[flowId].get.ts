import { eq, and } from 'drizzle-orm'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { flowConfigs } from '../../../../../database/schema'

export default defineEventHandler(async (event) => {
  const { team } = await resolveTeamAndCheckMembership(event)
  const db = useDB()
  const flowId = getRouterParam(event, 'flowId')!

  const [flow] = await db
    .select()
    .from(flowConfigs)
    .where(and(eq(flowConfigs.id, flowId), eq(flowConfigs.teamId, team.id)))
    .limit(1)

  if (!flow) {
    throw createError({ status: 404, statusText: 'Flow not found' })
  }

  return flow
})
