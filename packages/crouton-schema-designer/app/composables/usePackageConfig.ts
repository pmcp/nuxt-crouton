import type { Ref } from 'vue'
import type { PackageManifest, PackageCollection, ConfigOption } from '../types/package-manifest'

// Note: ref, computed, watch are auto-imported by Nuxt
// TypeScript errors in isolation are expected (see CLAUDE.md Known TypeScript Limitations)

/**
 * ValidationResult for package configuration.
 */
export interface ConfigValidationResult {
  valid: boolean
  errors: string[]
}

/**
 * usePackageConfig - Manages configuration state for a single package instance.
 *
 * Handles initialization from manifest defaults, conditional option visibility,
 * and validation of configuration values.
 */
export function usePackageConfig(manifest: Ref<PackageManifest | null>) {
  // Configuration state for this package instance
  const config = ref<Record<string, unknown>>({})

  /**
   * Initialize configuration with default values from manifest.
   */
  function initDefaults(): void {
    if (!manifest.value) return

    const defaults: Record<string, unknown> = {}
    for (const [key, option] of Object.entries(manifest.value.configuration)) {
      const configOption = option as ConfigOption
      defaults[key] = configOption.default
    }
    config.value = defaults
  }

  /**
   * Get a config value by key.
   */
  function getConfigValue<T = unknown>(key: string): T | undefined {
    return config.value[key] as T | undefined
  }

  /**
   * Set a config value by key.
   */
  function setConfigValue(key: string, value: unknown): void {
    config.value[key] = value
  }

  /**
   * Check if a config option should be visible based on dependsOn condition.
   */
  function isOptionVisible(key: string): boolean {
    if (!manifest.value) return false

    const option = manifest.value.configuration[key] as ConfigOption | undefined
    if (!option) return false

    // If no dependency, always visible
    if (!option.dependsOn) return true

    // Check dependency value
    const dependencyValue = config.value[option.dependsOn]

    // For boolean dependencies, check if truthy
    if (typeof dependencyValue === 'boolean') {
      return dependencyValue
    }

    // For other types, check if not null/undefined/empty
    return dependencyValue !== null && dependencyValue !== undefined && dependencyValue !== ''
  }

  /**
   * Get all visible config options (filtered by dependsOn conditions).
   */
  const visibleOptions = computed(() => {
    if (!manifest.value) return {}

    const result: Record<string, ConfigOption> = {}
    for (const [key, option] of Object.entries(manifest.value.configuration)) {
      if (isOptionVisible(key)) {
        result[key] = option as ConfigOption
      }
    }
    return result
  })

  /**
   * Validate the current configuration.
   */
  function validate(): ConfigValidationResult {
    const errors: string[] = []

    if (!manifest.value) {
      return { valid: true, errors: [] }
    }

    for (const [key, configOption] of Object.entries(manifest.value.configuration)) {
      const option = configOption as ConfigOption

      // Skip validation for hidden options
      if (!isOptionVisible(key)) continue

      const value = config.value[key]

      // Type-specific validation
      switch (option.type) {
        case 'string':
          if (value !== undefined && typeof value !== 'string') {
            errors.push(`${option.label} must be a string`)
          }
          break
        case 'number':
          if (value !== undefined && typeof value !== 'number') {
            errors.push(`${option.label} must be a number`)
          }
          break
        case 'boolean':
          if (value !== undefined && typeof value !== 'boolean') {
            errors.push(`${option.label} must be a boolean`)
          }
          break
        case 'select':
          if (value !== undefined && option.options) {
            const validValues = option.options.map((o: { value: string }) => o.value)
            if (!validValues.includes(value as string)) {
              errors.push(`${option.label} has invalid value`)
            }
          }
          break
        case 'multiselect':
          if (value !== undefined) {
            if (!Array.isArray(value)) {
              errors.push(`${option.label} must be an array`)
            } else if (option.options) {
              const validValues = option.options.map((o: { value: string }) => o.value)
              const invalidValues = (value as string[]).filter((v: string) => !validValues.includes(v))
              if (invalidValues.length > 0) {
                errors.push(`${option.label} has invalid values: ${invalidValues.join(', ')}`)
              }
            }
          }
          break
      }
    }

    return { valid: errors.length === 0, errors }
  }

  /**
   * Check if a condition string evaluates to true.
   * Conditions are in the format "config.{key}" or "config.{key}.{nested}"
   */
  function evaluateCondition(condition: string): boolean {
    // Parse "config.email.enabled" or "config.bookingModes"
    const match = condition.match(/^config\.(.+)$/)
    if (!match) return true // Invalid condition format, assume true

    const configPath = match[1]
    if (!configPath) return true

    // Handle nested paths like "email.enabled"
    const value = config.value[configPath]

    // Return truthy check
    return Boolean(value)
  }

  /**
   * Get collections that are enabled based on current configuration.
   * Filters out optional collections whose conditions are not met.
   */
  function getEnabledCollections(): PackageCollection[] {
    if (!manifest.value) return []

    return manifest.value.collections.filter((collection: PackageCollection) => {
      // Non-optional collections are always included
      if (!collection.optional) return true

      // Optional collections need their condition to be met
      if (collection.condition) {
        return evaluateCondition(collection.condition)
      }

      // Optional without condition - include by default
      return true
    })
  }

  /**
   * Get collections that are disabled based on current configuration.
   */
  function getDisabledCollections(): PackageCollection[] {
    if (!manifest.value) return []

    return manifest.value.collections.filter((collection: PackageCollection) => {
      if (!collection.optional) return false

      if (collection.condition) {
        return !evaluateCondition(collection.condition)
      }

      return false
    })
  }

  /**
   * Get the layer name (from manifest or editable).
   */
  const layerName = computed(() => {
    if (!manifest.value) return ''
    return manifest.value.layer.name
  })

  /**
   * Check if layer name is editable.
   */
  const layerEditable = computed(() => {
    if (!manifest.value) return false
    return manifest.value.layer.editable
  })

  // Initialize defaults when manifest changes
  watch(manifest, (newManifest: PackageManifest | null) => {
    if (newManifest) {
      initDefaults()
    }
  }, { immediate: true })

  return {
    // State
    config,
    manifest,

    // Computed
    visibleOptions,
    layerName,
    layerEditable,

    // Methods
    initDefaults,
    getConfigValue,
    setConfigValue,
    isOptionVisible,
    validate,
    evaluateCondition,
    getEnabledCollections,
    getDisabledCollections
  }
}
