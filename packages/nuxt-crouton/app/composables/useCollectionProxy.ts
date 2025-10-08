/**
 * Collection Proxy Handler
 *
 * Handles client-side transformation for proxied external collections.
 * When a collection has proxy configuration, this applies the transform
 * function to convert external data to Crouton format.
 */

interface ProxyConfig {
  enabled: boolean
  sourceEndpoint: string
  transform: (item: any) => { id: string; title: string; [key: string]: any }
}

/**
 * Transform response data using collection's proxy configuration
 *
 * @param data - Raw data from external endpoint
 * @param config - Collection configuration with optional proxy settings
 * @returns Transformed data in Crouton format
 */
export function useCollectionProxy() {
  const applyTransform = (data: any, config: any) => {
    // If no proxy config or proxy not enabled, return data as-is
    if (!config.proxy || !config.proxy.enabled) {
      return data
    }

    const proxy = config.proxy as ProxyConfig

    // Apply transform to array of items
    if (Array.isArray(data)) {
      return data.map(item => {
        try {
          return proxy.transform(item)
        } catch (error) {
          console.error('[useCollectionProxy] Transform failed for item:', item, error)
          return item
        }
      })
    }

    // Apply transform to single item
    if (data && typeof data === 'object') {
      try {
        return proxy.transform(data)
      } catch (error) {
        console.error('[useCollectionProxy] Transform failed for item:', data, error)
        return data
      }
    }

    return data
  }

  const getProxiedEndpoint = (config: any, apiPath: string) => {
    // If proxy enabled, use the source endpoint instead of the collection's apiPath
    if (config.proxy?.enabled && config.proxy.sourceEndpoint) {
      return config.proxy.sourceEndpoint
    }
    return apiPath
  }

  return {
    applyTransform,
    getProxiedEndpoint
  }
}
