import { schemaProjects } from '../../db/schema'
import { migrateProject, type SchemaProjectRecord } from '../../utils/project-migration'
import type { PackageInstance, CollectionSchema } from '@friendlyinternet/nuxt-crouton-schema-designer/types'

interface CreateProjectPayload {
  name: string
  /** Base layer name for custom collections (new format) */
  baseLayerName?: string
  /** @deprecated Use baseLayerName instead */
  layerName?: string
  /** Selected packages with configuration (new format) */
  packages?: PackageInstance[]
  /** Multi-collection support */
  collections?: CollectionSchema[]
  /** @deprecated Use collections array instead */
  collectionName?: string
  /** @deprecated Use collections array instead */
  schema?: Record<string, unknown>
  options?: Record<string, unknown>
}

/**
 * Create a new schema project
 * Supports three formats:
 * 1. New package-aware: { name, baseLayerName, packages, collections }
 * 2. Multi-collection: { name, layerName, collections }
 * 3. Legacy: { name, layerName, collectionName, schema, options }
 */
export default defineEventHandler(async (event) => {
  // db is auto-imported from hub:db (NuxtHub 0.10+)
  const body = await readBody<CreateProjectPayload>(event)

  // Validate required fields
  if (!body.name) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required field: name'
    })
  }

  // Determine baseLayerName (prefer baseLayerName, fall back to layerName)
  const baseLayerName = body.baseLayerName || body.layerName
  if (!baseLayerName) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required field: baseLayerName or layerName'
    })
  }

  // Determine packages (default to empty array)
  const packages = body.packages || []

  // Determine collections and legacy fields
  let collectionName: string
  let schema: Record<string, unknown>
  let options: Record<string, unknown>
  let collections: CollectionSchema[] | null = null

  if (body.collections && body.collections.length > 0) {
    // New format with collections array
    collections = body.collections
    const firstCollection = body.collections[0]!
    collectionName = firstCollection.collectionName
    schema = {
      collectionName: firstCollection.collectionName,
      layerName: baseLayerName,
      fields: firstCollection.fields,
      options: firstCollection.options,
      cardTemplate: firstCollection.cardTemplate
    }
    options = firstCollection.options as unknown as Record<string, unknown>
  } else if (body.collectionName) {
    // Legacy single-collection format
    collectionName = body.collectionName
    schema = body.schema || {}
    options = body.options || {}
  } else {
    // New project with packages but no custom collections yet
    // Use a placeholder for required legacy fields
    collectionName = '_placeholder'
    schema = {}
    options = {}
    collections = []
  }

  // Create the project
  const [project] = await db
    .insert(schemaProjects)
    .values({
      name: body.name,
      baseLayerName,
      layerName: baseLayerName, // Keep legacy field in sync
      collectionName,
      schema,
      options,
      packages,
      collections
    })
    .returning()

  if (!project) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create project'
    })
  }

  // Return migrated/normalized project
  const normalizedProject = migrateProject(project as unknown as SchemaProjectRecord)

  return { project: normalizedProject }
})
