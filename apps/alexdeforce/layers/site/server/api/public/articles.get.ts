import { contentArticles } from '~~/server/db/schema'
import { eq, desc, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const db = useDB()

  const conditions = [eq(contentArticles.status, 'published')]

  if (query.category) {
    conditions.push(eq(contentArticles.category, String(query.category)))
  }

  if (query.featured === 'true') {
    conditions.push(eq(contentArticles.featured, true))
  }

  const articles = await db
    .select()
    .from(contentArticles)
    .where(and(...conditions))
    .orderBy(desc(contentArticles.date))

  return articles.map(article => ({
    ...article,
    contentHtml: article.content ? renderTipTapToHtml(article.content) : ''
  }))
})
