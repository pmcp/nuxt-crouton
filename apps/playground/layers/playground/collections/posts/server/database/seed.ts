// @crouton-generated seed file
// Layer: playground
// Collection: posts
// Generated with drizzle-seed
//
// Run: npx tsx ./layers/playground/collections/posts/server/database/seed.ts
// Or import and call: seedPlaygroundPosts({ count: 50, teamId: 'your-team-id' })


import { seed, reset } from 'drizzle-seed'
import { playgroundPosts } from './schema'
import { useDB } from '~~/server/utils/db'

export interface SeedOptions {
  /** Number of records to seed (default: 15) */
  count?: number
  /** Team ID for seeded records (default: 'playground-team') */
  teamId?: string
  /** Reset (delete all) before seeding */
  reset?: boolean
}

/**
 * Seed posts with realistic test data
 */
export async function seedPlaygroundPosts(options: SeedOptions = {}) {
  const db = useDB()
  const count = options.count ?? 15
  const teamId = options.teamId ?? 'playground-team'

  console.log(`Seeding ${count} posts...`)

  if (options.reset) {
    console.log('Resetting posts table...')
    await reset(db, { playgroundPosts })
  }

  await seed(db, { playgroundPosts }).refine((f) => ({
    playgroundPosts: {
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
        excerpt: f.loremIpsum({ sentencesCount: 3 }),
        content: f.loremIpsum({ sentencesCount: 3 }),
        status: f.valuesFromArray({ values: ["active", "inactive", "pending"] }),
        publishedAt: f.date({ minDate: "2020-01-01", maxDate: "2025-12-31" }),
        featuredImage: f.loremIpsum({ sentencesCount: 1 }),
        // NOTE: categoryId references 'categories' - seed categories first, then update this
        categoryId: f.valuesFromArray({ values: ['placeholder-categories-id'] }),
        metadata: f.valuesFromArray({ values: [[]] })
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
  seedPlaygroundPosts()
    .then(() => {
      console.log('Seed complete!')
      process.exit(0)
    })
    .catch((err) => {
      console.error('Seed failed:', err)
      process.exit(1)
    })
}
