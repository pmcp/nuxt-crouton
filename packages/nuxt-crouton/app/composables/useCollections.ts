// Define a type for collection names (will be extended by user's registry)
type CollectionName = string

// Type for config map entries supplied via app.config.ts
interface CollectionConfig {
  name?: string
  layer?: string
  componentName?: string
  componentDetailName?: string
  apiPath?: string
  defaultPagination?: {
    currentPage: number
    pageSize: number
    sortBy: string
    sortDirection: 'asc' | 'desc'
  }
  /**
   * Declare which fields reference other collections.
   * Enables automatic cache refresh of referenced items during mutations.
   *
   * @example
   * references: {
   *   location: 'bookingsLocations',  // 'location' field references 'bookingsLocations' collection
   *   author: 'users'                 // 'author' field references 'users' collection
   * }
   */
  references?: Record<string, string>
  /**
   * Map field names to custom dependent field renderer components.
   * Used by FormDependentFieldLoader to dynamically load custom components.
   *
   * @example
   * dependentFieldComponents: {
   *   slots: 'SlotSelect'  // When rendering 'slots' field, use SlotSelect component
   * }
   */
  dependentFieldComponents?: Record<string, string>
  [key: string]: any
}

type ConfigsMap = {
  [K in CollectionName]?: CollectionConfig
}

/**
 * Collection configuration management
 * Collections are registered via the generator in app.config.ts
 *
 * NOTE: This composable now only manages configuration, not data state.
 * For data fetching, use useCollectionQuery()
 * For mutations, use useCollectionMutation()
 */
export default function useCollections() {
  // Get the registry from app.config – each entry should provide config data
  const appConfig = useAppConfig()
  const collectionRegistry = (appConfig.croutonCollections || {}) as Record<string, CollectionConfig>

  // Build component map from configs so FormDynamicLoader can resolve forms
  const componentMap = reactive<Record<string, string>>({})
  Object.entries(collectionRegistry).forEach(([name, config]) => {
    if (config?.componentName) {
      componentMap[name] = config.componentName
    }
  })

  // Build detail component map for FormDynamicLoader to resolve detail views
  const componentDetailMap = reactive<Record<string, string>>({})
  Object.entries(collectionRegistry).forEach(([name, config]) => {
    if (config?.componentDetailName) {
      componentDetailMap[name] = config.componentDetailName
    }
  })

  // Build dependent field component map for FormDependentFieldLoader
  const dependentFieldComponentMap = reactive<Record<string, Record<string, string>>>({})
  Object.entries(collectionRegistry).forEach(([name, config]) => {
    if (config?.dependentFieldComponents) {
      dependentFieldComponentMap[name] = config.dependentFieldComponents
    }
  })

  // Get config synchronously - returns undefined for collections without configs
  const getConfig = (name: string): CollectionConfig | undefined => {
    return collectionRegistry[name]
  }

  return {
    componentMap,
    componentDetailMap,
    dependentFieldComponentMap,
    getConfig,
    configs: collectionRegistry
  }
}
