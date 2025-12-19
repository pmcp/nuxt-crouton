// Simple test endpoint - bypasses auth for local testing
import { blogPosts } from '~~/layers/blog/collections/posts/server/database/schema'

export default defineEventHandler(async () => {
  const db = useLocalDB()
  const posts = await db.select().from(blogPosts).all()
  return posts
})