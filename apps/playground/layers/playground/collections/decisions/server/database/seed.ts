// @crouton-generated seed file
// Layer: playground
// Collection: decisions
// Generated with drizzle-seed
//
// Run: npx tsx ./layers/playground/collections/decisions/server/database/seed.ts
// Or import and call: seedPlaygroundDecisions({ count: 50, teamId: 'your-team-id' })

// NOTE: Hierarchy fields (parentId, path, depth, order) are handled automatically.
// All seeded records will be root items (parentId: null).

import { seed, reset } from 'drizzle-seed'
import { playgroundDecisions } from './schema'
import { useDB } from '~~/server/utils/db'

export interface SeedOptions {
  /** Number of records to seed (default: 6) */
  count?: number
  /** Team ID for seeded records (default: 'playground-team') */
  teamId?: string
  /** Reset (delete all) before seeding */
  reset?: boolean
}

/**
 * Seed decisions with realistic test data
 */
export async function seedPlaygroundDecisions(options: SeedOptions = {}) {
  const db = useDB()
  const count = options.count ?? 6
  const teamId = options.teamId ?? 'playground-team'

  console.log(`Seeding ${count} decisions...`)

  if (options.reset) {
    console.log('Resetting decisions table...')
    await reset(db, { playgroundDecisions })
  }

  await seed(db, { playgroundDecisions }).refine((f) => ({
    playgroundDecisions: {
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
        type: f.valuesFromArray({ values: ["type_a", "type_b", "type_c"] }),
        status: f.valuesFromArray({ values: ["active", "inactive", "pending"] }),
        position: f.valuesFromArray({ values: [{}] })
      }
    }
  }))

  console.log(`✓ Seeded ${count} decisions`)
}

// Allow direct execution: npx tsx seed.ts
// Note: Bun uses Bun.main, Node uses require.main === module
const isMainModule = typeof Bun !== 'undefined'
  ? Bun.main === import.meta.path
  : import.meta.url === `file://${process.argv[1]}`

if (isMainModule) {
  seedPlaygroundDecisions()
    .then(() => {
      console.log('Seed complete!')
      process.exit(0)
    })
    .catch((err) => {
      console.error('Seed failed:', err)
      process.exit(1)
    })
}
