// Generator for seed data file using drizzle-seed
import { getSeedGenerator, pascal } from '../utils/helpers.mjs'

/**
 * Generate a seed file for a collection using drizzle-seed
 * @param {object} data - Collection data with fields, names, etc.
 * @param {object} config - Configuration options
 * @returns {string} - Generated seed file content
 */
export function generateSeedFile(data, config = {}) {
  const { plural, layer, fields, hierarchy } = data
  const seedCount = config.seedCount || 25
  const teamId = config.teamId || 'seed-team'

  // Build the table/export name (layer-prefixed)
  const layerCamelCase = layer
    .split(/[-_]/)
    .map((part, index) => index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
  const tableName = `${layerCamelCase}${plural.charAt(0).toUpperCase() + plural.slice(1)}`

  // Pascal case for function name
  const layerPascal = pascal(layer)
  const pluralPascal = pascal(plural)
  const functionName = `seed${layerPascal}${pluralPascal}`

  // Fields that are auto-generated and should not be seeded manually
  const AUTO_FIELDS = [
    'id', 'teamId', 'owner',
    'createdAt', 'updatedAt', 'createdBy', 'updatedBy',
    'parentId', 'path', 'depth', 'order' // hierarchy fields
  ]

  // Filter out auto-generated fields and generate seed mappings
  const seedableFields = fields.filter(f => !AUTO_FIELDS.includes(f.name))

  // Build field mappings for drizzle-seed
  const fieldMappings = seedableFields.map((f) => {
    const generator = getSeedGenerator(f)

    // Add comment for foreign key fields
    if (f.refTarget) {
      return `        // NOTE: ${f.name} references '${f.refTarget}' - seed ${f.refTarget} first, then update this\n        ${f.name}: f.valuesFromArray({ values: ['placeholder-${f.refTarget}-id'] })`
    }

    return `        ${f.name}: ${generator}`
  })

  // Build hierarchy note if applicable
  const hierarchyNote = hierarchy?.enabled
    ? `\n// NOTE: Hierarchy fields (parentId, path, depth, order) are handled automatically.\n// All seeded records will be root items (parentId: null).`
    : ''

  return `// @crouton-generated seed file
// Layer: ${layer}
// Collection: ${plural}
// Generated with drizzle-seed
//
// Run: npx tsx ./layers/${layer}/collections/${plural}/server/database/seed.ts
// Or import and call: ${functionName}({ count: 50, teamId: 'your-team-id' })
${hierarchyNote}

import { seed, reset } from 'drizzle-seed'
import { ${tableName} } from './schema'
import { useDB } from '~~/server/utils/db'

export interface SeedOptions {
  /** Number of records to seed (default: ${seedCount}) */
  count?: number
  /** Team ID for seeded records (default: '${teamId}') */
  teamId?: string
  /** Reset (delete all) before seeding */
  reset?: boolean
}

/**
 * Seed ${plural} with realistic test data
 */
export async function ${functionName}(options: SeedOptions = {}) {
  const db = useDB()
  const count = options.count ?? ${seedCount}
  const teamId = options.teamId ?? '${teamId}'

  console.log(\`Seeding \${count} ${plural}...\`)

  if (options.reset) {
    console.log('Resetting ${plural} table...')
    await reset(db, { ${tableName} })
  }

  await seed(db, { ${tableName} }).refine((f) => ({
    ${tableName}: {
      count,
      columns: {
        // Team scoping (required)
        teamId: f.valuesFromArray({ values: [teamId] }),
        owner: f.valuesFromArray({ values: ['seed-script'] }),

        // Audit fields
        createdBy: f.valuesFromArray({ values: ['seed-script'] }),
        updatedBy: f.valuesFromArray({ values: ['seed-script'] }),

        // Collection fields
${fieldMappings.join(',\n')}
      }
    }
  }))

  console.log(\`✓ Seeded \${count} ${plural}\`)
}

// Allow direct execution: npx tsx seed.ts
// Note: Bun uses Bun.main, Node uses require.main === module
const isMainModule = typeof Bun !== 'undefined'
  ? Bun.main === import.meta.path
  : import.meta.url === \`file://\${process.argv[1]}\`

if (isMainModule) {
  ${functionName}()
    .then(() => {
      console.log('Seed complete!')
      process.exit(0)
    })
    .catch((err) => {
      console.error('Seed failed:', err)
      process.exit(1)
    })
}
`
}
