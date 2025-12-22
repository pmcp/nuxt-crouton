import { schemaProjects } from '../../db/schema'

interface CreateProjectPayload {
  name: string
  layerName: string
  collectionName: string
  schema: Record<string, unknown>
  options: Record<string, unknown>
}

export default defineEventHandler(async (event) => {
  // db is auto-imported from hub:db (NuxtHub 0.10+)
  const body = await readBody<CreateProjectPayload>(event)

  // Validate required fields
  if (!body.name || !body.layerName || !body.collectionName) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required fields: name, layerName, collectionName'
    })
  }

  // Create the project
  const [project] = await db
    .insert(schemaProjects)
    .values({
      name: body.name,
      layerName: body.layerName,
      collectionName: body.collectionName,
      schema: body.schema,
      options: body.options
    })
    .returning()

  return { project }
})
