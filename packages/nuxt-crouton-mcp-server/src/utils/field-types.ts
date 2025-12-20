/**
 * Field types imported from the generator to stay in sync
 * Source: packages/nuxt-crouton-cli/lib/utils/helpers.mjs
 */

export interface FieldTypeMapping {
  db: string
  drizzle: string
  zod: string
  default: string
  tsType: string
}

export const FIELD_TYPES: Record<string, FieldTypeMapping> = {
  string: {
    db: 'VARCHAR(255)',
    drizzle: 'text',
    zod: 'z.string()',
    default: '\'\'',
    tsType: 'string'
  },
  text: {
    db: 'TEXT',
    drizzle: 'text',
    zod: 'z.string()',
    default: '\'\'',
    tsType: 'string'
  },
  number: {
    db: 'INTEGER',
    drizzle: 'integer',
    zod: 'z.number()',
    default: '0',
    tsType: 'number'
  },
  decimal: {
    db: 'DECIMAL(10,2)',
    drizzle: 'decimal',
    zod: 'z.number()',
    default: '0',
    tsType: 'number'
  },
  boolean: {
    db: 'BOOLEAN',
    drizzle: 'boolean',
    zod: 'z.boolean()',
    default: 'false',
    tsType: 'boolean'
  },
  date: {
    db: 'TIMESTAMP',
    drizzle: 'timestamp',
    zod: 'z.date()',
    default: 'null',
    tsType: 'Date | null'
  },
  json: {
    db: 'JSON',
    drizzle: 'json',
    zod: 'z.record(z.any())',
    default: '{}',
    tsType: 'Record<string, any>'
  },
  repeater: {
    db: 'JSON',
    drizzle: 'json',
    zod: 'z.array(z.any())',
    default: '[]',
    tsType: 'any[]'
  },
  array: {
    db: 'TEXT',
    drizzle: 'text',
    zod: 'z.array(z.string())',
    default: '[]',
    tsType: 'string[]'
  }
}

export const VALID_FIELD_TYPES = Object.keys(FIELD_TYPES)

export function isValidFieldType(type: string): boolean {
  return VALID_FIELD_TYPES.includes(type)
}

export function getFieldTypeReference(): string {
  const lines = ['# Field Types Reference', '']
  lines.push('| Type | Zod Validation | TypeScript | Default |')
  lines.push('|------|----------------|------------|---------|')

  for (const [type, mapping] of Object.entries(FIELD_TYPES)) {
    lines.push(`| ${type} | \`${mapping.zod}\` | \`${mapping.tsType}\` | \`${mapping.default}\` |`)
  }

  lines.push('')
  lines.push('## Usage in Schema')
  lines.push('')
  lines.push('```json')
  lines.push('{')
  lines.push('  "fieldName": {')
  lines.push('    "type": "string",')
  lines.push('    "meta": {')
  lines.push('      "required": true,')
  lines.push('      "maxLength": 255')
  lines.push('    }')
  lines.push('  }')
  lines.push('}')
  lines.push('```')

  return lines.join('\n')
}
