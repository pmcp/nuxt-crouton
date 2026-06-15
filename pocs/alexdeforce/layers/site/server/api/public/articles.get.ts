import { contentArticles, contentCategories, contentTags } from '~~/server/db/schema'
import { eq, desc, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const db = useDB()

  const conditions = [eq(contentArticles.status, 'published')]

  if (query.category) {
    // Category param is a slug (e.g. "poezie"), but articles store category IDs.
    // Resolve slug to ID via case-insensitive title match.
    const slug = String(query.category).toLowerCase()
    const allCats = await db
      .select({ id: contentCategories.id, title: contentCategories.title })
      .from(contentCategories)
    const match = allCats.find(c => c.title.toLowerCase() === slug)
    if (match) {
      conditions.push(eq(contentArticles.category, match.id))
    } else {
      return []
    }
  }

  if (query.featured === 'true') {
    conditions.push(eq(contentArticles.featured, true))
  }

  const articles = await db
    .select()
    .from(contentArticles)
    .where(and(...conditions))
    .orderBy(desc(contentArticles.date))

  // Resolve tag IDs and category IDs to names
  const allTags = await db
    .select({ id: contentTags.id, title: contentTags.title })
    .from(contentTags)
  const tagMap = new Map(allTags.map(t => [t.id, t.title]))

  const allCats = await db
    .select({ id: contentCategories.id, title: contentCategories.title })
    .from(contentCategories)
  const catMap = new Map(allCats.map(c => [c.id, c.title.toLowerCase()]))

  return articles.map(article => ({
    ...article,
    tags: Array.isArray(article.tags)
      ? article.tags.map((id: string) => tagMap.get(id) || id)
      : article.tags,
    categorySlug: catMap.get(article.category) || article.category,
    contentHtml: article.content ? renderTipTapToHtml(article.content) : ''
  }))
})
