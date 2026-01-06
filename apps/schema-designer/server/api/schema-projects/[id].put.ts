import { eq } from 'drizzle-orm'
import { schemaProjects } from '../../db/schema'

interface CollectionSchema {
  id: string
  collectionName: string
  fields: any[]
  options: Record<string, unknown>
  cardTemplate?: string
}

interface UpdateProjectPayload {
  name?: string
  layerName?: string
  /** @deprecated Use collections array instead */
  collectionName?: string
  /** @deprecated Use collections array instead */
  schema?: Record<string, unknown>
  options?: Record<string, unknown>
  /** Multi-collection support */
  collections?: CollectionSchema[]
}

/**
 * Update a schema project
 * Supports both legacy single-collection and new multi-collection formats
 */
export default defineEventHandler(async (event) => {
  // db is auto-imported from hub:db (NuxtHub 0.10+)
  const id = getRouterParam(event, 'id')
  const body = await readBody<UpdateProjectPayload>(event)

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing project ID'
    })
  }

  // Build update object with only provided fields
  const updates: Record<string, unknown> = {}
  if (body.name !== undefined) updates.name = body.name
  if (body.layerName !== undefined) updates.layerName = body.layerName

  // Multi-collection support: prefer collections over legacy schema
  if (body.collections !== undefined) {
    updates.collections = body.collections

    // Also update legacy fields for backwards compatibility
    // Use first collection's data for legacy fields
    const firstCollection = body.collections[0]
    if (firstCollection) {
      updates.collectionName = firstCollection.collectionName
      updates.schema = {
        collectionName: firstCollection.collectionName,
        layerName: body.layerName,
        fields: firstCollection.fields,
        options: firstCollection.options,
        cardTemplate: firstCollection.cardTemplate
      }
      updates.options = firstCollection.options
    }
  } else {
    // Legacy single-collection update
    if (body.collectionName !== undefined) updates.collectionName = body.collectionName
    if (body.schema !== undefined) updates.schema = body.schema
    if (body.options !== undefined) updates.options = body.options
  }

  if (Object.keys(updates).length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No fields to update'
    })
  }

  const [project] = await db
    .update(schemaProjects)
    .set(updates)
    .where(eq(schemaProjects.id, id))
    .returning()

  if (!project) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Project not found'
    })
  }

  // Return with collections populated (backwards compat)
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
