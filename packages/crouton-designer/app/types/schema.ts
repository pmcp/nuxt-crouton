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
  | 'reference'
  | 'image'
  | 'file'

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
  displayAs?: string
  options?: string[]
  optionsCollection?: string
  optionsField?: string
  creatable?: boolean
  dependsOn?: string
  dependsOnCollection?: string
  dependsOnField?: string
  properties?: Record<string, { type: string, required?: boolean, label?: string }>
  translatableProperties?: string[]
}

export interface SchemaField {
  id: string
  name: string
  type: FieldType
  meta: FieldMeta
  refTarget?: string
  refScope?: 'local' | 'adapter'
}

export interface FieldTypeConfig {
  type: FieldType
  label: string
  icon: string
  description: string
  defaultMeta: Partial<FieldMeta>
}

/**
 * App type classification for the designer intake phase
 */
export type AppType =
  | 'saas'
  | 'cms'
  | 'internal-tool'
  | 'marketplace'
  | 'social'
  | 'ecommerce'
  | 'other'

/**
 * Authentication type options
 */
export type AuthType =
  | 'email-password'
  | 'oauth'
  | 'both'

/**
 * Project configuration set during Phase 1 (Intake)
 */
export interface ProjectConfig {
  name: string
  description?: string
  appType?: AppType
  multiTenant?: boolean
  authType?: AuthType
  languages?: string[]
  defaultLocale?: string
  packages?: string[]
}

/**
 * Designer phase identifiers
 */
export type DesignerPhase = 1 | 2 | 5

/**
 * Chat messages stored per phase
 */
export interface PhaseMessages {
  1?: Array<{ id: string, role: 'user' | 'assistant' | 'system', content: string, createdAt?: string }>
  2?: Array<{ id: string, role: 'user' | 'assistant' | 'system', content: string, createdAt?: string }>
}
