import { ref, computed, type ComputedRef } from 'vue'
import type { AppComposition, Block } from '../types/blocks'
import { blocks as allBlocks } from '../data/blocks'

export interface ScaffoldArtifact {
  filename: string
  category: 'config' | 'app' | 'server' | 'schema' | 'seed'
}

export type ScaffoldStatus = 'idle' | 'generating' | 'done' | 'error' | 'conflict'

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

/**
 * Generate flow — builds ScaffoldRequest from composition state,
 * calls scaffold endpoint, tracks progress.
 */
export function useAtelierScaffold(composition: ComputedRef<AppComposition>) {
  const status = ref<ScaffoldStatus>('idle')
  const result = ref<ScaffoldResult | null>(null)
  const error = ref<string | null>(null)
  const folderOverride = ref('')

  const appName = computed(() => {
    if (!composition.value.identity.name) return ''
    return composition.value.identity.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  })

  const effectiveFolderName = computed(() =>
    folderOverride.value || appName.value
  )

  const canGenerate = computed(() =>
    !!composition.value.identity.name
    && composition.value.selectedBlocks.length > 0
  )

  // Build schemas from block collection definitions
  function buildSchemas(): Record<string, string> {
    const schemas: Record<string, string> = {}
    const seen = new Set<string>()

    for (const sb of composition.value.selectedBlocks) {
      const blockDef = allBlocks.find(b => b.id === sb.blockId)
      if (!blockDef) continue

      for (const col of blockDef.collections) {
        if (seen.has(col.name)) continue
        seen.add(col.name)

        const schema: Record<string, unknown> = {}
        for (const field of col.fields) {
          schema[field.name] = {
            type: field.type,
            ...field.meta
          }
        }
        schemas[col.name] = JSON.stringify(schema, null, 2)
      }
    }
    return schemas
  }

  // Build package collections for schema resolution
  function buildPackageCollections(): Array<{ name: string, layerName: string }> {
    const result: Array<{ name: string, layerName: string }> = []
    const seen = new Set<string>()

    for (const sb of composition.value.selectedBlocks) {
      const blockDef = allBlocks.find(b => b.id === sb.blockId)
      if (!blockDef) continue

      for (const col of blockDef.collections) {
        if (seen.has(col.name)) continue
        seen.add(col.name)
        result.push({
          name: col.name,
          layerName: blockDef.package.replace('crouton-', '')
        })
      }
    }
    return result
  }

  // Build artifact preview
  const artifacts = computed<ScaffoldArtifact[]>(() => {
    const items: ScaffoldArtifact[] = [
      { filename: 'package.json', category: 'config' },
      { filename: 'nuxt.config.ts', category: 'config' },
      { filename: 'crouton.config.js', category: 'config' },
      { filename: 'wrangler.toml', category: 'config' },
      { filename: 'app.vue', category: 'app' },
      { filename: 'app/assets/css/main.css', category: 'app' },
      { filename: 'app/app.config.ts', category: 'app' },
      { filename: 'server/db/schema.ts', category: 'server' }
    ]

    const schemas = buildSchemas()
    for (const name of Object.keys(schemas)) {
      items.push({ filename: `schemas/${name}.json`, category: 'schema' })
    }

    // Seed files
    for (const sb of composition.value.selectedBlocks) {
      const blockDef = allBlocks.find(b => b.id === sb.blockId)
      if (!blockDef) continue
      for (const col of blockDef.collections) {
        if (col.seedCount) {
          items.push({ filename: `schemas/${col.name}.seed.json`, category: 'seed' })
        }
      }
    }

    return items
  })

  const artifactsByCategory = computed(() => {
    const groups: Record<string, { icon: string, items: ScaffoldArtifact[] }> = {}
    const icons: Record<string, string> = {
      config: 'i-lucide-settings',
      app: 'i-lucide-layout',
      server: 'i-lucide-server',
      schema: 'i-lucide-file-json',
      seed: 'i-lucide-sprout'
    }

    for (const art of artifacts.value) {
      if (!groups[art.category]) {
        groups[art.category] = { icon: icons[art.category] ?? 'i-lucide-file', items: [] }
      }
      groups[art.category].items.push(art)
    }
    return groups
  })

  async function generate(): Promise<ScaffoldResult | null> {
    if (!canGenerate.value) return null

    status.value = 'generating'
    error.value = null
    result.value = null

    try {
      const body = {
        appName: effectiveFolderName.value,
        packages: composition.value.enabledPackages,
        schemas: buildSchemas(),
        packageCollections: buildPackageCollections()
      }

      const res = await $fetch<ScaffoldResult>('/api/atelier/scaffold-app', {
        method: 'POST',
        body
      })

      result.value = res
      status.value = res.success ? 'done' : 'error'
      if (!res.success) {
        error.value = 'Some scaffold steps failed. Check step details.'
      }
      return res
    } catch (err: any) {
      if (err.status === 409) {
        status.value = 'conflict'
        error.value = err.data?.statusText || `Folder "${effectiveFolderName.value}" already exists`
        folderOverride.value = `${appName.value}-2`
      } else {
        status.value = 'error'
        error.value = err.data?.statusText || err.message || 'Unknown error'
      }
      return null
    }
  }

  return {
    appName,
    effectiveFolderName,
    folderOverride,
    canGenerate,
    artifacts,
    artifactsByCategory,
    status,
    result,
    error,
    generate
  }
}
