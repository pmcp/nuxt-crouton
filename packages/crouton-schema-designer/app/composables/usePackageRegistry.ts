import type { PackageManifest, PackageSummary } from '../types/package-manifest'

// Note: useState, computed, $fetch are auto-imported by Nuxt
// TypeScript errors in isolation are expected (see CLAUDE.md Known TypeScript Limitations)

/**
 * usePackageRegistry - Loads and caches package manifests from the API.
 *
 * Provides reactive access to available crouton packages that can be
 * added to projects in the schema designer.
 */
export function usePackageRegistry() {
  // State cached via useState for SSR compatibility
  const packages = useState<PackageSummary[]>('package-registry-list', () => [])
  const manifests = useState<Map<string, PackageManifest>>('package-registry-manifests', () => new Map())
  const loading = useState<boolean>('package-registry-loading', () => false)
  const error = useState<string | null>('package-registry-error', () => null)
  const initialized = useState<boolean>('package-registry-initialized', () => false)

  /**
   * Load all available packages from the API.
   * Results are cached in state to avoid redundant fetches.
   */
  async function loadPackages(): Promise<void> {
    // Skip if already loading
    if (loading.value) return

    // Skip if already initialized (can force reload by calling with force=true)
    if (initialized.value && packages.value.length > 0) return

    loading.value = true
    error.value = null

    try {
      const data = await $fetch<PackageSummary[]>('/api/schema-designer/packages')
      packages.value = data
      initialized.value = true
    } catch (e) {
      console.error('Failed to load packages:', e)
      error.value = e instanceof Error ? e.message : 'Failed to load packages'
    } finally {
      loading.value = false
    }
  }

  /**
   * Force reload packages from the API, bypassing cache.
   */
  async function refreshPackages(): Promise<void> {
    initialized.value = false
    await loadPackages()
  }

  /**
   * Get the full manifest for a single package.
   * Fetches from API if not already cached.
   */
  async function getPackage(id: string): Promise<PackageManifest | null> {
    // Check cache first
    if (manifests.value.has(id)) {
      return manifests.value.get(id) || null
    }

    try {
      const manifest = await $fetch<PackageManifest>(`/api/schema-designer/packages/${id}`)
      manifests.value.set(id, manifest)
      return manifest
    } catch (e) {
      console.error(`Failed to load package ${id}:`, e)
      return null
    }
  }

  /**
   * Get a cached manifest synchronously.
   * Returns null if not loaded yet - use getPackage() for async loading.
   */
  function getCachedManifest(id: string): PackageManifest | null {
    return manifests.value.get(id) || null
  }

  /**
   * Check if a package is available by ID.
   */
  function isAvailable(id: string): boolean {
    return packages.value.some((p: PackageSummary) => p.id === id)
  }

  /**
   * Search packages by name or description.
   */
  function searchPackages(query: string): PackageSummary[] {
    if (!query.trim()) return packages.value

    const lowerQuery = query.toLowerCase()
    return packages.value.filter((p: PackageSummary) =>
      p.name.toLowerCase().includes(lowerQuery) ||
      p.description.toLowerCase().includes(lowerQuery)
    )
  }

  /**
   * Get package summary by ID.
   */
  function getPackageSummary(id: string): PackageSummary | undefined {
    return packages.value.find((p: PackageSummary) => p.id === id)
  }

  return {
    // Reactive state
    packages: computed(() => packages.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    initialized: computed(() => initialized.value),

    // Methods
    loadPackages,
    refreshPackages,
    getPackage,
    getCachedManifest,
    isAvailable,
    searchPackages,
    getPackageSummary
  }
}
