/**
 * Design Schema Tool
 * Provides field type reference and schema templates for AI-assisted schema design
 */

import { z } from 'zod'
import { FIELD_TYPES, getFieldTypeReference } from '../utils/field-types.js'
import { scanLayers } from '../utils/fs.js'

export interface DesignSchemaInput {
  collectionName: string
  description: string
  layer?: string
}

export interface DesignSchemaResult {
  collectionName: string
  suggestedLayer: string
  fieldTypes: typeof FIELD_TYPES
  schemaTemplate: Record<string, unknown>
  instructions: string
  fieldTypeReference: string
}

const DEFAULT_LAYER = 'core'

/**
 * Suggest a layer for a new collection by scanning the real `layers/`
 * directory of the current project.
 *
 * Strategy (in priority order):
 * 1. If any existing layer already contains a collection with the requested
 *    name → reuse that layer (treats the call as a regenerate/edit case).
 * 2. Otherwise, return the first non-`core` layer alphabetically — apps
 *    typically have a domain layer like `shop` or `blog` and that's a more
 *    useful default than dumping everything in `core`.
 * 3. Fall back to `core` when no layers exist.
 */
async function suggestLayerForCollection(
  collectionName: string,
  projectRoot: string
): Promise<string> {
  let layers
  try {
    layers = await scanLayers(projectRoot)
  } catch {
    return DEFAULT_LAYER
  }

  if (layers.length === 0) {
    return DEFAULT_LAYER
  }

  const existing = layers.find(l => l.collections.includes(collectionName))
  if (existing) {
    return existing.name
  }

  const sorted = [...layers].sort((a, b) => a.name.localeCompare(b.name))
  const nonCore = sorted.find(l => l.name !== DEFAULT_LAYER)
  return (nonCore ?? sorted[0]!).name
}

/**
 * Generate a base schema template
 */
function generateSchemaTemplate(): Record<string, unknown> {
  return {
    id: {
      type: 'string',
      meta: {
        primaryKey: true
      }
    }
  }
}

/**
 * Handle design_schema tool call
 */
export async function handleDesignSchema(input: DesignSchemaInput): Promise<DesignSchemaResult> {
  const { collectionName, description, layer } = input

  const suggestedLayer = layer || await suggestLayerForCollection(collectionName, process.cwd())

  const instructions = `Based on the description "${description}", design a schema for the "${collectionName}" collection.

## Guidelines

1. **Field Types**: Use appropriate types from the reference below
2. **Auto-Generated Fields**: Do NOT include id, teamId, createdAt, updatedAt, createdBy, or updatedBy — these are added automatically
3. **Required Fields**: Add "meta.required: true" for mandatory fields
4. **String Constraints**: Add "meta.maxLength" for string fields
5. **Decimal Precision**: Use "meta.precision" and "meta.scale" for prices/currency
6. **Relationships**: Use refTarget to reference other collections

## Common Patterns

- **Names/Titles**: \`{ type: "string", meta: { required: true, maxLength: 255 } }\`
- **Descriptions**: \`{ type: "text", meta: { component: "EditorSimple" } }\`
- **Prices**: \`{ type: "decimal", meta: { precision: 10, scale: 2, required: true } }\`
- **Flags**: \`{ type: "boolean", meta: { default: false } }\`
- **References**: \`{ type: "string", refTarget: "otherCollection" }\`
- **JSON Data**: \`{ type: "json" }\` or \`{ type: "repeater" }\` for arrays

## Auto-Generated Fields

The generator automatically adds:
- id (primary key)
- teamId (team association)
- createdAt, updatedAt (timestamps)
- createdBy, updatedBy (user tracking)

Do NOT include these in your schema.`

  return {
    collectionName,
    suggestedLayer,
    fieldTypes: FIELD_TYPES,
    schemaTemplate: generateSchemaTemplate(),
    instructions,
    fieldTypeReference: getFieldTypeReference()
  }
}

export const designSchemaInputSchema = {
  collectionName: z.string().describe('Name of the collection (singular, e.g., \'product\', \'order\')'),
  description: z.string().describe('Natural language description of what the collection should contain'),
  layer: z.string().optional().describe('Target layer name (optional - will be inferred if not provided)')
}

export const designSchemaToolDefinition = {
  name: 'design_schema',
  description: `Design a collection schema from a natural language description.
Returns field type reference and guidelines for creating a schema.
Use this FIRST before validate_schema and generate_collection.`
}
