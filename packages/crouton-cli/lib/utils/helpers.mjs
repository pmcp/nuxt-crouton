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

// Convert camelCase or PascalCase to kebab-case
// e.g., emailTemplates -> email-templates, EmailTemplates -> email-templates
export function toKebabCase(str) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
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
  return ['string', 'text', 'number', 'decimal', 'boolean', 'date', 'json', 'repeater', 'array', 'image', 'file'].includes(t) ? t : 'string'
}

/**
 * Get the drizzle-seed generator for a field based on name and type
 * @param {object} field - Field object with name and type properties
 * @returns {string} - drizzle-seed generator expression
 */
export function getSeedGenerator(field) {
  const { name, type } = field
  const n = name.toLowerCase()

  // Name-based heuristics (more specific patterns first)
  if (n.includes('email')) return 'f.email()'
  if (n === 'name' || n === 'fullname' || n === 'full_name') return 'f.fullName()'
  if (n === 'firstname' || n === 'first_name') return 'f.firstName()'
  if (n === 'lastname' || n === 'last_name') return 'f.lastName()'
  if (n === 'title') return 'f.loremIpsum({ sentencesCount: 1 })'
  if (n === 'description' || n === 'bio' || n === 'content' || n === 'summary') return 'f.loremIpsum({ sentencesCount: 3 })'
  if (n.includes('phone')) return 'f.phoneNumber()'
  if (n.includes('url') || n.includes('website') || n.includes('link')) return 'f.valuesFromArray({ values: ["https://example.com"] })'
  if (n === 'slug') return 'f.loremIpsum({ sentencesCount: 1 })'
  if (n.includes('price') || n.includes('amount') || n.includes('cost') || n.includes('total')) return 'f.number({ minValue: 1, maxValue: 1000, precision: 100 })'
  if (n.includes('quantity') || n.includes('count') || n.includes('stock')) return 'f.int({ minValue: 0, maxValue: 100 })'
  if (n.includes('address')) return 'f.streetAddress()'
  if (n === 'city') return 'f.city()'
  if (n === 'country') return 'f.country()'
  if (n === 'state' || n === 'province') return 'f.state()'
  if (n.includes('zip') || n.includes('postal')) return 'f.postcode()'
  if (n === 'status') return 'f.valuesFromArray({ values: ["active", "inactive", "pending"] })'
  if (n === 'type' || n === 'category') return 'f.valuesFromArray({ values: ["type_a", "type_b", "type_c"] })'

  // Type-based fallbacks
  const typeMap = {
    string: 'f.loremIpsum({ sentencesCount: 1 })',
    text: 'f.loremIpsum({ sentencesCount: 3 })',
    number: 'f.int({ minValue: 0, maxValue: 100 })',
    decimal: 'f.number({ minValue: 0, maxValue: 1000, precision: 100 })',
    boolean: 'f.weightedRandom([{ value: true, weight: 0.5 }, { value: false, weight: 0.5 }])',
    date: 'f.date({ minDate: "2020-01-01", maxDate: "2025-12-31" })',
    json: 'f.valuesFromArray({ values: [{}] })',
    repeater: 'f.valuesFromArray({ values: [[]] })',
    array: 'f.valuesFromArray({ values: [[]] })'
  }

  return typeMap[type] || 'f.loremIpsum({ sentencesCount: 1 })'
}

export const typeMapping = {
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
    zod: 'z.record(z.string(), z.any())',
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
  },
  image: {
    db: 'VARCHAR(255)',
    drizzle: 'text',
    zod: 'z.string()',
    default: '\'\'',
    tsType: 'string'
  },
  file: {
    db: 'VARCHAR(255)',
    drizzle: 'text',
    zod: 'z.string()',
    default: '\'\'',
    tsType: 'string'
  }
}
