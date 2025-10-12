import type { Map } from 'mapbox-gl'
import type { UseMapOptions } from '../types'

/**
 * Core composable for managing Mapbox GL JS map instances
 * This wraps the Nuxt-Mapbox useMapbox composable to maintain backward compatibility
 */
export function useMap() {
  const mapInstance = ref<Map | null>(null)
  const isLoaded = ref(false)
  const error = ref<string | null>(null)
  const container = ref<HTMLElement | null>(null)

  const initialize = async (options: UseMapOptions): Promise<void> => {
    try {
      error.value = null

      // Get config with fallback to options
      const config = useMapConfig()
      const accessToken = options.accessToken || config.accessToken

      if (!accessToken) {
        throw new Error('Mapbox access token is required')
      }

      // Get container element
      const containerEl = typeof options.container === 'string'
        ? document.getElementById(options.container)
        : options.container

      if (!containerEl) {
        throw new Error(`Container element not found: ${options.container}`)
      }

      container.value = containerEl

      // Dynamic import for client-side only
      const mapboxgl = await import('mapbox-gl')
      const MapboxGL = mapboxgl.default || mapboxgl

      // Set access token
      if (MapboxGL.accessToken !== undefined) {
        MapboxGL.accessToken = accessToken
      }

      // Create map instance
      const Map = mapboxgl.Map || mapboxgl.default?.Map
      if (!Map) {
        throw new Error('Failed to load Mapbox Map class')
      }

      mapInstance.value = new Map({
        container: containerEl,
        style: options.style || config.style || 'mapbox://styles/mapbox/streets-v12',
        center: options.center || config.center || [-122.4194, 37.7749],
        zoom: options.zoom || config.zoom || 12,
        ...options.options
      }) as Map

      // Wait for map to load
      await new Promise<void>((resolve, reject) => {
        mapInstance.value!.on('load', () => {
          isLoaded.value = true
          resolve()
        })

        mapInstance.value!.on('error', (e) => {
          error.value = e.error?.message || 'Map failed to load'
          reject(e)
        })
      })
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Failed to initialize map'
      error.value = errorMessage
      console.error('[nuxt-crouton-maps]', errorMessage, e)
      throw e
    }
  }

  const destroy = (): void => {
    if (mapInstance.value) {
      mapInstance.value.remove()
      mapInstance.value = null
      isLoaded.value = false
      container.value = null
    }
  }

  const resize = (): void => {
    if (mapInstance.value) {
      mapInstance.value.resize()
    }
  }

  // Cleanup on unmount
  onUnmounted(() => {
    destroy()
  })

  return {
    map: computed(() => mapInstance.value),
    isLoaded: readonly(isLoaded),
    error: readonly(error),
    container: readonly(container),
    initialize,
    destroy,
    resize
  }
}
