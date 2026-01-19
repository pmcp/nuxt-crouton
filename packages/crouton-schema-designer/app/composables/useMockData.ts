import { faker } from '@faker-js/faker'
import type { SchemaField } from '../types/schema'

export function useMockData() {
  /**
   * Generate mock value for a field based on name heuristics and type
   * Ported from packages/nuxt-crouton-cli/lib/utils/helpers.mjs
   */
  function generateValue(field: SchemaField): any {
    const n = field.name.toLowerCase()

    // Name-based heuristics (more specific patterns first)
    if (n.includes('email')) return faker.internet.email()
    if (n === 'name' || n === 'fullname' || n === 'full_name') return faker.person.fullName()
    if (n === 'firstname' || n === 'first_name') return faker.person.firstName()
    if (n === 'lastname' || n === 'last_name') return faker.person.lastName()
    if (n === 'title') return faker.lorem.sentence({ min: 3, max: 6 })
    if (n === 'description' || n === 'bio' || n === 'content' || n === 'summary') {
      return faker.lorem.paragraph()
    }
    if (n.includes('phone')) return faker.phone.number()
    if (n.includes('url') || n.includes('website') || n.includes('link')) {
      return 'https://example.com'
    }
    if (n === 'slug') return faker.helpers.slugify(faker.lorem.words(3)).toLowerCase()
    if (n.includes('price') || n.includes('amount') || n.includes('cost') || n.includes('total')) {
      return faker.number.float({ min: 1, max: 1000, fractionDigits: 2 })
    }
    if (n.includes('quantity') || n.includes('count') || n.includes('stock')) {
      return faker.number.int({ min: 0, max: 100 })
    }
    if (n.includes('address')) return faker.location.streetAddress()
    if (n === 'city') return faker.location.city()
    if (n === 'country') return faker.location.country()
    if (n === 'state' || n === 'province') return faker.location.state()
    if (n.includes('zip') || n.includes('postal')) return faker.location.zipCode()
    if (n === 'status') {
      return faker.helpers.arrayElement(['active', 'inactive', 'pending'])
    }
    if (n === 'type' || n === 'category') {
      return faker.helpers.arrayElement(['type_a', 'type_b', 'type_c'])
    }
    if (n.includes('image') || n.includes('avatar') || n.includes('photo')) {
      return faker.image.url({ width: 200, height: 200 })
    }
    if (n.includes('color')) return faker.color.rgb()
    if (n.includes('company')) return faker.company.name()
    if (n.includes('username')) return faker.internet.username()

    // Type-based fallbacks
    switch (field.type) {
      case 'string':
        return faker.lorem.words({ min: 1, max: 3 })
      case 'text':
        return faker.lorem.paragraph()
      case 'number':
      case 'integer':
        return faker.number.int({ min: 0, max: 100 })
      case 'decimal':
        return faker.number.float({
          min: 0,
          max: 1000,
          fractionDigits: field.meta.scale || 2
        })
      case 'boolean':
        return faker.datatype.boolean()
      case 'date':
      case 'datetime':
        return faker.date.recent()
      case 'uuid':
        return faker.string.uuid()
      case 'json':
        return {}
      case 'array':
        return []
      case 'repeater':
        return []
      default:
        return ''
    }
  }

  /**
   * Generate mock rows from schema fields
   */
  function generateMockRows(fields: SchemaField[], count: number = 5): Record<string, any>[] {
    return Array.from({ length: count }, (_, i) => {
      const row: Record<string, any> = {
        id: faker.string.uuid()
      }

      for (const field of fields) {
        if (field.name) {
          row[field.name] = generateValue(field)
        }
      }

      // Add metadata fields
      row.createdAt = faker.date.recent({ days: 30 })
      row.updatedAt = faker.date.recent({ days: 7 })

      return row
    })
  }

  /**
   * Generate columns configuration from fields
   */
  function generateColumns(fields: SchemaField[]) {
    return fields
      .filter(f => f.name)
      .map(field => ({
        id: field.name,
        accessorKey: field.name,
        header: field.meta.label || field.name
      }))
  }

  return {
    generateValue,
    generateMockRows,
    generateColumns
  }
}
