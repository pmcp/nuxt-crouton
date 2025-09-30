// Define a type for collection names (will be extended by user's registry)
type CollectionName = string

// Type for config map entries supplied via app.config.ts
interface CollectionConfig {
  name?: string
  layer?: string
  componentName?: string
  apiPath?: string
  defaultPagination?: {
    currentPage: number
    pageSize: number
    sortBy: string
    sortDirection: 'asc' | 'desc'
  }
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
  const collectionRegistry = (appConfig.croutonCollections || {}) as ConfigsMap

  // Build component map from configs so DynamicFormLoader can resolve forms
  const componentMap = reactive<Record<string, string>>({})
  Object.entries(collectionRegistry).forEach(([name, config]) => {
    if (config?.componentName) {
      componentMap[name] = config.componentName
    }
  })

  // Get config synchronously - returns undefined for collections without configs
  const getConfig = (name: string): CollectionConfig | undefined => {
    return collectionRegistry[name as keyof ConfigsMap]
  }

  return {
    componentMap,
    getConfig,
    configs: collectionRegistry
  }
}
