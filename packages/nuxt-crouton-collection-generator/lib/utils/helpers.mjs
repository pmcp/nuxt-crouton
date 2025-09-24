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

  return {
    singular: singular.toLowerCase(),
    plural: plural.toLowerCase(),
    pascalCase: singular.charAt(0).toUpperCase() + singular.slice(1),
    pascalCasePlural: plural.charAt(0).toUpperCase() + plural.slice(1),
    camelCase: singular.charAt(0).toLowerCase() + singular.slice(1),
    camelCasePlural: plural.charAt(0).toLowerCase() + plural.slice(1),
    upperCase: singular.toUpperCase(),
    kebabCase: singular.toLowerCase().replace(/[A-Z]/g, '-$&').toLowerCase()
  }
}

export function mapType(t) {
  return ['string', 'text', 'number', 'decimal', 'boolean', 'date', 'json'].includes(t) ? t : 'string'
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
    default: 'new Date()',
    tsType: 'Date'
  },
  json: {
    db: 'JSON',
    drizzle: 'json',
    zod: 'z.object({})',
    default: '{}',
    tsType: 'Record<string, any>'
  }
}