// @crouton-generated seed file
// Layer: playground
// Collection: options
// Generated with drizzle-seed
//
// Run: npx tsx ./layers/playground/collections/options/server/database/seed.ts
// Or import and call: seedPlaygroundOptions({ count: 50, teamId: 'your-team-id' })


import { seed, reset } from 'drizzle-seed'
import { playgroundOptions } from './schema'
import { useDB } from '~~/server/utils/db'

export interface SeedOptions {
  /** Number of records to seed (default: 5) */
  count?: number
  /** Team ID for seeded records (default: 'playground-team') */
  teamId?: string
  /** Reset (delete all) before seeding */
  reset?: boolean
}

/**
 * Seed options with realistic test data
 */
export async function seedPlaygroundOptions(options: SeedOptions = {}) {
  const db = useDB()
  const count = options.count ?? 5
  const teamId = options.teamId ?? 'playground-team'

  console.log(`Seeding ${count} options...`)

  if (options.reset) {
    console.log('Resetting options table...')
    await reset(db, { playgroundOptions })
  }

  await seed(db, { playgroundOptions }).refine((f) => ({
    playgroundOptions: {
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
        description: f.loremIpsum({ sentencesCount: 3 }),
        icon: f.loremIpsum({ sentencesCount: 1 }),
        category: f.valuesFromArray({ values: ["type_a", "type_b", "type_c"] })
      }
    }
  }))

  console.log(`✓ Seeded ${count} options`)
}

// Allow direct execution: npx tsx seed.ts
// Note: Bun uses Bun.main, Node uses require.main === module
const isMainModule = typeof Bun !== 'undefined'
  ? Bun.main === import.meta.path
  : import.meta.url === `file://${process.argv[1]}`

if (isMainModule) {
  seedPlaygroundOptions()
    .then(() => {
      console.log('Seed complete!')
      process.exit(0)
    })
    .catch((err) => {
      console.error('Seed failed:', err)
      process.exit(1)
    })
}
