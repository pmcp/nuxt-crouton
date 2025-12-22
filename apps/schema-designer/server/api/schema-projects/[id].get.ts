import { eq } from 'drizzle-orm'
import { schemaProjects } from '../../db/schema'

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

  return { project }
})
