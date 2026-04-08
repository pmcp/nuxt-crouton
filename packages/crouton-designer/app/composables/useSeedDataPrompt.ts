import type { ProjectConfig, SeedDataMap } from '../types/schema'
import type { CollectionWithFields } from './useCollectionEditor'
import { formatCollectionsForPrompt } from '../utils/promptFormatting'

function buildCollectionsSchema(collections: CollectionWithFields[]): string {
  return formatCollectionsForPrompt(collections, { includeOptions: true })
}

function buildCurrentSeedData(seedData: SeedDataMap): string {
  const entries = Object.entries(seedData)
  if (entries.length === 0) return '  (no seed data yet)'
  return entries.map(([name, rows]) => {
    return `  ${name}: ${rows.length} entries`
  }).join('\n')
}

/**
 * Builds the system prompt for Phase 3 (Seed Data Generation)
 */
export function buildSeedDataSystemPrompt(
  config: ProjectConfig,
  collections: CollectionWithFields[],
  currentSeedData: SeedDataMap,
  hasPriorContext = false
): string {
  const collectionNames = collections.map(c => c.name).join(', ')

  const rulesSection = hasPriorContext
    ? `## Rules (full rules were in turn 1 — key reminders)
- Use \`set_seed_data\` tool once per collection. Every entry needs an \`_id\` field.
- Reference fields (→ target) must use valid \`_id\` values from that collection.
- Use realistic data; for fields with [options] use only listed values.
- On edits, only call \`set_seed_data\` for changed collections.`
    : `## Rules
1. ALWAYS use the \`set_seed_data\` tool to provide seed data. Call it once per collection.
2. Generate 5-10 contextually appropriate entries per collection unless the user requests more or fewer.
3. Every entry MUST include an \`_id\` field (e.g., "user-1", "task-3") for cross-referencing between collections.
4. Reference fields (those with → target) MUST point to valid \`_id\` values from the target collection.
5. Generate data that feels REAL and domain-appropriate — no "lorem ipsum", no "test user 1". Use realistic names, emails, dates, statuses, etc.
6. Respect field types: string→text, text→paragraphs, number/decimal→numbers, boolean→mix, date/datetime→ISO strings, reference→valid _id, image→"https://picsum.photos/seed/{name}/400/300", json/repeater→structured objects.
7. Create meaningful relationships between collections.
8. Include variety: different statuses, dates spread over time, varying content lengths.
9. When asked to modify, update ONLY affected collection(s) with the full replacement dataset.
10. After generating, briefly summarize and offer to adjust.`

  return `You are generating realistic seed data for a Nuxt Crouton app. Phase 3: Seed Data.

## App: ${config.name || 'unnamed'} (${config.appType || 'unknown'})${config.description ? ` — ${config.description}` : ''}

## Collection Schemas
${buildCollectionsSchema(collections)}

## Current Seed Data
${buildCurrentSeedData(currentSeedData)}

${rulesSection}

## Tool
\`set_seed_data(collectionName, entries[])\` — call once per collection, only for changed ones on edits.`
}
