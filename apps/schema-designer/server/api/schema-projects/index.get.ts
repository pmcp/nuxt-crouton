import { eq, desc } from 'drizzle-orm'
import { schemaProjects } from '../../db/schema'

/**
 * List all schema projects
 * Provides backwards compatibility by including collections data
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

  // Add collections for backwards compatibility
  const projects = rawProjects.map(project => ({
    ...project,
    collections: project.collections || (project.schema ? [{
      id: `collection-legacy-${project.id}`,
      collectionName: project.collectionName,
      fields: (project.schema as any)?.fields || [],
      options: project.options,
      cardTemplate: (project.schema as any)?.cardTemplate
    }] : null)
  }))

  return {
    projects,
    total: projects.length
  }
})
