export interface McpCollectionConfig {
  key: string
  name: string
  layer: string
  apiPath: string
  componentName?: string
  columns?: Array<{ accessorKey: string; header: string }>
  defaultValues?: Record<string, unknown>
  sortable?: { enabled: boolean; orderField: string }
  schema?: unknown
}

/**
 * Get all registered Crouton collections from app config.
 * useAppConfig() is auto-imported by Nitro at runtime.
 */
export function getMcpCollections(): McpCollectionConfig[] {
  // useAppConfig is auto-imported by Nitro
  const appConfig = useAppConfig()
  const collections = (appConfig as Record<string, any>).croutonCollections || {}

  return Object.entries(collections).map(([key, config]) => {
    const configObj = (typeof config === 'object' ? config : {}) as Record<string, any>
    return {
      key,
      ...configObj,
      name: configObj?.name || key
    } as McpCollectionConfig
  })
}

/**
 * Find a specific collection by name (key or display name)
 */
export function getMcpCollectionByName(name: string): McpCollectionConfig | undefined {
  const collections = getMcpCollections()
  return collections.find(c => c.key === name || c.name === name)
}

/**
 * Build the API path for a collection endpoint
 */
export function getCollectionApiPath(collection: McpCollectionConfig, teamId: string): string {
  return `/api/teams/${teamId}/${collection.apiPath}`
}
