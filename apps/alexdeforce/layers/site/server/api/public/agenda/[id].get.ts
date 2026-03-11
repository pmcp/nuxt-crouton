import { contentAgendas } from '~~/server/db/schema'
import { eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ status: 400, statusText: 'Missing id' })
  }

  const db = useDB()

  const [item] = await db
    .select()
    .from(contentAgendas)
    .where(and(
      eq(contentAgendas.id, id),
      eq(contentAgendas.status, 'published')
    ))
    .limit(1)

  if (!item) {
    throw createError({ status: 404, statusText: 'Event not found' })
  }

  return {
    ...item,
    contentHtml: item.content ? renderTipTapToHtml(item.content) : ''
  }
})
