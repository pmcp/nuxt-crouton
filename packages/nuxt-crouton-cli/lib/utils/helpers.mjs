// Utility functions for case conversion and type mapping

export function pascal(s) {
  return String(s).replace(/(^|[_\-\s]+)([a-z])/g, (_, __, c) => c.toUpperCase())
}

export function toSnakeCase(str) {
  return str
    .replace(/([A-Z])/g, '_$1')
    .replace(/^_/, '')
    .replace(/-/g, '_')
    .toLowerCase()
}

export function toCase(str) {
  const singular = str.endsWith('s') && str.length > 1 ? str.slice(0, -1) : str
  const plural = str.endsWith('s') ? str : str + 's'

  // Use the pascal() helper to properly convert hyphenated names
  const singularPascal = pascal(singular)
  const pluralPascal = pascal(plural)

  return {
    singular: singular.toLowerCase(),
    plural: plural.toLowerCase(),
    pascalCase: singularPascal,
    pascalCasePlural: pluralPascal,
    camelCase: singularPascal.charAt(0).toLowerCase() + singularPascal.slice(1),
    camelCasePlural: pluralPascal.charAt(0).toLowerCase() + pluralPascal.slice(1),
    upperCase: singular.toUpperCase(),
    kebabCase: singular.toLowerCase().replace(/[A-Z]/g, '-$&').toLowerCase()
  }
}

export function mapType(t) {
  return ['string', 'text', 'number', 'decimal', 'boolean', 'date', 'json', 'repeater', 'array'].includes(t) ? t : 'string'
}

export const typeMapping = {
  string: {
    db: 'VARCHAR(255)',
    drizzle: 'text',
    zod: 'z.string()',
    default: "''",
    tsType: 'string'
  },
  text: {
    db: 'TEXT',
    drizzle: 'text',
    zod: 'z.string()',
    default: "''",
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