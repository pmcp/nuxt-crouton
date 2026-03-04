import type { CollectionWithFields, PackageCollectionEntry } from './useCollectionEditor'
import type { ProjectConfig, SeedDataMap } from '../types/schema'
import type { ScaffoldArtifact, ScaffoldStatus, ScaffoldResult } from '@fyit/crouton-core/shared/types/scaffold'
import { groupArtifactsByCategory, toKebabAppName, FOLDER_NAME_REGEX } from '@fyit/crouton-core/shared/utils/scaffold'

export type { ScaffoldArtifact, ScaffoldStatus, ScaffoldResult }

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
  const appName = computed(() => toKebabAppName(config.value.name))

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

    // Schema files: user collections + package-only collections (server writes these from package)
    for (const file of schemaFiles.value) {
      items.push({ filename: `schemas/${file.name}.json`, category: 'schema' })
    }
    const coveredSchemaNames = new Set(schemaFiles.value.map(f => f.name))
    for (const pkg of packageCollections?.value ?? []) {
      if (!coveredSchemaNames.has(pkg.name)) {
        items.push({ filename: `schemas/${pkg.name}.json`, category: 'schema' })
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
  const artifactsByCategory = computed(() => groupArtifactsByCategory(artifacts.value))

  // Effective folder name: user override or computed from config name
  const effectiveFolderName = computed(() => folderOverride.value || appName.value)
  const folderNameValid = computed(() => FOLDER_NAME_REGEX.test(effectiveFolderName.value))

  async function createApp(): Promise<ScaffoldResult | null> {
    if (!effectiveFolderName.value) return null

    status.value = 'creating'
    error.value = null
    result.value = null
    conflictError.value = false

    try {
      // Build schemas map — user collections only.
      // Package collections (e.g. pages from crouton-pages) are handled automatically
      // by the CLI's mergeManifestCollections() at generate time — including them here
      // would create an empty/partial schema file that overrides the package's full schema.
      const schemas: Record<string, string> = {}
      const allSchemas = getAllSchemasAsJson()
      for (const [filename, content] of allSchemas) {
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
