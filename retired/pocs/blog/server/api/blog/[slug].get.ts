// Public single-post endpoint — no auth. Returns one published post by slug.
// 404 when the slug is unknown OR the post is not published (drafts stay hidden).
import { eq, and } from 'drizzle-orm'
import { useDB } from '@fyit/crouton-auth/server/utils/database'
import { blogPosts } from '~~/layers/blog/collections/posts/server/database/schema'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')

  if (!slug) {
    throw createError({ status: 404, statusText: 'Not found' })
  }

  const db = useDB()

  const [post] = await (db as any)
    .select({
      id: blogPosts.id,
      title: blogPosts.title,
      slug: blogPosts.slug,
      body: blogPosts.body,
      author: blogPosts.author,
      publishedAt: blogPosts.publishedAt,
      status: blogPosts.status,
      tags: blogPosts.tags
    })
    .from(blogPosts)
    .where(and(eq(blogPosts.slug, slug), eq(blogPosts.status, 'published')))
    .limit(1)

  if (!post) {
    throw createError({ status: 404, statusText: 'Not found' })
  }

  return post
})
