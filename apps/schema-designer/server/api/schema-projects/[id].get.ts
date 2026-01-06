import { eq } from 'drizzle-orm'
import { schemaProjects } from '../../db/schema'

/**
 * Get a schema project by ID
 * Provides backwards compatibility by wrapping legacy single-collection
 * projects into the collections array format
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

  // Backwards compatibility: if no collections but has legacy schema,
  // wrap the single schema as collections[0]
  const projectWithCollections = {
    ...project,
    collections: project.collections || (project.schema ? [{
      id: `collection-legacy-${project.id}`,
      collectionName: project.collectionName,
      fields: (project.schema as any)?.fields || [],
      options: project.options,
      cardTemplate: (project.schema as any)?.cardTemplate
    }] : null)
  }

  return { project: projectWithCollections }
})
