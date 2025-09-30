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
 * Dynamic collection management using user's registry
 * Collections are registered via the generator in app.config.ts
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

  // Create reactive state for each collection
  const collections = Object.keys(collectionRegistry).reduce((acc, name) => {
    acc[name as CollectionName] = useState(name, () => [])
    return acc
  }, {} as Record<CollectionName, Ref<any[]>>)

  // Get config synchronously - returns undefined for collections without configs
  const getConfig = (name: string): CollectionConfig | undefined => {
    return collectionRegistry[name as keyof ConfigsMap]
  }

  return {
    ...collections,
    componentMap,
    getConfig,
    configs: collectionRegistry
  }
}
