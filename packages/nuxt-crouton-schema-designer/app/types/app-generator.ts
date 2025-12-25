/**
 * Types for the Create App feature
 * Scaffolds a complete Nuxt Crouton app from a designed schema
 */

export interface CreateAppOptions {
  /** Project/folder name */
  projectName: string
  /** Filesystem path to create project in */
  targetPath: string
  /** Collection name from schema designer */
  collectionName: string
  /** Layer name from schema designer */
  layerName: string
  /** Schema fields in export format */
  schema: Record<string, unknown>
  /** Generation options */
  options: {
    /** Run pnpm install after generation */
    installDependencies: boolean
    /** Database dialect */
    dialect: 'sqlite' | 'pg'
    /** Include @friendlyinternet/nuxt-crouton-auth */
    includeAuth: boolean
    /** Include @friendlyinternet/nuxt-crouton-i18n */
    includeI18n: boolean
    /** Enable hierarchy for collection */
    hierarchy?: boolean
    /** Enable sortable for collection */
    sortable?: boolean
    /** Generate seed data */
    seed?: boolean
    /** Number of seed records */
    seedCount?: number
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
  { id: 'schema', label: 'Schema', description: 'Writing schema file...' },
  { id: 'cli', label: 'Generate', description: 'Running crouton generator...' },
  { id: 'dependencies', label: 'Dependencies', description: 'Installing dependencies...' },
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
