import { ref, computed } from 'vue'
import type {
  CreateAppOptions,
  CollectionConfig,
  GenerationProgress,
  CreateAppResult,
  FileTemplate,
  FileSystemSupport
} from '../types/app-generator'

/**
 * useAppGenerator - Orchestrates creating a new Nuxt Crouton app
 *
 * Uses File System Access API for native folder picking (Chrome/Edge)
 * with fallback to manual path input for other browsers.
 */
export function useAppGenerator() {
  // State
  const directoryHandle = ref<FileSystemDirectoryHandle | null>(null)
  const targetPath = ref('')
  const projectName = ref('')
  const isGenerating = ref(false)
  const currentStep = ref('')
  const progress = ref<GenerationProgress>({
    step: '',
    message: '',
    progress: 0
  })
  const error = ref<string | null>(null)
  const result = ref<CreateAppResult | null>(null)

  /**
   * Check browser support for File System Access API
   */
  const support = computed<FileSystemSupport>(() => ({
    hasNativePicker: typeof window !== 'undefined' && 'showDirectoryPicker' in window,
    canWriteFiles: typeof window !== 'undefined' && 'FileSystemWritableFileStream' in window
  }))

  // Track if folder was selected via native picker
  const folderSelected = ref(false)
  const selectedFolderName = ref('')

  /**
   * Select a folder using native file picker
   * Returns the folder name (not full path - API limitation)
   *
   * NOTE: The File System Access API does NOT provide the full filesystem path.
   * We get a handle for writing files, but the user must still enter the path
   * for server-side CLI execution.
   */
  async function selectFolder(): Promise<string | null> {
    if (!support.value.hasNativePicker) {
      return null
    }

    try {
      // @ts-expect-error - showDirectoryPicker is not in all TS libs
      const handle = await window.showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'documents'
      })

      directoryHandle.value = handle
      selectedFolderName.value = handle.name
      folderSelected.value = true

      // Use folder name as project name if not set
      if (!projectName.value) {
        projectName.value = handle.name
      }

      return handle.name
    } catch (e: any) {
      if (e.name === 'AbortError') {
        // User cancelled - not an error
        return null
      }
      throw e
    }
  }

  /**
   * Write a file using the FileSystemHandle
   * Creates directories as needed
   */
  async function writeFile(handle: FileSystemDirectoryHandle, path: string, content: string): Promise<void> {
    const parts = path.split('/')
    const fileName = parts.pop()!
    let currentHandle = handle

    // Create nested directories
    for (const dir of parts) {
      if (dir) {
        currentHandle = await currentHandle.getDirectoryHandle(dir, { create: true })
      }
    }

    // Create and write file
    const fileHandle = await currentHandle.getFileHandle(fileName, { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(content)
    await writable.close()
  }

  /**
   * Write all template files using FileSystemHandle
   */
  async function writeTemplateFiles(templates: FileTemplate[]): Promise<string[]> {
    if (!directoryHandle.value) {
      throw new Error('No directory selected')
    }

    const filesCreated: string[] = []

    for (const template of templates) {
      await writeFile(directoryHandle.value, template.path, template.content)
      filesCreated.push(template.path)
    }

    return filesCreated
  }

  /**
   * Generate template files for the project (multi-collection support)
   * Returns templates that will be written client-side
   */
  function generateTemplates(options: CreateAppOptions): FileTemplate[] {
    const templates: FileTemplate[] = []

    // package.json
    const deps: Record<string, string> = {
      'nuxt': '^4.0.0',
      '@fyit/crouton': 'latest'
    }
    const devDeps: Record<string, string> = {
      '@nuxt/ui': '^3.0.0',
      '@nuxthub/core': 'latest',
      'typescript': '^5.0.0'
    }

    if (options.options.includeAuth) {
      deps['@fyit/crouton-auth'] = 'latest'
    }
    if (options.options.includeI18n) {
      deps['@fyit/crouton-i18n'] = 'latest'
    }

    // Add package dependencies
    if (options.packages && options.packages.length > 0) {
      for (const pkg of options.packages) {
        if (pkg.npmPackage) {
          deps[pkg.npmPackage] = 'latest'
        }
      }
    }

    templates.push({
      path: 'package.json',
      content: JSON.stringify({
        name: options.projectName,
        private: true,
        type: 'module',
        scripts: {
          dev: 'nuxt dev',
          build: 'nuxt build',
          preview: 'nuxt preview',
          generate: 'nuxt generate',
          typecheck: 'npx nuxt typecheck',
          'db:generate': 'npx nuxt db generate',
          'db:migrate': 'npx nuxt db migrate'
        },
        dependencies: deps,
        devDependencies: devDeps
      }, null, 2)
    })

    // nuxt.config.ts
    const extendsLayers = ["'@fyit/crouton'"]
    if (options.options.includeAuth) {
      extendsLayers.push("'@fyit/crouton-auth'")
    }
    if (options.options.includeI18n) {
      extendsLayers.push("'@fyit/crouton-i18n'")
    }

    // Add package layers
    if (options.packages && options.packages.length > 0) {
      for (const pkg of options.packages) {
        if (pkg.npmPackage) {
          extendsLayers.push(`'${pkg.npmPackage}'`)
        } else {
          // Local package (for development)
          extendsLayers.push(`'./layers/${pkg.layerName}'`)
        }
      }
    }

    // Add custom collections layer if there are any custom collections
    if (options.collections.length > 0) {
      extendsLayers.push(`'./layers/${options.layerName}'`)
    }

    templates.push({
      path: 'nuxt.config.ts',
      content: `export default defineNuxtConfig({
  extends: [
    ${extendsLayers.join(',\n    ')}
  ],

  modules: [
    '@nuxt/ui',
    '@nuxthub/core'
  ],

  hub: {
    db: '${options.options.dialect}'
  },

  css: ['~/assets/css/main.css'],

  devtools: { enabled: true },

  compatibilityDate: '2025-01-01'
})
`
    })

    // tsconfig.json
    templates.push({
      path: 'tsconfig.json',
      content: JSON.stringify({
        extends: './.nuxt/tsconfig.json'
      }, null, 2)
    })

    // app/assets/css/main.css
    templates.push({
      path: 'app/assets/css/main.css',
      content: `@import "tailwindcss";
@import "@nuxt/ui";
`
    })

    // .env.example
    templates.push({
      path: '.env.example',
      content: `# Database
NUXT_HUB_PROJECT_KEY=

# Auth (if using @fyit/crouton-auth)
BETTER_AUTH_SECRET=your-32-char-secret-here
`
    })

    // app.config.ts
    templates.push({
      path: 'app.config.ts',
      content: `export default defineAppConfig({
  // Collection registry will be auto-generated
})
`
    })

    // server/db/schema.ts
    templates.push({
      path: 'server/db/schema.ts',
      content: `// Auto-generated database schema exports
// Collections will register their schemas here
export {}
`
    })

    // Layer nuxt.config.ts
    templates.push({
      path: `layers/${options.layerName}/nuxt.config.ts`,
      content: `export default defineNuxtConfig({
  // Layer configuration
  // Collections will be added here after generation
})
`
    })

    // Schema JSON files for each collection
    for (const collection of options.collections) {
      templates.push({
        path: `schemas/${collection.name}.json`,
        content: JSON.stringify(collection.schema, null, 2)
      })
    }

    // crouton.config.js - multi-collection support
    const collectionConfigs = options.collections.map((col) => {
      const config: Record<string, any> = {
        name: col.name,
        fieldsFile: `./schemas/${col.name}.json`
      }
      if (col.hierarchy) config.hierarchy = true
      if (col.sortable) config.sortable = true
      if (col.seed) {
        config.seed = { count: col.seedCount || 25 }
      }
      return config
    })

    const collectionNames = options.collections.map(c => c.name)

    templates.push({
      path: 'crouton.config.js',
      content: `export default {
  dialect: '${options.options.dialect}',
  collections: [
    ${collectionConfigs.map(c => JSON.stringify(c, null, 4).split('\n').join('\n    ')).join(',\n    ')}
  ],
  targets: [
    {
      layer: '${options.layerName}',
      collections: ${JSON.stringify(collectionNames)}
    }
  ]
}
`
    })

    return templates
  }

  /**
   * Create the app - main orchestration function
   */
  async function createApp(options: CreateAppOptions): Promise<CreateAppResult> {
    isGenerating.value = true
    error.value = null
    result.value = null

    try {
      // Step 1: Initialize
      updateProgress('init', 'Creating project structure...', 10)

      // Step 2: Generate template files
      // NOTE: Always delegate to server for template generation to use monorepo-aware
      // local package paths when auth/i18n packages aren't published to npm yet
      updateProgress('templates', 'Generating configuration files...', 20)

      // Step 3: Install dependencies (required for CLI)
      updateProgress('dependencies', 'Installing dependencies...', 40)

      // Step 4: Call server to write templates, install deps and run CLI
      updateProgress('cli', 'Running crouton generator...', 60)

      const response = await $fetch<CreateAppResult>('/api/schema-designer/create-app', {
        method: 'POST',
        body: {
          ...options,
          // Always let server write templates for monorepo-aware package paths
          templatesWritten: false
        }
      })

      if (!response.success) {
        throw new Error(response.errors.join(', '))
      }

      // Step 5: Complete
      updateProgress('complete', 'Project ready!', 100)

      result.value = response
      return response

    } catch (e: any) {
      const errorMessage = e.message || 'Failed to create app'
      error.value = errorMessage
      updateProgress('error', errorMessage, progress.value.progress)
      throw e
    } finally {
      isGenerating.value = false
    }
  }

  /**
   * Update progress state
   */
  function updateProgress(step: string, message: string, pct: number) {
    currentStep.value = step
    progress.value = {
      step,
      message,
      progress: pct
    }
  }

  /**
   * Reset all state
   */
  function reset() {
    directoryHandle.value = null
    targetPath.value = ''
    projectName.value = ''
    folderSelected.value = false
    selectedFolderName.value = ''
    isGenerating.value = false
    currentStep.value = ''
    progress.value = { step: '', message: '', progress: 0 }
    error.value = null
    result.value = null
  }

  return {
    // State
    directoryHandle,
    targetPath,
    projectName,
    folderSelected,
    selectedFolderName,
    isGenerating,
    currentStep,
    progress,
    error,
    result,
    support,

    // Methods
    selectFolder,
    writeTemplateFiles,
    generateTemplates,
    createApp,
    reset
  }
}
