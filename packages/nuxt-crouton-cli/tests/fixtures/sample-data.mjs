/**
 * Sample test data for CLI generator tests
 *
 * These fixtures provide consistent test data for:
 * - Field definitions
 * - Generator data objects
 * - Config objects
 */

// ============ Field Definitions ============

/**
 * Basic field definitions for a simple collection
 */
export const basicFields = [
  { name: 'name', type: 'string', meta: { required: true, maxLength: 255 } },
  { name: 'description', type: 'text', meta: {} },
  { name: 'price', type: 'decimal', meta: { precision: 10, scale: 2 } },
  { name: 'active', type: 'boolean', meta: {} }
]

/**
 * Complex field definitions with all field types
 */
export const allTypesFields = [
  { name: 'title', type: 'string', meta: { required: true } },
  { name: 'content', type: 'text', meta: {} },
  { name: 'count', type: 'number', meta: {} },
  { name: 'price', type: 'decimal', meta: {} },
  { name: 'enabled', type: 'boolean', meta: {} },
  { name: 'publishedAt', type: 'date', meta: {} },
  { name: 'metadata', type: 'json', meta: {} },
  { name: 'items', type: 'repeater', meta: {} },
  { name: 'tags', type: 'array', meta: {} }
]

/**
 * Fields with references
 */
export const fieldsWithRefs = [
  { name: 'name', type: 'string', meta: { required: true } },
  { name: 'categoryId', type: 'string', refTarget: 'categories', meta: {} }
]

/**
 * Fields for seed generator testing
 */
export const seedTestFields = [
  { name: 'email', type: 'string' },
  { name: 'fullName', type: 'string' },
  { name: 'firstName', type: 'string' },
  { name: 'lastName', type: 'string' },
  { name: 'title', type: 'string' },
  { name: 'description', type: 'text' },
  { name: 'phone', type: 'string' },
  { name: 'website', type: 'string' },
  { name: 'price', type: 'decimal' },
  { name: 'quantity', type: 'number' },
  { name: 'address', type: 'string' },
  { name: 'city', type: 'string' },
  { name: 'status', type: 'string' },
  { name: 'unknownField', type: 'string' },
  { name: 'isActive', type: 'boolean' },
  { name: 'createdAt', type: 'date' },
  { name: 'settings', type: 'json' }
]

// ============ Generator Data Objects ============

/**
 * Minimal data object for generateTypes()
 */
export const basicTypesData = {
  singular: 'product',
  plural: 'products',
  pascalCase: 'Product',
  pascalCasePlural: 'Products',
  layer: 'shop',
  layerPascalCase: 'Shop',
  fields: basicFields,
  fieldsTypes: `name: string
  description: string
  price: number
  active: boolean`
}

/**
 * Minimal data object for generateComposable()
 */
export const basicComposableData = {
  singular: 'product',
  plural: 'products',
  pascalCase: 'Product',
  pascalCasePlural: 'Products',
  layer: 'shop',
  layerPascalCase: 'Shop',
  fields: basicFields,
  fieldsSchema: `name: z.string().max(255),
    description: z.string().optional(),
    price: z.number().optional(),
    active: z.boolean().optional()`,
  fieldsColumns: `{ key: 'name', label: 'Name' },
  { key: 'price', label: 'Price' },
  { key: 'active', label: 'Active' }`,
  fieldsDefault: `name: '',
    description: '',
    price: 0,
    active: false`,
  hierarchy: null,
  sortable: null
}

/**
 * Data object with hierarchy enabled
 */
export const hierarchyData = {
  ...basicComposableData,
  singular: 'category',
  plural: 'categories',
  pascalCase: 'Category',
  pascalCasePlural: 'Categories',
  hierarchy: {
    enabled: true,
    parentField: 'parentId',
    pathField: 'path',
    depthField: 'depth',
    orderField: 'order'
  }
}

/**
 * Data object with sortable enabled
 */
export const sortableData = {
  ...basicComposableData,
  singular: 'tag',
  plural: 'tags',
  pascalCase: 'Tag',
  pascalCasePlural: 'Tags',
  sortable: {
    enabled: true,
    orderField: 'order'
  }
}

/**
 * Data object with dependent fields (repeater)
 */
export const dependentFieldsData = {
  ...basicComposableData,
  fields: [
    { name: 'name', type: 'string', meta: { required: true } },
    { name: 'items', type: 'repeater', meta: { repeaterComponent: 'ItemEditor' } }
  ]
}

// ============ Config Objects ============

/**
 * Minimal config object
 */
export const minimalConfig = {
  flags: {
    useMetadata: true
  }
}

/**
 * Config with translations
 */
export const translationsConfig = {
  flags: {
    useMetadata: true
  },
  translations: {
    collections: {
      products: ['name', 'description']
    }
  }
}

/**
 * Config without metadata
 */
export const noMetadataConfig = {
  flags: {
    useMetadata: false
  }
}
