/**
 * @crouton-studio
 * Types for the Studio app scanner and artifacts
 */

/**
 * Information about a discovered collection
 */
export interface CollectionInfo {
  /** Collection name (e.g., 'bookings') */
  name: string
  /** Layer name (e.g., 'bookings') */
  layer: string
  /** Full path to collection directory */
  path: string
  /** Fields discovered from types.ts or schema.ts */
  fields: FieldInfo[]
  /** Available components (Form.vue, List.vue) */
  components: string[]
  /** Available composables */
  composables: string[]
  /** API endpoints */
  apiEndpoints: string[]
}

/**
 * Information about a field in a collection
 */
export interface FieldInfo {
  /** Field name */
  name: string
  /** Field type (string, number, boolean, etc.) */
  type: string
  /** Whether the field is required */
  required: boolean
  /** Whether the field is auto-generated (id, createdAt, etc.) */
  auto: boolean
}

/**
 * Information about a discovered component
 */
export interface ComponentInfo {
  /** Component name (e.g., 'TeamsCard') */
  name: string
  /** Full path to component file */
  path: string
  /** Relative path from app root */
  relativePath: string
}

/**
 * Information about a discovered page
 */
export interface PageInfo {
  /** Page title or name */
  name: string
  /** Route path (e.g., '/dashboard') */
  route: string
  /** Full path to page file */
  path: string
}

/**
 * Information about a discovered layer
 */
export interface LayerInfo {
  /** Layer name or package name */
  name: string
  /** Full path to layer */
  path: string
  /** Whether it's a local layer (./layers/...) or package (@fyit/...) */
  isLocal: boolean
  /** Whether it's a Crouton package */
  isCroutonPackage: boolean
}

/**
 * Complete context of the scanned app
 */
export interface AppContext {
  /** App root directory */
  appRoot: string
  /** All layers (local and packages) */
  layers: LayerInfo[]
  /** All discovered collections */
  collections: CollectionInfo[]
  /** App-level components (in app/components/) */
  components: ComponentInfo[]
  /** App-level pages (in app/pages/) */
  pages: PageInfo[]
  /** Scan timestamp */
  scannedAt: Date
}

/**
 * Studio artifact types
 */
export type ArtifactType = 'collection' | 'component' | 'page' | 'composable'

/**
 * Artifact status
 */
export type ArtifactStatus = 'existing' | 'new' | 'modified' | 'pending' | 'written' | 'error'

/**
 * A studio artifact (collection, component, page created/modified via Studio)
 */
export interface StudioArtifact {
  id: string
  sessionId?: string
  type: ArtifactType
  name: string
  path: string
  content?: string
  status: ArtifactStatus
  createdAt: Date
}
