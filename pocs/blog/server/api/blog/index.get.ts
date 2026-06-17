// Public blog index — no auth. Returns only published posts, newest-first.
// Single-blog site: read straight across the blog_posts table via the hub db,
// filtered to status='published' (no team scoping needed for the public surface).
import { eq, desc } from 'drizzle-orm'
import { useDB } from '@fyit/crouton-auth/server/utils/database'
import { blogPosts } from '~~/layers/blog/collections/posts/server/database/schema'

export default defineEventHandler(async () => {
  const db = useDB()

  const posts = await (db as any)
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
    .where(eq(blogPosts.status, 'published'))
    .orderBy(desc(blogPosts.publishedAt))

  return posts
})
