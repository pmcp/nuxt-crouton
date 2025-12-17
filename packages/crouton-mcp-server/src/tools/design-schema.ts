/**
 * Design Schema Tool
 * Provides field type reference and schema templates for AI-assisted schema design
 */

import { z } from 'zod'
import { FIELD_TYPES, getFieldTypeReference } from '../utils/field-types.js'

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

/**
 * Infer a layer name from a collection name
 */
function inferLayerFromName(collectionName: string): string {
  const layerMappings: Record<string, string[]> = {
    shop: ['product', 'order', 'cart', 'payment', 'customer', 'inventory'],
    blog: ['post', 'article', 'comment', 'author', 'category', 'tag'],
    auth: ['user', 'role', 'permission', 'session', 'token'],
    cms: ['page', 'content', 'media', 'template', 'block'],
    crm: ['contact', 'lead', 'deal', 'company', 'activity']
  }

  const lowerName = collectionName.toLowerCase()

  for (const [layer, keywords] of Object.entries(layerMappings)) {
    if (keywords.some(kw => lowerName.includes(kw))) {
      return layer
    }
  }

  return 'core'
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
export function handleDesignSchema(input: DesignSchemaInput): DesignSchemaResult {
  const { collectionName, description, layer } = input

  const suggestedLayer = layer || inferLayerFromName(collectionName)

  const instructions = `Based on the description "${description}", design a schema for the "${collectionName}" collection.

## Guidelines

1. **Field Types**: Use appropriate types from the reference below
2. **Primary Key**: The 'id' field is always auto-generated with primaryKey: true
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
  collectionName: z.string().describe("Name of the collection (singular, e.g., 'product', 'order')"),
  description: z.string().describe('Natural language description of what the collection should contain'),
  layer: z.string().optional().describe('Target layer name (optional - will be inferred if not provided)')
}

export const designSchemaToolDefinition = {
  name: 'design_schema',
  description: `Design a collection schema from a natural language description.
Returns field type reference and guidelines for creating a schema.
Use this FIRST before validate_schema and generate_collection.`
}
