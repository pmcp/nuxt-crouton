// @crouton-generated seed file
// Layer: playground
// Collection: categories
// Generated with drizzle-seed
//
// Run: npx tsx ./layers/playground/collections/categories/server/database/seed.ts
// Or import and call: seedPlaygroundCategories({ count: 50, teamId: 'your-team-id' })

// NOTE: Hierarchy fields (parentId, path, depth, order) are handled automatically.
// All seeded records will be root items (parentId: null).

import { seed, reset } from 'drizzle-seed'
import { playgroundCategories } from './schema'
import { useDB } from '~~/server/utils/db'

export interface SeedOptions {
  /** Number of records to seed (default: 8) */
  count?: number
  /** Team ID for seeded records (default: 'playground-team') */
  teamId?: string
  /** Reset (delete all) before seeding */
  reset?: boolean
}

/**
 * Seed categories with realistic test data
 */
export async function seedPlaygroundCategories(options: SeedOptions = {}) {
  const db = useDB()
  const count = options.count ?? 8
  const teamId = options.teamId ?? 'playground-team'

  console.log(`Seeding ${count} categories...`)

  if (options.reset) {
    console.log('Resetting categories table...')
    await reset(db, { playgroundCategories })
  }

  await seed(db, { playgroundCategories }).refine((f) => ({
    playgroundCategories: {
      count,
      columns: {
        // Team scoping (required)
        teamId: f.valuesFromArray({ values: [teamId] }),
        owner: f.valuesFromArray({ values: ['seed-script'] }),

        // Audit fields
        createdBy: f.valuesFromArray({ values: ['seed-script'] }),
        updatedBy: f.valuesFromArray({ values: ['seed-script'] }),

        // Collection fields
        name: f.fullName(),
        description: f.loremIpsum({ sentencesCount: 3 }),
        icon: f.loremIpsum({ sentencesCount: 1 }),
        color: f.loremIpsum({ sentencesCount: 1 })
      }
    }
  }))

  console.log(`✓ Seeded ${count} categories`)
}

// Allow direct execution: npx tsx seed.ts
// Note: Bun uses Bun.main, Node uses require.main === module
const isMainModule = typeof Bun !== 'undefined'
  ? Bun.main === import.meta.path
  : import.meta.url === `file://${process.argv[1]}`

if (isMainModule) {
  seedPlaygroundCategories()
    .then(() => {
      console.log('Seed complete!')
      process.exit(0)
    })
    .catch((err) => {
      console.error('Seed failed:', err)
      process.exit(1)
    })
}
