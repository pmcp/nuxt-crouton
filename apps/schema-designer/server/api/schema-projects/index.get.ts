import { eq, desc } from 'drizzle-orm'
import { schemaProjects } from '../../db/schema'
import { migrateProject, type SchemaProjectRecord } from '../../utils/project-migration'

/**
 * List all schema projects
 * Migrates legacy projects to the new package-aware format on read
 */
export default defineEventHandler(async (event) => {
  // db is auto-imported from hub:db (NuxtHub 0.10+)

  // Get optional team filter from query
  const query = getQuery(event)
  const teamId = query.teamId as string | undefined

  // Build and execute query
  const rawProjects = teamId
    ? await db
        .select()
        .from(schemaProjects)
        .where(eq(schemaProjects.teamId, teamId))
        .orderBy(desc(schemaProjects.updatedAt))
    : await db
        .select()
        .from(schemaProjects)
        .orderBy(desc(schemaProjects.updatedAt))

  // Migrate all projects to normalized format
  const projects = rawProjects.map(project =>
    migrateProject(project as unknown as SchemaProjectRecord)
  )

  return {
    projects,
    total: projects.length
  }
})
