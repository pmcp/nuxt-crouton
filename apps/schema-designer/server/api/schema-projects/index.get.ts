import { eq, desc } from 'drizzle-orm'
import { schemaProjects } from '../../db/schema'

export default defineEventHandler(async (event) => {
  // db is auto-imported from hub:db (NuxtHub 0.10+)

  // Get optional team filter from query
  const query = getQuery(event)
  const teamId = query.teamId as string | undefined

  // Build query
  let projectsQuery = db
    .select()
    .from(schemaProjects)
    .orderBy(desc(schemaProjects.updatedAt))

  if (teamId) {
    projectsQuery = projectsQuery.where(eq(schemaProjects.teamId, teamId))
  }

  const projects = await projectsQuery

  return {
    projects,
    total: projects.length
  }
})
