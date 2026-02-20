// @crouton-generated seed file
// Layer: people
// Collection: contacts
// Generated with drizzle-seed
//
// Usage (from Nuxt server context):
//   import { seedPeopleContacts } from '~/layers/people/collections/contacts/server/database/seed'
//   await seedPeopleContacts({ count: 50, teamId: 'your-team-id' })
//
// Or run standalone (requires DATABASE_URL env var):
//   DATABASE_URL=file:./data/hub/d1/miniflare-D1DatabaseObject/... npx tsx seed.ts


import { seed, reset } from 'drizzle-seed'
import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'
import { peopleContacts } from './schema'

export interface SeedOptions {
  /** Number of records to seed (default: 50) */
  count?: number
  /** Team ID for seeded records (default: 'seed-team') */
  teamId?: string
  /** Reset (delete all) before seeding */
  reset?: boolean
  /** Optional: pass existing db instance (for use within Nuxt server context) */
  db?: ReturnType<typeof drizzle>
}

/**
 * Create a database connection for standalone execution
 */
function createDb() {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error('DATABASE_URL environment variable is required for standalone seed execution')
  }
  const client = createClient({ url })
  return drizzle(client)
}

/**
 * Seed contacts with realistic test data
 */
export async function seedPeopleContacts(options: SeedOptions = {}) {
  const db = options.db ?? createDb()
  const count = options.count ?? 50
  const teamId = options.teamId ?? 'seed-team'

  console.log(`Seeding ${count} contacts...`)

  if (options.reset) {
    console.log('Resetting contacts table...')
    await reset(db, { peopleContacts })
  }

  await seed(db, { peopleContacts }).refine((f) => ({
    peopleContacts: {
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
        email: f.email(),
        phone: f.phoneNumber(),
        website: f.valuesFromArray({ values: ["https://example.com"] }),
        bio: f.loremIpsum({ sentencesCount: 3 }),
        avatar: f.loremIpsum({ sentencesCount: 1 }),
        resume: f.loremIpsum({ sentencesCount: 1 }),
        active: f.weightedRandom([{ value: true, weight: 0.5 }, { value: false, weight: 0.5 }]),
        birthday: f.date({ minDate: "2020-01-01", maxDate: "2025-12-31" }),
        socialLinks: f.valuesFromArray({ values: ["https://example.com"] }),
        skills: f.valuesFromArray({ values: [[]] })
      }
    }
  }))

  console.log(`✓ Seeded ${count} contacts`)
}

// Allow direct execution: npx tsx seed.ts
// Note: Bun uses Bun.main, Node uses require.main === module
const isMainModule = typeof Bun !== 'undefined'
  ? Bun.main === import.meta.path
  : import.meta.url === `file://${process.argv[1]}`

if (isMainModule) {
  seedPeopleContacts()
    .then(() => {
      console.log('Seed complete!')
      process.exit(0)
    })
    .catch((err) => {
      console.error('Seed failed:', err)
      process.exit(1)
    })
}
