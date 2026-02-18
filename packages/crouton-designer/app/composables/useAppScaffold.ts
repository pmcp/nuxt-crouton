import type { CollectionWithFields, PackageCollectionEntry } from './useCollectionEditor'
import type { ProjectConfig, SeedDataMap } from '../types/schema'

export interface ScaffoldArtifact {
  filename: string
  category: 'config' | 'app' | 'server' | 'schema' | 'seed'
}

export type ScaffoldStatus = 'idle' | 'creating' | 'done' | 'error' | 'conflict'

export interface ScaffoldStepResult {
  success: boolean
  error?: string
  files?: string[]
  output?: string
}

export interface ScaffoldResult {
  success: boolean
  appDir: string
  steps: Record<string, ScaffoldStepResult>
}

const CATEGORY_ICONS: Record<ScaffoldArtifact['category'], string> = {
  config: 'i-lucide-settings',
  app: 'i-lucide-layout',
  server: 'i-lucide-server',
  schema: 'i-lucide-file-json',
  seed: 'i-lucide-sprout'
}

export function useAppScaffold(
  collections: Ref<CollectionWithFields[]>,
  config: Ref<ProjectConfig>,
  seedData?: Ref<SeedDataMap>,
  packageCollections?: Ref<PackageCollectionEntry[]>
) {
  const { schemaFiles, getAllSchemasAsJson } = useSchemaExport(collections)

  const status = ref<ScaffoldStatus>('idle')
  const result = ref<ScaffoldResult | null>(null)
  const error = ref<string | null>(null)
  const conflictError = ref(false)

  // User-overridable folder name (separate from config display name)
  const folderOverride = ref('')

  // Compute app name from config (kebab-case)
  const appName = computed(() => {
    if (!config.value.name) return ''
    return config.value.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  })

  // Build artifact preview grouped by category
  const artifacts = computed<ScaffoldArtifact[]>(() => {
    const items: ScaffoldArtifact[] = []

    // Config files (always created by CLI)
    items.push(
      { filename: 'package.json', category: 'config' },
      { filename: 'nuxt.config.ts', category: 'config' },
      { filename: 'crouton.config.js', category: 'config' },
      { filename: 'wrangler.toml', category: 'config' }
    )

    // App files
    items.push(
      { filename: 'app.vue', category: 'app' },
      { filename: 'app/assets/css/main.css', category: 'app' },
      { filename: 'app/app.config.ts', category: 'app' }
    )

    // Server files
    items.push(
      { filename: 'server/db/schema.ts', category: 'server' },
      { filename: 'server/db/translations-ui.ts', category: 'server' },
      { filename: 'server/utils/_cf-stubs/index.ts', category: 'server' },
      { filename: 'server/utils/_cf-stubs/client.ts', category: 'server' }
    )

    // Schema files (one per user collection)
    for (const file of schemaFiles.value) {
      items.push({
        filename: `schemas/${file.name}.json`,
        category: 'schema'
      })
    }

    // Package collection schema files (manifest fields + extension fields)
    if (packageCollections?.value) {
      for (const pkg of packageCollections.value) {
        items.push({
          filename: `schemas/${pkg.name}.json`,
          category: 'schema'
        })
      }
    }

    // Seed data files
    if (seedData?.value) {
      for (const [collectionName, entries] of Object.entries(seedData.value)) {
        if (entries && entries.length > 0) {
          items.push({
            filename: `schemas/${collectionName}.seed.json`,
            category: 'seed'
          })
        }
      }
    }

    return items
  })

  // Group artifacts by category for display
  const artifactsByCategory = computed(() => {
    const groups: Record<string, { icon: string, artifacts: ScaffoldArtifact[] }> = {}

    for (const artifact of artifacts.value) {
      if (!groups[artifact.category]) {
        groups[artifact.category] = {
          icon: CATEGORY_ICONS[artifact.category],
          artifacts: []
        }
      }
      groups[artifact.category]!.artifacts.push(artifact)
    }

    return groups
  })

  // Effective folder name: user override or computed from config name
  const effectiveFolderName = computed(() => folderOverride.value || appName.value)
  const folderNameValid = computed(() => /^[a-z][a-z0-9-]*$/.test(effectiveFolderName.value))

  async function createApp(): Promise<ScaffoldResult | null> {
    if (!effectiveFolderName.value) return null

    status.value = 'creating'
    error.value = null
    result.value = null
    conflictError.value = false

    try {
      // Build schemas map — user collections + package collections
      const schemas: Record<string, string> = {}
      // User collection schemas
      const allSchemas = getAllSchemasAsJson()
      for (const [filename, content] of allSchemas) {
        const name = filename.replace(/\.json$/, '')
        schemas[name] = content
      }
      // Package collection schemas (manifest fields + extension fields merged)
      const pkgSchemas = getPackageSchemasAsJson(packageCollections?.value ?? [])
      for (const [filename, content] of pkgSchemas) {
        const name = filename.replace(/\.json$/, '')
        schemas[name] = content
      }

      // Clean seed data (strip _id)
      let cleanSeedData: Record<string, Array<Record<string, any>>> | undefined
      if (seedData?.value && Object.keys(seedData.value).length > 0) {
        cleanSeedData = {}
        for (const [collectionName, entries] of Object.entries(seedData.value)) {
          if (entries && entries.length > 0) {
            cleanSeedData[collectionName] = entries.map(({ _id, ...rest }) => rest)
          }
        }
      }

      // Package collection layer info for config builder (name + layerName)
      const pkgColsForConfig = (packageCollections?.value ?? []).map(pkg => ({
        name: pkg.name,
        layerName: pkg.layerName,
      }))

      // Publishable collection names for config builder
      const publishableCollections = schemaFiles.value
        .filter(f => f.publishable)
        .map(f => f.name)

      const response = await $fetch<ScaffoldResult>('/api/scaffold-app', {
        method: 'POST',
        body: {
          appName: effectiveFolderName.value,
          config: {
            name: config.value.name,
            packages: config.value.packages
          },
          schemas,
          seedData: cleanSeedData,
          packageCollections: pkgColsForConfig,
          publishableCollections: publishableCollections.length ? publishableCollections : undefined
        }
      })

      result.value = response
      status.value = response.success ? 'done' : 'error'

      if (!response.success) {
        // Find first failed step for error message
        const failedStep = Object.entries(response.steps)
          .find(([_, step]) => !step.success)
        error.value = failedStep
          ? `Step "${failedStep[0]}" failed: ${failedStep[1].error}`
          : 'Unknown error'
      }

      return response
    }
    catch (err: any) {
      const httpStatus = err.statusCode || err.status
      if (httpStatus === 409) {
        conflictError.value = true
        status.value = 'conflict'
        // Pre-fill folder override with a suggested rename if not already overriding
        if (!folderOverride.value) {
          folderOverride.value = `${appName.value}-2`
        }
        error.value = err.data?.statusText || err.message || 'App already exists'
      }
      else {
        status.value = 'error'
        error.value = err.data?.statusText || err.message || 'Failed to create app'
      }
      return null
    }
  }

  return {
    appName,
    effectiveFolderName,
    folderNameValid,
    folderOverride,
    conflictError,
    artifacts,
    artifactsByCategory,
    status,
    result,
    error,
    createApp
  }
}
