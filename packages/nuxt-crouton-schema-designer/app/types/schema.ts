export type FieldType =
  | 'string'
  | 'text'
  | 'number'
  | 'decimal'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'uuid'
  | 'integer'
  | 'json'
  | 'repeater'
  | 'array'

export interface FieldMeta {
  required?: boolean
  maxLength?: number
  label?: string
  translatable?: boolean
  area?: 'main' | 'sidebar' | 'meta'
  default?: any
  unique?: boolean
  primaryKey?: boolean
  precision?: number
  scale?: number
  group?: string
  component?: string
  readOnly?: boolean
  // Dependent field support - enables cascading selections across collections
  dependsOn?: string           // Parent field name in THIS collection
  dependsOnCollection?: string // Collection to look up options from
  dependsOnField?: string      // Field in that collection with options
  displayAs?: string           // UI variant (e.g., 'slotButtonGroup')
}

export interface SchemaField {
  id: string
  name: string
  type: FieldType
  meta: FieldMeta
  refTarget?: string
}

export interface CollectionOptions {
  hierarchy: boolean
  sortable: boolean
  translatable: boolean
  seed: boolean
  seedCount: number
}

/**
 * CollectionSchema represents a single collection within a multi-collection project.
 * Each collection has its own fields, options, and card template.
 */
export interface CollectionSchema {
  id: string                   // Unique identifier for this collection
  collectionName: string       // Collection name (e.g., 'products', 'orders')
  fields: SchemaField[]
  options: CollectionOptions
  cardTemplate?: string        // Custom Card.vue template code
}

/**
 * SchemaDesignerState - For backwards compatibility with single-collection projects.
 * New projects should use the collections array approach.
 * @deprecated Use CollectionSchema[] with collections field instead
 */
export interface SchemaDesignerState {
  collectionName: string
  layerName: string
  fields: SchemaField[]
  options: CollectionOptions
  cardTemplate?: string  // Custom Card.vue template code for list/grid/cards layouts
}

/**
 * MultiCollectionState - The new state structure for multi-collection projects.
 * Used internally by useSchemaDesigner composable.
 */
export interface MultiCollectionState {
  layerName: string
  collections: CollectionSchema[]
  activeCollectionId: string | null
}

export interface FieldTypeConfig {
  type: FieldType
  label: string
  icon: string
  description: string
  defaultMeta: Partial<FieldMeta>
}