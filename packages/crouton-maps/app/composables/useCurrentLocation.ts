/**
 * Composable for getting the user's current browser location and reverse-geocoding
 * it to a structured address.
 *
 * Wraps navigator.geolocation.getCurrentPosition + useGeocode().reverseGeocode
 * into a single call. Returns null with `error` set if geolocation is unsupported,
 * the user denies permission, or geocoding fails.
 *
 * Usage:
 *   const { getCurrentLocation, loading, error } = useCurrentLocation()
 *   const result = await getCurrentLocation()
 *   if (result) {
 *     // result.coordinates: [lng, lat]
 *     // result.address:     "1600 Amphitheatre Pkwy, Mountain View, CA 94043"
 *     // result.context:     { postcode, place, region, country }
 *   }
 */

import type { GeocodeResult } from './useGeocode'

export interface CurrentLocationOptions {
  /** Geolocation API options — passed straight to getCurrentPosition. */
  enableHighAccuracy?: boolean
  /** Max age of a cached position in ms (default 0 = always fresh). */
  maximumAge?: number
  /** Timeout in ms before the geolocation request fails (default 10s). */
  timeout?: number
}

const DEFAULT_OPTIONS: Required<CurrentLocationOptions> = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 10_000
}

export function useCurrentLocation() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const { reverseGeocode } = useGeocode()

  const getCoords = (opts: Required<CurrentLocationOptions>): Promise<[number, number]> => {
    return new Promise((resolve, reject) => {
      if (!import.meta.client || typeof navigator === 'undefined' || !navigator.geolocation) {
        reject(new Error('Geolocation is not available in this environment'))
        return
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve([pos.coords.longitude, pos.coords.latitude]),
        (err) => {
          // Map GeolocationPositionError codes to readable messages
          const messages: Record<number, string> = {
            1: 'Location permission denied',
            2: 'Location unavailable',
            3: 'Location request timed out'
          }
          reject(new Error(messages[err.code] ?? err.message ?? 'Geolocation failed'))
        },
        opts
      )
    })
  }

  /**
   * Get the user's current location and reverse-geocode it to an address.
   * Returns null and sets `error` on failure (permission denied, no signal, etc.).
   */
  const getCurrentLocation = async (
    options: CurrentLocationOptions = {}
  ): Promise<GeocodeResult | null> => {
    const opts = { ...DEFAULT_OPTIONS, ...options }
    loading.value = true
    error.value = null

    try {
      const coords = await getCoords(opts)
      const result = await reverseGeocode(coords)
      if (!result) {
        error.value = 'Could not resolve address for your location'
        return null
      }
      return result
    }
    catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to get current location'
      console.error('[nuxt-crouton-maps] useCurrentLocation error:', e)
      return null
    }
    finally {
      loading.value = false
    }
  }

  return {
    getCurrentLocation,
    loading: readonly(loading),
    error: readonly(error)
  }
}
