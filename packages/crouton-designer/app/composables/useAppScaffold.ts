import type { CollectionWithFields } from './useCollectionEditor'
import type { ProjectConfig, SeedDataMap } from '../types/schema'

export interface ScaffoldArtifact {
  filename: string
  category: 'config' | 'app' | 'server' | 'schema' | 'seed'
}

export type ScaffoldStatus = 'idle' | 'creating' | 'done' | 'error'

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
  seedData?: Ref<SeedDataMap>
) {
  const { schemaFiles, getAllSchemasAsJson } = useSchemaExport(collections)

  const status = ref<ScaffoldStatus>('idle')
  const result = ref<ScaffoldResult | null>(null)
  const error = ref<string | null>(null)

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

    // Schema files (one per collection)
    for (const file of schemaFiles.value) {
      items.push({
        filename: `schemas/${file.name}.json`,
        category: 'schema'
      })
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

  async function createApp(): Promise<ScaffoldResult | null> {
    if (!appName.value) return null

    status.value = 'creating'
    error.value = null
    result.value = null

    try {
      // Build schemas map
      const schemas: Record<string, string> = {}
      const allSchemas = getAllSchemasAsJson()
      for (const [filename, content] of allSchemas) {
        // filename is "collectionName.json", strip .json for key
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

      const response = await $fetch<ScaffoldResult>('/api/scaffold-app', {
        method: 'POST',
        body: {
          appName: appName.value,
          config: {
            name: config.value.name,
            packages: config.value.packages
          },
          schemas,
          seedData: cleanSeedData
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
      status.value = 'error'
      error.value = err.data?.statusText || err.message || 'Failed to create app'
      return null
    }
  }

  return {
    appName,
    artifacts,
    artifactsByCategory,
    status,
    result,
    error,
    createApp
  }
}
