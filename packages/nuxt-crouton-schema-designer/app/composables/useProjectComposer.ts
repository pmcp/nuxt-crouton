import type { CollectionSchema, SchemaField } from '../types/schema'
import type {
  PackageManifest,
  PackageInstance,
  CollectionExtension,
  SchemaProjectWithPackages,
  PackageCollection,
  ConfigOption
} from '../types/package-manifest'

// Note: useState, computed are auto-imported by Nuxt
// TypeScript errors in isolation are expected (see CLAUDE.md Known TypeScript Limitations)

/**
 * Unified collection representation for cross-reference helpers.
 */
export interface UnifiedCollection {
  source: 'package' | 'custom'
  packageId?: string
  collection: {
    name: string
    tableName?: string
    description?: string
  }
}

/**
 * Reference target option for dropdowns.
 */
export interface RefTargetOption {
  value: string
  label: string
  group: 'package' | 'custom'
}

/**
 * useProjectComposer - Main state management for package + custom collection composition.
 *
 * Manages the combined state of selected packages, their configurations,
 * and custom collections. Integrates with useSchemaDesigner for custom
 * collection editing.
 */
export function useProjectComposer() {
  const packageRegistry = usePackageRegistry()
  const schemaDesigner = useSchemaDesigner()

  // Project identity
  const projectName = useState<string>('composer-project-name', () => '')
  const baseLayerName = useState<string>('composer-base-layer', () => 'app')

  // Selected packages with their configurations
  const packages = useState<PackageInstance[]>('composer-packages', () => [])

  // Cached manifests for selected packages
  const packageManifests = useState<Map<string, PackageManifest>>('composer-manifests', () => new Map())

  // ===================
  // Package Management
  // ===================

  /**
   * Add a package to the project.
   */
  async function addPackage(packageId: string): Promise<boolean> {
    // Check if already added
    if (packages.value.some((p: PackageInstance) => p.packageId === packageId)) {
      return false
    }

    // Load the full manifest
    const manifest = await packageRegistry.getPackage(packageId)
    if (!manifest) {
      console.error(`Package ${packageId} not found`)
      return false
    }

    // Initialize with defaults
    const defaultConfig: Record<string, unknown> = {}
    for (const [key, option] of Object.entries(manifest.configuration || {})) {
      const configOption = option as ConfigOption
      defaultConfig[key] = configOption.default
    }

    // Create package instance
    const instance: PackageInstance = {
      packageId,
      layerName: manifest.layer.name,
      configuration: defaultConfig,
      extensions: []
    }

    packages.value.push(instance)
    packageManifests.value.set(packageId, manifest)

    return true
  }

  /**
   * Remove a package from the project.
   */
  function removePackage(packageId: string): boolean {
    const index = packages.value.findIndex((p: PackageInstance) => p.packageId === packageId)
    if (index === -1) return false

    packages.value.splice(index, 1)
    packageManifests.value.delete(packageId)
    return true
  }

  /**
   * Update configuration for a package.
   */
  function updatePackageConfig(packageId: string, config: Record<string, unknown>): boolean {
    const pkg = packages.value.find((p: PackageInstance) => p.packageId === packageId)
    if (!pkg) return false

    pkg.configuration = { ...pkg.configuration, ...config }
    return true
  }

  /**
   * Set a single config value for a package.
   */
  function setPackageConfigValue(packageId: string, key: string, value: unknown): boolean {
    const pkg = packages.value.find((p: PackageInstance) => p.packageId === packageId)
    if (!pkg) return false

    pkg.configuration[key] = value
    return true
  }

  /**
   * Update layer name for a package (if editable).
   */
  function updatePackageLayerName(packageId: string, layerName: string): boolean {
    const pkg = packages.value.find((p: PackageInstance) => p.packageId === packageId)
    const manifest = packageManifests.value.get(packageId)

    if (!pkg || !manifest) return false

    // Only allow if editable
    if (!manifest.layer.editable) return false

    pkg.layerName = layerName
    return true
  }

  /**
   * Get the manifest for a selected package.
   */
  function getPackageManifest(packageId: string): PackageManifest | undefined {
    return packageManifests.value.get(packageId)
  }

  /**
   * Get the instance for a selected package.
   */
  function getPackageInstance(packageId: string): PackageInstance | undefined {
    return packages.value.find((p: PackageInstance) => p.packageId === packageId)
  }

  // ===================
  // Extension Management
  // ===================

  /**
   * Add an extension field to a package collection.
   */
  function addCollectionExtension(
    packageId: string,
    collectionName: string,
    extension: CollectionExtension
  ): boolean {
    const pkg = packages.value.find((p: PackageInstance) => p.packageId === packageId)
    if (!pkg) return false

    if (!pkg.extensions) {
      pkg.extensions = []
    }

    // Check if extension already exists for this collection
    const existingIndex = pkg.extensions.findIndex((e: CollectionExtension) => e.collectionName === collectionName)
    if (existingIndex >= 0) {
      // Merge fields
      const existing = pkg.extensions[existingIndex]
      if (existing) {
        existing.additionalFields = [...existing.additionalFields, ...extension.additionalFields]
      }
    } else {
      pkg.extensions.push(extension)
    }

    return true
  }

  /**
   * Remove an extension from a package collection.
   */
  function removeCollectionExtension(packageId: string, collectionName: string): boolean {
    const pkg = packages.value.find((p: PackageInstance) => p.packageId === packageId)
    if (!pkg || !pkg.extensions) return false

    const index = pkg.extensions.findIndex((e: CollectionExtension) => e.collectionName === collectionName)
    if (index === -1) return false

    pkg.extensions.splice(index, 1)
    return true
  }

  // ===================
  // Collection Management (delegates to useSchemaDesigner)
  // ===================

  /**
   * Add a custom collection.
   */
  function addCollection(name: string = ''): string {
    return schemaDesigner.addCollection(name)
  }

  /**
   * Remove a custom collection.
   */
  function removeCollection(id: string): boolean {
    return schemaDesigner.removeCollection(id)
  }

  /**
   * Get custom collections from the schema designer.
   */
  const customCollections = computed<CollectionSchema[]>(() => {
    return schemaDesigner.collections.value
  })

  // ===================
  // Cross-Reference Helpers
  // ===================

  /**
   * Get all collections (package + custom) for cross-reference purposes.
   */
  function getAllCollections(): UnifiedCollection[] {
    const result: UnifiedCollection[] = []

    // Add package collections
    for (const pkg of packages.value) {
      const manifest = packageManifests.value.get(pkg.packageId)
      if (!manifest) continue

      // Get enabled collections based on config
      const enabledCollections = getEnabledPackageCollections(pkg.packageId)

      for (const collection of enabledCollections) {
        result.push({
          source: 'package',
          packageId: pkg.packageId,
          collection: {
            name: collection.name,
            tableName: collection.tableName,
            description: collection.description
          }
        })
      }
    }

    // Add custom collections
    for (const collection of customCollections.value) {
      result.push({
        source: 'custom',
        collection: {
          name: collection.collectionName,
          description: `Custom collection: ${collection.collectionName}`
        }
      })
    }

    return result
  }

  /**
   * Get reference targets for dropdown selection.
   * Groups by source (package/custom) for better UX.
   */
  function getRefTargets(): RefTargetOption[] {
    const result: RefTargetOption[] = []

    // Package collections first
    for (const pkg of packages.value) {
      const manifest = packageManifests.value.get(pkg.packageId)
      if (!manifest) continue

      const enabledCollections = getEnabledPackageCollections(pkg.packageId)

      for (const collection of enabledCollections) {
        result.push({
          value: collection.tableName || collection.name,
          label: `${manifest.name}: ${collection.name}`,
          group: 'package'
        })
      }
    }

    // Custom collections
    for (const collection of customCollections.value) {
      if (collection.collectionName) {
        // Custom collections use layerName + collectionName for table name
        const tableName = `${baseLayerName.value}${capitalize(collection.collectionName)}`
        result.push({
          value: tableName,
          label: `Custom: ${collection.collectionName}`,
          group: 'custom'
        })
      }
    }

    return result
  }

  /**
   * Get enabled collections for a package based on its configuration.
   */
  function getEnabledPackageCollections(packageId: string): PackageCollection[] {
    const pkg = packages.value.find((p: PackageInstance) => p.packageId === packageId)
    const manifest = packageManifests.value.get(packageId)

    if (!pkg || !manifest) return []

    return manifest.collections.filter((collection: PackageCollection) => {
      if (!collection.optional) return true

      if (collection.condition) {
        return evaluateCondition(collection.condition, pkg.configuration)
      }

      return true
    })
  }

  /**
   * Evaluate a condition string against configuration.
   */
  function evaluateCondition(condition: string, config: Record<string, unknown>): boolean {
    const match = condition.match(/^config\.(.+)$/)
    if (!match) return true

    const configPath = match[1]
    if (!configPath) return true

    const value = config[configPath]
    return Boolean(value)
  }

  /**
   * Capitalize first letter of a string.
   */
  function capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1)
  }

  // ===================
  // Validation
  // ===================

  const validationErrors = computed<string[]>(() => {
    const errors: string[] = []

    if (!projectName.value.trim()) {
      errors.push('Project name is required')
    }

    if (!baseLayerName.value.trim()) {
      errors.push('Base layer name is required')
    }

    // Validate package configurations
    for (const pkg of packages.value) {
      const manifest = packageManifests.value.get(pkg.packageId)
      if (!manifest) {
        errors.push(`Missing manifest for package ${pkg.packageId}`)
        continue
      }

      // Check for required layer name
      if (!pkg.layerName.trim()) {
        errors.push(`Layer name required for ${manifest.name}`)
      }
    }

    // Check for duplicate layer names
    const layerNames = [
      baseLayerName.value,
      ...packages.value.map((p: PackageInstance) => p.layerName)
    ].filter(Boolean)
    const duplicateLayers = layerNames.filter((name: string, i: number) => layerNames.indexOf(name) !== i)
    if (duplicateLayers.length > 0) {
      errors.push(`Duplicate layer names: ${[...new Set(duplicateLayers)].join(', ')}`)
    }

    // Include schema designer validation errors
    errors.push(...schemaDesigner.validationErrors.value)

    return errors
  })

  const isValid = computed(() => validationErrors.value.length === 0)

  // ===================
  // Save/Load
  // ===================

  /**
   * Load project state from a saved project.
   */
  async function loadProject(project: SchemaProjectWithPackages): Promise<void> {
    projectName.value = project.name
    baseLayerName.value = project.baseLayerName || 'app'

    // Clear current packages
    packages.value = []
    packageManifests.value.clear()

    // Load packages and their manifests
    if (project.packages && project.packages.length > 0) {
      for (const pkg of project.packages) {
        const manifest = await packageRegistry.getPackage(pkg.packageId)
        if (manifest) {
          packages.value.push({
            packageId: pkg.packageId,
            layerName: pkg.layerName || manifest.layer.name,
            configuration: pkg.configuration || {},
            extensions: pkg.extensions || []
          })
          packageManifests.value.set(pkg.packageId, manifest)
        }
      }
    }

    // Load custom collections into schema designer
    if (project.collections && project.collections.length > 0) {
      schemaDesigner.loadMultiState(baseLayerName.value, project.collections)
    } else if (project.collectionName && project.schema) {
      // Legacy single collection format
      const schemaObj = project.schema as { fields?: SchemaField[] }
      schemaDesigner.loadState({
        collectionName: project.collectionName,
        layerName: project.layerName || baseLayerName.value,
        fields: schemaObj?.fields || [],
        options: project.options
      })
    }
  }

  /**
   * Convert current state to a project object for saving.
   */
  function toProject(): SchemaProjectWithPackages {
    return {
      id: '', // Will be set by the caller
      name: projectName.value,
      baseLayerName: baseLayerName.value,
      packages: packages.value.map((pkg: PackageInstance) => ({
        packageId: pkg.packageId,
        layerName: pkg.layerName,
        configuration: pkg.configuration,
        extensions: pkg.extensions
      })),
      collections: customCollections.value,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }

  /**
   * Reset composer state to defaults.
   */
  function reset(): void {
    projectName.value = ''
    baseLayerName.value = 'app'
    packages.value = []
    packageManifests.value.clear()
    schemaDesigner.reset()
  }

  // ===================
  // Computed Properties
  // ===================

  const hasPackages = computed(() => packages.value.length > 0)
  const hasCustomCollections = computed(() => customCollections.value.length > 0)
  const totalCollections = computed(() => getAllCollections().length)

  return {
    // Project identity
    projectName,
    baseLayerName,

    // Packages
    packages: computed(() => packages.value),
    packageManifests: computed(() => packageManifests.value),
    hasPackages,

    // Package management
    addPackage,
    removePackage,
    updatePackageConfig,
    setPackageConfigValue,
    updatePackageLayerName,
    getPackageManifest,
    getPackageInstance,
    getEnabledPackageCollections,

    // Extensions
    addCollectionExtension,
    removeCollectionExtension,

    // Custom collections (via schema designer)
    customCollections,
    hasCustomCollections,
    addCollection,
    removeCollection,

    // Cross-reference helpers
    getAllCollections,
    getRefTargets,
    totalCollections,

    // Validation
    validationErrors,
    isValid,

    // Save/Load
    loadProject,
    toProject,
    reset,

    // Access to underlying schema designer
    schemaDesigner
  }
}
