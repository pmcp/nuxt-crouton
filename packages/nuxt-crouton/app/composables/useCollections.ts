// Define a type for collection names (will be extended by user's registry)
type CollectionName = string

// Type for config map
interface CollectionConfig {
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
 * Collections are registered via the generator in app/crouton-collections.ts
 */
export default function useCollections() {
  // Configs will be loaded dynamically from user's collections
  // Each generated collection includes its own config
  const configsMap: ConfigsMap = {}

  // Build component map from configs (will be populated by user's collections)
  const componentMap = reactive<Record<string, string>>({})
  Object.entries(configsMap).forEach(([name, config]) => {
    if (config?.componentName) {
      componentMap[name] = config.componentName
    }
  })

  // Get the registry from the plugin
  const { $croutonRegistry } = useNuxtApp()
  const collectionRegistry = $croutonRegistry || {}

  // Create reactive state for each collection
  const collections = Object.keys(collectionRegistry).reduce((acc, name) => {
    acc[name as CollectionName] = useState(name, () => [])
    return acc
  }, {} as Record<CollectionName, Ref<any[]>>)

  // Get config synchronously - returns undefined for collections without configs
  const getConfig = (name: string): CollectionConfig | undefined => {
    return configsMap[name as keyof ConfigsMap]
  }

  return {
    ...collections,
    componentMap,
    getConfig,
    configs: configsMap
  }
}
