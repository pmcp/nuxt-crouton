// @crouton-generated seed file
// Layer: projects
// Collection: tasks
// Generated with drizzle-seed
//
// Usage (from Nuxt server context):
//   import { seedProjectsTasks } from '~/layers/projects/collections/tasks/server/database/seed'
//   await seedProjectsTasks({ count: 50, teamId: 'your-team-id' })
//
// Or run standalone (requires DATABASE_URL env var):
//   DATABASE_URL=file:./data/hub/d1/miniflare-D1DatabaseObject/... npx tsx seed.ts


import { seed, reset } from 'drizzle-seed'
import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'
import { projectsTasks } from './schema'

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
 * Seed tasks with realistic test data
 */
export async function seedProjectsTasks(options: SeedOptions = {}) {
  const db = options.db ?? createDb()
  const count = options.count ?? 50
  const teamId = options.teamId ?? 'seed-team'

  console.log(`Seeding ${count} tasks...`)

  if (options.reset) {
    console.log('Resetting tasks table...')
    await reset(db, { projectsTasks })
  }

  await seed(db, { projectsTasks }).refine((f) => ({
    projectsTasks: {
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
        status: f.valuesFromArray({ values: ["active", "inactive", "pending"] }),
        dueDate: f.date({ minDate: "2020-01-01", maxDate: "2025-12-31" }),
        completed: f.weightedRandom([{ value: true, weight: 0.5 }, { value: false, weight: 0.5 }]),
        priority: f.int({ minValue: 0, maxValue: 100 }),
        // NOTE: assigneeId references 'contacts' - seed contacts first, then update this
        assigneeId: f.valuesFromArray({ values: ['placeholder-contacts-id'] }),
        subtasks: f.valuesFromArray({ values: [[]] })
      }
    }
  }))

  console.log(`✓ Seeded ${count} tasks`)
}

// Allow direct execution: npx tsx seed.ts
// Note: Bun uses Bun.main, Node uses require.main === module
const isMainModule = typeof Bun !== 'undefined'
  ? Bun.main === import.meta.path
  : import.meta.url === `file://${process.argv[1]}`

if (isMainModule) {
  seedProjectsTasks()
    .then(() => {
      console.log('Seed complete!')
      process.exit(0)
    })
    .catch((err) => {
      console.error('Seed failed:', err)
      process.exit(1)
    })
}
