/**
 * Types for the Create App feature
 * Scaffolds a complete Nuxt Crouton app from a designed schema
 */

/**
 * Configuration for a single collection in the app
 */
export interface CollectionConfig {
  /** Collection name (e.g., 'products', 'orders') */
  name: string
  /** Schema fields in export format */
  schema: Record<string, unknown>
  /** Enable hierarchy for this collection */
  hierarchy?: boolean
  /** Enable sortable for this collection */
  sortable?: boolean
  /** Generate seed data for this collection */
  seed?: boolean
  /** Number of seed records for this collection */
  seedCount?: number
}

/**
 * Configuration for a package to include in the app
 */
export interface PackageConfig {
  /** Package ID from manifest (e.g., 'crouton-bookings') */
  packageId: string
  /** Layer name for this package */
  layerName: string
  /** Package-specific configuration */
  config: Record<string, unknown>
  /** NPM package name if published */
  npmPackage?: string
}

export interface CreateAppOptions {
  /** Project/folder name */
  projectName: string
  /** Filesystem path to create project in */
  targetPath: string
  /** Layer name from schema designer */
  layerName: string
  /** Collections to generate (multi-collection support) */
  collections: CollectionConfig[]
  /** Packages to include */
  packages?: PackageConfig[]
  /** Generation options */
  options: {
    /** Database dialect */
    dialect: 'sqlite' | 'pg'
    /** Include @fyit/crouton-auth */
    includeAuth: boolean
    /** Include @fyit/crouton-i18n */
    includeI18n: boolean
  }
}

export interface GenerationStep {
  id: string
  label: string
  description: string
}

export const GENERATION_STEPS: GenerationStep[] = [
  { id: 'init', label: 'Initialize', description: 'Creating project directory...' },
  { id: 'templates', label: 'Templates', description: 'Generating configuration files...' },
  { id: 'dependencies', label: 'Dependencies', description: 'Installing dependencies...' },
  { id: 'cli', label: 'Generate', description: 'Running crouton generator...' },
  { id: 'complete', label: 'Complete', description: 'Project ready!' }
]

export interface GenerationProgress {
  /** Current step ID */
  step: string
  /** Human-readable message */
  message: string
  /** Progress percentage 0-100 */
  progress: number
  /** Error message if failed */
  error?: string
  /** CLI output (for cli step) */
  output?: string
}

export interface CreateAppResult {
  /** Whether generation succeeded */
  success: boolean
  /** Full path to created project */
  projectPath: string
  /** Error messages */
  errors: string[]
  /** Warning messages */
  warnings: string[]
  /** List of files created */
  filesCreated: string[]
}

export interface FileTemplate {
  /** Relative path within project */
  path: string
  /** File content */
  content: string
}

/**
 * Browser support for File System Access API
 */
export interface FileSystemSupport {
  /** showDirectoryPicker is available */
  hasNativePicker: boolean
  /** Can write files via FileSystemWritableFileStream */
  canWriteFiles: boolean
}
