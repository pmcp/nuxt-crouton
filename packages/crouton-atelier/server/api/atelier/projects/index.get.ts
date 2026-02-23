import { eq } from 'drizzle-orm'
import { atelierProjects } from '../../../database/schema'

export default defineEventHandler(async (event) => {
  const { teamId } = await resolveTeamAndCheckMembership(event)
  const db = useDrizzle()

  const projects = await db
    .select()
    .from(atelierProjects)
    .where(eq(atelierProjects.teamId, teamId))

  return projects
})
