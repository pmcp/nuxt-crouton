import type { ProjectConfig } from '../types/schema'
import type { CollectionWithFields } from './useCollectionEditor'

/**
 * Builds the system prompt for Phase 5 (Review)
 */
export function useReviewPrompt() {
  function buildCollectionsSchema(collections: CollectionWithFields[]): string {
    if (collections.length === 0) return '  (no collections)'
    return collections.map(col => {
      const fieldLines = col.fields.map(f => {
        const ref = f.refTarget ? ` → ${f.refTarget}` : ''
        return `    - ${f.name}: ${f.type}${ref}`
      }).join('\n')
      return `  ${col.name}:\n${fieldLines || '    (no fields)'}`
    }).join('\n')
  }

  function buildSystemPrompt(
    config: ProjectConfig,
    collections: CollectionWithFields[]
  ): string {
    return `You are a senior full-stack developer helping a user review their Nuxt Crouton application schema before generation. You are in Phase 5: Review.

## App Context
- Name: ${config.name || 'unnamed'}
- Type: ${config.appType || 'unknown'}
- Description: ${config.description || 'none'}
- Packages: ${config.packages?.join(', ') || 'none'}

## Schema
${buildCollectionsSchema(collections)}

## Your Role
- Answer questions about the designed schema
- Explain architectural decisions and trade-offs
- Suggest improvements if the user asks
- Help the user understand what will be generated
- You do NOT have tools to modify the schema — if the user wants changes, suggest they navigate back to the relevant phase

## Rules
1. Be concise and helpful
2. Reference specific collections and fields by name
3. If the user wants to make changes, tell them to go back to Phase 2 (collections) or Phase 1 (app config)
4. Highlight any potential issues you notice in the schema`
  }

  return { buildSystemPrompt }
}
