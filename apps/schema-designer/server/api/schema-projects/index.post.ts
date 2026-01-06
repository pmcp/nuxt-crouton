import { schemaProjects } from '../../db/schema'

interface CollectionSchema {
  id: string
  collectionName: string
  fields: any[]
  options: Record<string, unknown>
  cardTemplate?: string
}

interface CreateProjectPayload {
  name: string
  layerName: string
  /** @deprecated Use collections array instead */
  collectionName?: string
  /** @deprecated Use collections array instead */
  schema?: Record<string, unknown>
  options?: Record<string, unknown>
  /** Multi-collection support */
  collections?: CollectionSchema[]
}

/**
 * Create a new schema project
 * Supports both legacy single-collection and new multi-collection formats
 */
export default defineEventHandler(async (event) => {
  // db is auto-imported from hub:db (NuxtHub 0.10+)
  const body = await readBody<CreateProjectPayload>(event)

  // Validate required fields
  if (!body.name || !body.layerName) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required fields: name, layerName'
    })
  }

  // Multi-collection support: determine values based on format
  let collectionName: string
  let schema: Record<string, unknown>
  let options: Record<string, unknown>
  let collections: CollectionSchema[] | null = null

  if (body.collections && body.collections.length > 0) {
    // New multi-collection format
    collections = body.collections
    const firstCollection = body.collections[0]!
    collectionName = firstCollection.collectionName
    schema = {
      collectionName: firstCollection.collectionName,
      layerName: body.layerName,
      fields: firstCollection.fields,
      options: firstCollection.options,
      cardTemplate: firstCollection.cardTemplate
    }
    options = firstCollection.options
  } else if (body.collectionName) {
    // Legacy single-collection format
    collectionName = body.collectionName
    schema = body.schema || {}
    options = body.options || {}
  } else {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required fields: either collectionName or collections array'
    })
  }

  // Create the project
  const [project] = await db
    .insert(schemaProjects)
    .values({
      name: body.name,
      layerName: body.layerName,
      collectionName,
      schema,
      options,
      collections
    })
    .returning()

  if (!project) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create project'
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
