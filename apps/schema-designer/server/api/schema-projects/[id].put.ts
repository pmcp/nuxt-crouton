import { eq } from 'drizzle-orm'
import { schemaProjects } from '../../database/schema'
import { migrateProject, type SchemaProjectRecord } from '../../utils/project-migration'
import type { PackageInstance, CollectionSchema } from '@friendlyinternet/nuxt-crouton-schema-designer/types'

interface UpdateProjectPayload {
  name?: string
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
 * Update a schema project
 * Supports three formats:
 * 1. New package-aware: { name, baseLayerName, packages, collections }
 * 2. Multi-collection: { name, layerName, collections }
 * 3. Legacy: { name, layerName, collectionName, schema, options }
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

  // Handle baseLayerName (new format) or layerName (legacy)
  if (body.baseLayerName !== undefined) {
    updates.baseLayerName = body.baseLayerName
    updates.layerName = body.baseLayerName // Keep legacy field in sync
  } else if (body.layerName !== undefined) {
    updates.layerName = body.layerName
    updates.baseLayerName = body.layerName // Update new field too
  }

  // Handle packages array (new format)
  if (body.packages !== undefined) {
    updates.packages = body.packages
  }

  // Handle collections array
  if (body.collections !== undefined) {
    updates.collections = body.collections

    // Also update legacy fields for backwards compatibility
    // Use first collection's data for legacy fields
    const firstCollection = body.collections[0]
    if (firstCollection) {
      updates.collectionName = firstCollection.collectionName
      updates.schema = {
        collectionName: firstCollection.collectionName,
        layerName: body.baseLayerName || body.layerName,
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

  // Return migrated/normalized project
  const normalizedProject = migrateProject(project as unknown as SchemaProjectRecord)

  return { project: normalizedProject }
})
