/**
 * @crouton-studio
 * Composable for scanning the host app's structure
 *
 * Provides reactive state for:
 * - Discovered layers
 * - Discovered collections with fields
 * - App-level components
 * - App-level pages
 */

import type { AppContext, CollectionInfo, ComponentInfo, PageInfo, LayerInfo } from '../types/studio'

interface ScanResponse {
  success: boolean
  data: AppContext
}

/**
 * Composable for managing app scanning and discovered artifacts
 */
export function useAppScanner() {
  // Reactive state
  const context = ref<AppContext | null>(null)
  const loading = ref(false)
  const error = ref<Error | null>(null)

  // Computed properties for easy access
  const layers = computed<LayerInfo[]>(() => context.value?.layers ?? [])
  const collections = computed<CollectionInfo[]>(() => context.value?.collections ?? [])
  const components = computed<ComponentInfo[]>(() => context.value?.components ?? [])
  const pages = computed<PageInfo[]>(() => context.value?.pages ?? [])

  // Derived computed properties
  const localLayers = computed(() => layers.value.filter(l => l.isLocal))
  const packageLayers = computed(() => layers.value.filter(l => !l.isLocal))
  const croutonPackages = computed(() => layers.value.filter(l => l.isCroutonPackage))

  const hasCollections = computed(() => collections.value.length > 0)
  const hasComponents = computed(() => components.value.length > 0)
  const hasPages = computed(() => pages.value.length > 0)

  // Group collections by layer
  const collectionsByLayer = computed(() => {
    const grouped: Record<string, CollectionInfo[]> = {}
    for (const collection of collections.value) {
      if (!grouped[collection.layer]) {
        grouped[collection.layer] = []
      }
      grouped[collection.layer].push(collection)
    }
    return grouped
  })

  // Get total field count across all collections
  const totalFields = computed(() => {
    return collections.value.reduce((sum, c) => sum + c.fields.length, 0)
  })

  // Get total endpoint count across all collections
  const totalEndpoints = computed(() => {
    return collections.value.reduce((sum, c) => sum + c.apiEndpoints.length, 0)
  })

  /**
   * Scan the host app
   */
  async function scan(): Promise<AppContext | null> {
    loading.value = true
    error.value = null

    try {
      const response = await $fetch<ScanResponse>('/api/_studio/scan')

      if (response.success && response.data) {
        // Convert date string to Date object
        context.value = {
          ...response.data,
          scannedAt: new Date(response.data.scannedAt)
        }
        return context.value
      }
      else {
        throw new Error('Scan failed: Invalid response')
      }
    }
    catch (err) {
      error.value = err instanceof Error ? err : new Error('Unknown error during scan')
      console.error('App scan error:', err)
      return null
    }
    finally {
      loading.value = false
    }
  }

  /**
   * Refresh the scan
   */
  async function refresh(): Promise<void> {
    await scan()
  }

  /**
   * Get a specific collection by name
   */
  function getCollection(name: string): CollectionInfo | undefined {
    return collections.value.find(c => c.name === name)
  }

  /**
   * Get collections for a specific layer
   */
  function getCollectionsForLayer(layerName: string): CollectionInfo[] {
    return collections.value.filter(c => c.layer === layerName)
  }

  /**
   * Check if a collection exists
   */
  function hasCollection(name: string): boolean {
    return collections.value.some(c => c.name === name)
  }

  /**
   * Build a system prompt context for AI
   * This can be used to inform the AI about the current app state
   */
  function buildAIContext(): string {
    if (!context.value) return 'No app context available. Please scan the app first.'

    const lines: string[] = []

    lines.push('## Current App Context\n')

    // Layers
    if (layers.value.length > 0) {
      lines.push('### Extended Layers')
      for (const layer of layers.value) {
        const type = layer.isLocal ? 'local' : (layer.isCroutonPackage ? 'crouton' : 'package')
        lines.push(`- ${layer.name} (${type})`)
      }
      lines.push('')
    }

    // Collections
    if (collections.value.length > 0) {
      lines.push('### Existing Collections')
      for (const collection of collections.value) {
        const userFields = collection.fields.filter(f => !f.auto)
        const fieldNames = userFields.map(f => f.name).join(', ')
        lines.push(`- **${collection.name}** (layer: ${collection.layer}): ${fieldNames || 'no custom fields'}`)
      }
      lines.push('')
    }

    // Components
    if (components.value.length > 0) {
      lines.push('### App Components')
      for (const component of components.value) {
        lines.push(`- ${component.name}`)
      }
      lines.push('')
    }

    // Pages
    if (pages.value.length > 0) {
      lines.push('### App Pages')
      for (const page of pages.value) {
        lines.push(`- ${page.route} (${page.name})`)
      }
      lines.push('')
    }

    return lines.join('\n')
  }

  return {
    // State
    context: readonly(context),
    loading: readonly(loading),
    error: readonly(error),

    // Computed
    layers,
    collections,
    components,
    pages,
    localLayers,
    packageLayers,
    croutonPackages,
    hasCollections,
    hasComponents,
    hasPages,
    collectionsByLayer,
    totalFields,
    totalEndpoints,

    // Methods
    scan,
    refresh,
    getCollection,
    getCollectionsForLayer,
    hasCollection,
    buildAIContext
  }
}
