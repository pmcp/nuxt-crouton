import { pagesPages } from '~~/server/db/schema'
import { eq, and } from 'drizzle-orm'

export default defineEventHandler(async () => {
  const db = useDB()

  const pages = await db
    .select({
      id: pagesPages.id,
      title: pagesPages.title,
      slug: pagesPages.slug,
      pageType: pagesPages.pageType,
      config: pagesPages.config
    })
    .from(pagesPages)
    .where(and(
      eq(pagesPages.status, 'published'),
      eq(pagesPages.showInNavigation, true)
    ))
    .orderBy(pagesPages.order)

  return pages
})
