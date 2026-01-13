import { eq } from 'drizzle-orm'
import { schemaProjects } from '../../db/schema'
import {
  migrateProject,
  getMigrationUpdates,
  isLegacyProject,
  type SchemaProjectRecord
} from '../../utils/project-migration'

/**
 * Get a schema project by ID
 * Auto-migrates legacy projects to the package-aware format and persists the migration
 */
export default defineEventHandler(async (event) => {
  // db is auto-imported from hub:db (NuxtHub 0.10+)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing project ID'
    })
  }

  const [project] = await db
    .select()
    .from(schemaProjects)
    .where(eq(schemaProjects.id, id))

  if (!project) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Project not found'
    })
  }

  const typedProject = project as unknown as SchemaProjectRecord

  // Check if this is a legacy project that needs migration
  const migrationUpdates = getMigrationUpdates(typedProject)

  if (migrationUpdates) {
    // Persist the migration to database (fire and forget - don't block response)
    db.update(schemaProjects)
      .set(migrationUpdates)
      .where(eq(schemaProjects.id, id))
      .execute()
      .catch(err => {
        console.warn(`Failed to persist migration for project ${id}:`, err)
      })
  }

  // Return migrated/normalized project
  const normalizedProject = migrateProject(typedProject)

  return { project: normalizedProject }
})
