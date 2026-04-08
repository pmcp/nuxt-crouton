/**
 * Shared collection-rendering helpers for designer AI system prompts.
 *
 * The various phase prompts (Collection Design / Seed Data / Review) all
 * need to render the user's collections + fields into a compact text
 * representation for the model. They differ in how much detail to include —
 * options below let each caller pick the right level.
 */

import type { CollectionWithFields } from '../composables/useCollectionEditor'

export interface FormatCollectionsOptions {
  /** Include `display` config line per collection (designer phase only) */
  includeDisplay?: boolean
  /** Include `meta` payload per field (designer phase only) */
  includeMeta?: boolean
  /** Include `(id: ...)` suffix per field (designer phase only) */
  includeFieldIds?: boolean
  /** Annotate select-type fields with their `[option1|option2]` list (seed-data phase) */
  includeOptions?: boolean
  /** String shown when the collection list is empty */
  emptyText?: string
}

/**
 * Render a list of collections as an indented text block for an AI system prompt.
 * Field shape: `- name: type → ref [opts] meta: {...} (id: ...)`
 */
export function formatCollectionsForPrompt(
  collections: CollectionWithFields[],
  options: FormatCollectionsOptions = {}
): string {
  if (collections.length === 0) return options.emptyText ?? '  (no collections)'

  return collections.map((col) => {
    const fieldLines = col.fields.map((f) => {
      const ref = f.refTarget ? ` → ${f.refTarget}` : ''
      const optionList = options.includeOptions
        ? ((f.meta as any)?.options?.length
            ? ` [${(f.meta as any).options.join('|')}]`
            : '')
        : ''
      const meta = options.includeMeta && f.meta ? ` meta: ${JSON.stringify(f.meta)}` : ''
      const idSuffix = options.includeFieldIds ? ` (id: ${f.id})` : ''
      return `    - ${f.name}: ${f.type}${ref}${optionList}${meta}${idSuffix}`
    }).join('\n')

    const header = options.includeFieldIds
      ? `  ${col.name} (id: ${col.id}):`
      : `  ${col.name}:`

    if (options.includeDisplay) {
      const displayLine = col.display
        ? `    display: ${JSON.stringify(col.display)}`
        : '    display: (not set)'
      return `${header}\n${displayLine}\n${fieldLines || '    (no fields)'}`
    }

    return `${header}\n${fieldLines || '    (no fields)'}`
  }).join('\n')
}
