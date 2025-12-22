import { eq } from 'drizzle-orm'
import { schemaProjects } from '../../db/schema'

interface UpdateProjectPayload {
  name?: string
  layerName?: string
  collectionName?: string
  schema?: Record<string, unknown>
  options?: Record<string, unknown>
}

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
  if (body.collectionName !== undefined) updates.collectionName = body.collectionName
  if (body.schema !== undefined) updates.schema = body.schema
  if (body.options !== undefined) updates.options = body.options

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

  return { project }
})
