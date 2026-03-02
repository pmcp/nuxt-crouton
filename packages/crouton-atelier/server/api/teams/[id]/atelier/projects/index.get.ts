import { eq } from 'drizzle-orm'
import { atelierProjects } from '../../../../../database/schema'

export default defineEventHandler(async (event) => {
  const { team } = await resolveTeamAndCheckMembership(event)
  const db = useDB()

  const projects = await db
    .select()
    .from(atelierProjects)
    .where(eq(atelierProjects.teamId, team.id))

  return projects
})
