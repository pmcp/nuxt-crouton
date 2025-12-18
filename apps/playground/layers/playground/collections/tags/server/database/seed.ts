// @crouton-generated seed file
// Layer: playground
// Collection: tags
// Generated with drizzle-seed
//
// Run: npx tsx ./layers/playground/collections/tags/server/database/seed.ts
// Or import and call: seedPlaygroundTags({ count: 50, teamId: 'your-team-id' })


import { seed, reset } from 'drizzle-seed'
import { playgroundTags } from './schema'
import { useDB } from '~~/server/utils/db'

export interface SeedOptions {
  /** Number of records to seed (default: 10) */
  count?: number
  /** Team ID for seeded records (default: 'playground-team') */
  teamId?: string
  /** Reset (delete all) before seeding */
  reset?: boolean
}

/**
 * Seed tags with realistic test data
 */
export async function seedPlaygroundTags(options: SeedOptions = {}) {
  const db = useDB()
  const count = options.count ?? 10
  const teamId = options.teamId ?? 'playground-team'

  console.log(`Seeding ${count} tags...`)

  if (options.reset) {
    console.log('Resetting tags table...')
    await reset(db, { playgroundTags })
  }

  await seed(db, { playgroundTags }).refine((f) => ({
    playgroundTags: {
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
        slug: f.loremIpsum({ sentencesCount: 1 }),
        color: f.loremIpsum({ sentencesCount: 1 })
      }
    }
  }))

  console.log(`✓ Seeded ${count} tags`)
}

// Allow direct execution: npx tsx seed.ts
// Note: Bun uses Bun.main, Node uses require.main === module
const isMainModule = typeof Bun !== 'undefined'
  ? Bun.main === import.meta.path
  : import.meta.url === `file://${process.argv[1]}`

if (isMainModule) {
  seedPlaygroundTags()
    .then(() => {
      console.log('Seed complete!')
      process.exit(0)
    })
    .catch((err) => {
      console.error('Seed failed:', err)
      process.exit(1)
    })
}
