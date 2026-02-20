import { eq, asc } from 'drizzle-orm'
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
import { flowConfigs } from '../../../../../database/schema'

export default defineEventHandler(async (event) => {
  const { team } = await resolveTeamAndCheckMembership(event)
  const db = useDB()

  const flows = await db
    .select()
    .from(flowConfigs)
    .where(eq(flowConfigs.teamId, team.id))
    .orderBy(asc(flowConfigs.createdAt))

  return flows
})
