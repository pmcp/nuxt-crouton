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

export interface SchemaDesignerState {
  collectionName: string
  layerName: string
  fields: SchemaField[]
  options: CollectionOptions
  cardTemplate?: string  // Custom Card.vue template code for list/grid/cards layouts
}

export interface FieldTypeConfig {
  type: FieldType
  label: string
  icon: string
  description: string
  defaultMeta: Partial<FieldMeta>
}