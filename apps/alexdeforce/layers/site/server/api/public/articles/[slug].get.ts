import { contentArticles } from '~~/server/db/schema'
import { eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ status: 400, statusText: 'Missing slug' })
  }

  const db = useDB()

  const [article] = await db
    .select()
    .from(contentArticles)
    .where(and(
      eq(contentArticles.id, slug),
      eq(contentArticles.draft, false)
    ))
    .limit(1)

  if (!article) {
    throw createError({ status: 404, statusText: 'Article not found' })
  }

  return article
})
