// @crouton-generated seed file
// Layer: shop
// Collection: products
// Generated with drizzle-seed
//
// Usage (from Nuxt server context):
//   import { seedShopProducts } from '~/layers/shop/collections/products/server/database/seed'
//   await seedShopProducts({ count: 50, teamId: 'your-team-id' })
//
// Or run standalone (requires DATABASE_URL env var):
//   DATABASE_URL=file:./data/hub/d1/miniflare-D1DatabaseObject/... npx tsx seed.ts


import { seed, reset } from 'drizzle-seed'
import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'
import { shopProducts } from './schema'

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
 * Seed products with realistic test data
 */
export async function seedShopProducts(options: SeedOptions = {}) {
  const db = options.db ?? createDb()
  const count = options.count ?? 50
  const teamId = options.teamId ?? 'seed-team'

  console.log(`Seeding ${count} products...`)

  if (options.reset) {
    console.log('Resetting products table...')
    await reset(db, { shopProducts })
  }

  await seed(db, { shopProducts }).refine((f) => ({
    shopProducts: {
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
        shortDescription: f.loremIpsum({ sentencesCount: 3 }),
        price: f.number({ minValue: 1, maxValue: 1000, precision: 100 }),
        stock: f.int({ minValue: 0, maxValue: 100 }),
        featured: f.weightedRandom([{ value: true, weight: 0.5 }, { value: false, weight: 0.5 }]),
        inStock: f.int({ minValue: 0, maxValue: 100 }),
        thumbnail: f.loremIpsum({ sentencesCount: 1 }),
        tags: f.valuesFromArray({ values: [[]] })
      }
    }
  }))

  console.log(`✓ Seeded ${count} products`)
}

// Allow direct execution: npx tsx seed.ts
// Note: Bun uses Bun.main, Node uses require.main === module
const isMainModule = typeof Bun !== 'undefined'
  ? Bun.main === import.meta.path
  : import.meta.url === `file://${process.argv[1]}`

if (isMainModule) {
  seedShopProducts()
    .then(() => {
      console.log('Seed complete!')
      process.exit(0)
    })
    .catch((err) => {
      console.error('Seed failed:', err)
      process.exit(1)
    })
}
