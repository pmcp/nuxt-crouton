// @crouton-generated seed file
// Layer: blog
// Collection: posts
// Generated with drizzle-seed
//
// Run: npx tsx ./layers/blog/collections/posts/server/database/seed.ts
// Or import and call: seedBlogPosts({ count: 50, teamId: 'your-team-id' })


import { seed, reset } from 'drizzle-seed'
import { blogPosts } from './schema'
// useDB is auto-imported from @crouton/auth layer

export interface SeedOptions {
  /** Number of records to seed (default: 10) */
  count?: number
  /** Team ID for seeded records (default: 'seed-team') */
  teamId?: string
  /** Reset (delete all) before seeding */
  reset?: boolean
}

/**
 * Seed posts with realistic test data
 */
export async function seedBlogPosts(options: SeedOptions = {}) {
  const db = useDB()
  const count = options.count ?? 10
  const teamId = options.teamId ?? 'seed-team'

  console.log(`Seeding ${count} posts...`)

  if (options.reset) {
    console.log('Resetting posts table...')
    await reset(db, { blogPosts })
  }

  await seed(db, { blogPosts }).refine((f) => ({
    blogPosts: {
      count,
      columns: {
        // Team scoping (required)
        teamId: f.valuesFromArray({ values: [teamId] }),
        owner: f.valuesFromArray({ values: ['seed-script'] }),

        // Audit fields
        createdBy: f.valuesFromArray({ values: ['seed-script'] }),
        updatedBy: f.valuesFromArray({ values: ['seed-script'] }),

        // Collection fields
        title: f.loremIpsum({ sentencesCount: 1 }),
        slug: f.loremIpsum({ sentencesCount: 1 }),
        content: f.loremIpsum({ sentencesCount: 3 }),
        published: f.weightedRandom([{ value: true, weight: 0.5 }, { value: false, weight: 0.5 }]),
        publishedAt: f.loremIpsum({ sentencesCount: 1 }),
        authorName: f.loremIpsum({ sentencesCount: 1 })
      }
    }
  }))

  console.log(`✓ Seeded ${count} posts`)
}

// Allow direct execution: npx tsx seed.ts
// Note: Bun uses Bun.main, Node uses require.main === module
const isMainModule = typeof Bun !== 'undefined'
  ? Bun.main === import.meta.path
  : import.meta.url === `file://${process.argv[1]}`

if (isMainModule) {
  seedBlogPosts()
    .then(() => {
      console.log('Seed complete!')
      process.exit(0)
    })
    .catch((err) => {
      console.error('Seed failed:', err)
      process.exit(1)
    })
}
