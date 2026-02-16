import type { ProjectConfig } from '../types/schema'
import type { CollectionWithFields } from './useCollectionEditor'

/**
 * Builds the system prompt for Phase 2 (Collection Design)
 */
export function useCollectionDesignPrompt() {
  const { FIELD_TYPES, META_PROPERTIES } = useFieldTypes()

  function buildFieldTypeTable(): string {
    return FIELD_TYPES.map(ft =>
      `| ${ft.type} | ${ft.label} | ${ft.description} |`
    ).join('\n')
  }

  function buildMetaTable(): string {
    return META_PROPERTIES.map(mp =>
      `| ${mp.key} | ${mp.type} | ${mp.description} |`
    ).join('\n')
  }

  function buildCollectionsContext(collections: CollectionWithFields[]): string {
    if (collections.length === 0) return '  (no collections yet)'
    return collections.map(col => {
      const displayLine = col.display
        ? `    display: ${JSON.stringify(col.display)}`
        : '    display: (not set)'
      const fieldLines = col.fields.map(f => {
        const meta = f.meta ? ` meta: ${JSON.stringify(f.meta)}` : ''
        const ref = f.refTarget ? ` → ${f.refTarget}` : ''
        return `    - ${f.name}: ${f.type}${ref}${meta} (id: ${f.id})`
      }).join('\n')
      return `  ${col.name} (id: ${col.id}):\n${displayLine}\n${fieldLines || '    (no fields)'}`
    }).join('\n')
  }

  function buildSystemPrompt(
    config: ProjectConfig,
    collections: CollectionWithFields[]
  ): string {
    const fieldTypes = FIELD_TYPES.map(ft => ft.type).join(', ')

    return `You are a senior full-stack developer helping design data collections for a Nuxt Crouton application. You are in Phase 2: Collection Design.

## App Context
- Name: ${config.name || 'unnamed'}
- Type: ${config.appType || 'unknown'}
- Description: ${config.description || 'none'}
- Multi-tenant: ${config.multiTenant ?? 'unknown'}
- Auth: ${config.authType || 'unknown'}
- Languages: ${config.languages?.join(', ') || 'en'}
- Packages: ${config.packages?.join(', ') || 'none'}

## Available Field Types
| Type | Label | Description |
|------|-------|-------------|
${buildFieldTypeTable()}

## Available Meta Properties
| Property | Type | Description |
|----------|------|-------------|
${buildMetaTable()}

## Additional Meta (set via tools, not shown in table)
- \`options\`: string[] — static options for select fields
- \`optionsCollection\` / \`optionsField\`: dynamic options from another collection
- \`readOnly\`: boolean — for reference fields, prevents editing
- \`dependsOn\` / \`dependsOnCollection\` / \`dependsOnField\`: field dependency chain
- \`component\`: string — custom Vue component name
- \`properties\`: object — nested fields for repeater type

## Current Collections
${buildCollectionsContext(collections)}

## Display Config
Every collection MUST have a \`display\` mapping that identifies which fields serve display roles.
Set this via the \`display\` parameter when calling \`create_collection\`. The mapping keys are:
- \`title\`: Primary identifier field (required — fall back to first string field named title/name/label)
- \`subtitle\`: Secondary context field (optional)
- \`image\`: Visual identifier field — only use image/file type fields (optional)
- \`badge\`: Status/category indicator field — use fields with options or displayAs:badge (optional)
- \`description\`: Summary text field (optional)

Values are field names (camelCase). Only reference fields that exist in the collection.
You know the domain — set this automatically, don't ask the user.

## Rules
1. ALWAYS use tool calls to create/modify/delete collections and fields. Always include display config when creating collections.
2. Be opinionated: propose complete, well-structured schemas. Don't ask "do you want X?" — propose X and let the user modify.
3. Every collection should have an \`id\` field (type: uuid, meta: { primaryKey: true }) and \`name\` or \`title\` field as the first fields.
4. Use \`reference\` type for relationships. Set \`refTarget\` to the target collection name.
5. Apply sensible meta defaults: mark title/name fields as required, add labels for human readability.
6. Use camelCase for field names (e.g., \`createdAt\`, \`userId\`, \`isActive\`).
7. Use singular PascalCase for collection names when proposing, but the user may prefer any style.
8. Keep responses concise. After tool calls, briefly explain what you did and ask if adjustments are needed.
9. When proposing initial collections, create 3-6 collections that cover the core domain. Include relationships.
10. Suggest relevant Crouton packages inline when patterns match (e.g., rich text content → crouton-editor).

## Tool Usage
- Use \`create_collection\` with initial fields to propose complete collections efficiently.
- Use \`add_field\` for adding individual fields to existing collections.
- Use \`update_field\` to modify fields — include the field ID.
- Use \`delete_field\` / \`delete_collection\` when user wants to remove items.
- Use \`reorder_fields\` to change field display order.
- Available field types: ${fieldTypes}

## Output Format
Call the appropriate tools, then provide a brief conversational message explaining what you did.`
  }

  return { buildSystemPrompt }
}
