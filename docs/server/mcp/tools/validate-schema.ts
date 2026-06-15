import { z } from 'zod'

const VALID_FIELD_TYPES = ['string', 'text', 'number', 'decimal', 'boolean', 'date', 'json', 'repeater', 'array']

export default defineMcpTool({
  name: 'validate_schema',
  description: 'Validate a Crouton collection schema. Returns validation errors if any, or confirms the schema is valid.',
  inputSchema: {
    schema: z.string().describe('JSON string of the schema to validate')
  },
  async handler({ schema }) {
    const errors: string[] = []
    const warnings: string[] = []

    // Parse JSON
    let parsedSchema: Record<string, any>
    try {
      parsedSchema = JSON.parse(schema)
    } catch {
      return {
        content: [{
          type: 'text' as const,
          text: `❌ **Invalid JSON**: Could not parse the schema. Please ensure it's valid JSON.\n\nError: Invalid JSON syntax`
        }]
      }
    }

    // Check if it's an object
    if (typeof parsedSchema !== 'object' || Array.isArray(parsedSchema)) {
      return {
        content: [{
          type: 'text' as const,
          text: '❌ **Invalid Schema**: Schema must be an object with field definitions.'
        }]
      }
    }

    // Validate each field
    for (const [fieldName, fieldDef] of Object.entries(parsedSchema)) {
      // Check field name
      if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(fieldName)) {
        errors.push(`Field "${fieldName}": Name must start with a letter and contain only alphanumeric characters`)
      }

      // Check field definition is an object
      if (typeof fieldDef !== 'object' || fieldDef === null) {
        errors.push(`Field "${fieldName}": Definition must be an object`)
        continue
      }

      const def = fieldDef as Record<string, any>

      // Check type is present and valid
      if (!def.type) {
        errors.push(`Field "${fieldName}": Missing required "type" property`)
      } else if (!VALID_FIELD_TYPES.includes(def.type)) {
        errors.push(`Field "${fieldName}": Invalid type "${def.type}". Valid types: ${VALID_FIELD_TYPES.join(', ')}`)
      }

      // Check repeater has children
      if (def.type === 'repeater' && !def.children) {
        warnings.push(`Field "${fieldName}": Repeater fields should have a "children" property defining nested fields`)
      }

      // Check refTarget is a string
      if (def.refTarget && typeof def.refTarget !== 'string') {
        errors.push(`Field "${fieldName}": refTarget must be a string (collection name)`)
      }

      // Check meta is an object if present
      if (def.meta !== undefined && (typeof def.meta !== 'object' || def.meta === null)) {
        errors.push(`Field "${fieldName}": "meta" must be an object`)
      }

      // Check decimal precision/scale
      if (def.type === 'decimal' && def.meta) {
        if (def.meta.precision !== undefined && typeof def.meta.precision !== 'number') {
          errors.push(`Field "${fieldName}": precision must be a number`)
        }
        if (def.meta.scale !== undefined && typeof def.meta.scale !== 'number') {
          errors.push(`Field "${fieldName}": scale must be a number`)
        }
      }
    }

    // Generate response
    if (errors.length === 0 && warnings.length === 0) {
      return {
        content: [{
          type: 'text' as const,
          text: `✅ **Schema is valid!**

**Fields defined**: ${Object.keys(parsedSchema).length}

Fields:
${Object.entries(parsedSchema).map(([name, def]) => {
  const d = def as Record<string, any>
  return `- \`${name}\`: ${d.type}${d.refTarget ? ` → ${d.refTarget}` : ''}${d.meta?.required ? ' (required)' : ''}`
}).join('\n')}

The schema is ready for generation with:
\`\`\`bash
crouton <layer> <collection> --fields-file=schema.json
\`\`\``
        }]
      }
    }

    let response = ''
    if (errors.length > 0) {
      response += `❌ **Validation Errors** (${errors.length}):\n\n${errors.map(e => `- ${e}`).join('\n')}\n\n`
    }
    if (warnings.length > 0) {
      response += `⚠️ **Warnings** (${warnings.length}):\n\n${warnings.map(w => `- ${w}`).join('\n')}\n\n`
    }

    response += `\n**Reference**: Use \`crouton://field-types\` resource for valid types and meta options.`

    return {
      content: [{
        type: 'text' as const,
        text: response
      }]
    }
  }
})
