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
    center?: any
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
      '[nuxt-crouton-maps] Mapbox public browser token not found. '
      + 'Map features will be disabled. Set MAPBOX_PUBLIC_TOKEN (or MAPBOX_TOKEN) in .env.\n'
      + 'Use a domain-restricted browser key from https://account.mapbox.com/access-tokens/'
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
