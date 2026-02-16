import type { MapConfig } from '../types'

/**
 * Access Mapbox configuration from runtime config
 * Compatible with both Nuxt-Mapbox module and custom config
 *
 * Usage:
 * const { accessToken, style } = useMapConfig()
 */
export function useMapConfig(): MapConfig & { isConfigured: boolean } {
  const config = useRuntimeConfig()

  // Safely access the mapbox config
  let mapboxConfig: {
    accessToken?: string
    style?: string
    center?: [number, number]
    zoom?: number
  } | undefined

  try {
    // Access public config - this must be defined in the parent app's nuxt.config
    mapboxConfig = config.public.mapbox as typeof mapboxConfig
  } catch (_e) {
    // Config not available
  }

  // Access token must be in public config for client-side access
  const accessToken = mapboxConfig?.accessToken

  if (!accessToken) {
    console.warn(
      '[nuxt-crouton-maps] Mapbox access token not found. '
      + 'Map features will be disabled. Add to nuxt.config.ts:\n\n'
      + 'runtimeConfig: { public: { mapbox: { accessToken: process.env.MAPBOX_TOKEN } } }'
    )
    return {
      isConfigured: false,
      accessToken: '',
      style: 'mapbox://styles/mapbox/streets-v12',
      center: undefined,
      zoom: 12
    }
  }

  return {
    isConfigured: true,
    accessToken,
    style: mapboxConfig?.style || 'mapbox://styles/mapbox/streets-v12',
    center: mapboxConfig?.center,
    zoom: mapboxConfig?.zoom || 12
  }
}
