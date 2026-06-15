import { pagesPages } from '~~/server/db/schema'
import { eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ status: 400, statusText: 'Missing slug' })
  }

  const db = useDB()

  const [page] = await db
    .select()
    .from(pagesPages)
    .where(and(
      eq(pagesPages.slug, slug),
      eq(pagesPages.status, 'published')
    ))
    .limit(1)

  if (!page) {
    throw createError({ status: 404, statusText: 'Page not found' })
  }

  return {
    ...page,
    contentHtml: page.content ? renderTipTapToHtml(page.content) : ''
  }
})
