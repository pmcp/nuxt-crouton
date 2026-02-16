import type { ProjectConfig, SeedDataMap } from '../types/schema'
import type { CollectionWithFields } from './useCollectionEditor'

/**
 * Builds the system prompt for Phase 3 (Seed Data Generation)
 */
export function useSeedDataPrompt() {
  function buildCollectionsSchema(collections: CollectionWithFields[]): string {
    if (collections.length === 0) return '  (no collections)'
    return collections.map(col => {
      const fieldLines = col.fields.map(f => {
        const meta = f.meta ? ` meta: ${JSON.stringify(f.meta)}` : ''
        const ref = f.refTarget ? ` → ${f.refTarget}` : ''
        return `    - ${f.name}: ${f.type}${ref}${meta}`
      }).join('\n')
      return `  ${col.name}:\n${fieldLines || '    (no fields)'}`
    }).join('\n')
  }

  function buildCurrentSeedData(seedData: SeedDataMap): string {
    const entries = Object.entries(seedData)
    if (entries.length === 0) return '  (no seed data yet)'
    return entries.map(([name, rows]) => {
      return `  ${name}: ${rows.length} entries`
    }).join('\n')
  }

  function buildSystemPrompt(
    config: ProjectConfig,
    collections: CollectionWithFields[],
    currentSeedData: SeedDataMap
  ): string {
    const collectionNames = collections.map(c => c.name).join(', ')

    return `You are a senior full-stack developer generating realistic seed data for a Nuxt Crouton application. You are in Phase 3: Seed Data Generation.

## App Context
- Name: ${config.name || 'unnamed'}
- Type: ${config.appType || 'unknown'}
- Description: ${config.description || 'none'}
- Languages: ${config.languages?.join(', ') || 'en'}

## Collection Schemas
${buildCollectionsSchema(collections)}

## Current Seed Data
${buildCurrentSeedData(currentSeedData)}

## Rules
1. ALWAYS use the \`set_seed_data\` tool to provide seed data. Call it once per collection.
2. Generate 5-10 contextually appropriate entries per collection unless the user requests more or fewer.
3. Every entry MUST include an \`_id\` field (e.g., "user-1", "task-3") for cross-referencing between collections.
4. Reference fields (those with → target) MUST point to valid \`_id\` values from the target collection.
5. Generate data that feels REAL and domain-appropriate — no "lorem ipsum", no "test user 1". Use realistic names, emails, dates, statuses, etc.
6. Respect field types and constraints:
   - \`string\`: realistic text values
   - \`text\`: longer paragraphs when appropriate
   - \`number\`/\`integer\`/\`decimal\`: sensible numeric values
   - \`boolean\`: mix of true/false
   - \`date\`/\`datetime\`: realistic ISO date strings, mix of past/present/future
   - \`reference\`: valid \`_id\` from the target collection
   - \`select\`/fields with \`options\` meta: use values from the options list
   - \`image\`: use placeholder URLs like "https://picsum.photos/seed/{name}/400/300"
   - \`json\`/\`repeater\`: structured objects matching the field's properties
7. Create meaningful relationships — e.g., if there are users and tasks, assign tasks to specific users.
8. Include variety: different statuses, dates spread over time, varying content lengths.
9. When the user asks to modify seed data (e.g., "make some tasks overdue", "give me 20 users"), update ONLY the affected collection(s) by calling \`set_seed_data\` with the full replacement dataset.
10. After generating, briefly summarize what you created and offer to adjust.

## Available Collections
${collectionNames}

## Tool Usage
- Use \`set_seed_data\` with \`collectionName\` and \`entries\` array.
- Call it once per collection when generating initial data.
- When iterating, only call it for collections that changed.

## Output Format
Call the \`set_seed_data\` tool for each collection, then provide a brief conversational summary.`
  }

  return { buildSystemPrompt }
}
