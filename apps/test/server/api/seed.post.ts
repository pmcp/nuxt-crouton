// Seed endpoint for development/testing only
import { blogPosts } from '~~/layers/blog/collections/posts/server/database/schema'

export default defineEventHandler(async (event) => {
  // Block in production
  if (process.env.NODE_ENV === 'production') {
    throw createError({ statusCode: 404, message: 'Not found' })
  }

  try {
    console.log('[seed] Starting seed...')

    const db = useLocalDB()

    // Direct insert instead of drizzle-seed
    const posts = Array.from({ length: 10 }, (_, i) => ({
      id: crypto.randomUUID(),
      teamId: 'seed-team',
      owner: 'seed-script',
      createdBy: 'seed-script',
      updatedBy: 'seed-script',
      title: `Sample Post ${i + 1}`,
      slug: `sample-post-${i + 1}`,
      content: `This is the content for sample post ${i + 1}. Lorem ipsum dolor sit amet.`,
      published: i % 3 !== 0, // 2/3 published
      publishedAt: i % 3 !== 0 ? new Date().toISOString() : null,
      authorName: `Author ${i + 1}`
    }))

    await db.insert(blogPosts).values(posts)

    console.log('[seed] Done!')
    return { success: true, message: 'Seeded 10 blog posts' }
  } catch (error: any) {
    console.error('[seed] Error:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Seed failed'
    })
  }
})