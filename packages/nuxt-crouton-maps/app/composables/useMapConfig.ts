import type { MapConfig } from '../types'

/**
 * Access Mapbox configuration from runtime config
 * Compatible with both Nuxt-Mapbox module and custom config
 *
 * Usage:
 * const { accessToken, style } = useMapConfig()
 */
export function useMapConfig(): MapConfig {
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
    throw new Error(
      '[nuxt-crouton-maps] Mapbox access token not found in public config. '
      + 'Add it to your nuxt.config.ts:\n\n'
      + 'runtimeConfig: {\n'
      + '  public: {\n'
      + '    mapbox: {\n'
      + '      accessToken: process.env.MAPBOX_TOKEN\n'
      + '    }\n'
      + '  }\n'
      + '}\n\n'
      + 'And set MAPBOX_TOKEN in your .env file.'
    )
  }

  return {
    accessToken,
    style: mapboxConfig?.style || 'mapbox://styles/mapbox/streets-v12',
    center: mapboxConfig?.center,
    zoom: mapboxConfig?.zoom || 12
  }
}
