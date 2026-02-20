// @crouton-generated seed file
// Layer: shop
// Collection: categories
// Generated with drizzle-seed
//
// Usage (from Nuxt server context):
//   import { seedShopCategories } from '~/layers/shop/collections/categories/server/database/seed'
//   await seedShopCategories({ count: 50, teamId: 'your-team-id' })
//
// Or run standalone (requires DATABASE_URL env var):
//   DATABASE_URL=file:./data/hub/d1/miniflare-D1DatabaseObject/... npx tsx seed.ts

// NOTE: Hierarchy fields (parentId, path, depth, order) are handled automatically.
// All seeded records will be root items (parentId: null).

import { seed, reset } from 'drizzle-seed'
import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'
import { shopCategories } from './schema'

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
 * Seed categories with realistic test data
 */
export async function seedShopCategories(options: SeedOptions = {}) {
  const db = options.db ?? createDb()
  const count = options.count ?? 50
  const teamId = options.teamId ?? 'seed-team'

  console.log(`Seeding ${count} categories...`)

  if (options.reset) {
    console.log('Resetting categories table...')
    await reset(db, { shopCategories })
  }

  await seed(db, { shopCategories }).refine((f) => ({
    shopCategories: {
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
        description: f.loremIpsum({ sentencesCount: 3 }),
        icon: f.loremIpsum({ sentencesCount: 1 })
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
  seedShopCategories()
    .then(() => {
      console.log('Seed complete!')
      process.exit(0)
    })
    .catch((err) => {
      console.error('Seed failed:', err)
      process.exit(1)
    })
}
