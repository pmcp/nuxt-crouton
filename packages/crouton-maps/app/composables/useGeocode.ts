/**
 * Composable for geocoding addresses to coordinates
 *
 * Usage:
 * const { geocode, reverseGeocode, loading, error } = useGeocode()
 *
 * // Forward geocoding (address → coordinates)
 * const result = await geocode('1600 Amphitheatre Parkway, Mountain View, CA')
 * // { coordinates: [-122.0840575, 37.4220656], address: '...', ... }
 *
 * // Reverse geocoding (coordinates → address)
 * const result = await reverseGeocode([-122.0840575, 37.4220656])
 */

export interface GeocodeResult {
  coordinates: [number, number]
  address: string
  placeName: string
  context?: {
    postcode?: string
    place?: string
    region?: string
    country?: string
  }
}

export function useGeocode() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const config = useMapConfig()

  /**
   * Forward geocoding: Convert address to coordinates
   */
  const geocode = async (query: string): Promise<GeocodeResult | null> => {
    try {
      loading.value = true
      error.value = null

      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${config.accessToken}`

      const response = await $fetch<any>(url)

      if (!response.features || response.features.length === 0) {
        error.value = 'No results found'
        return null
      }

      const feature = response.features[0]
      const [lng, lat] = feature.center

      return {
        coordinates: [lng, lat],
        address: feature.place_name,
        placeName: feature.text,
        context: extractContext(feature.context)
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Geocoding failed'
      error.value = errorMessage
      console.error('[nuxt-crouton-maps] Geocoding error:', e)
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Reverse geocoding: Convert coordinates to address
   */
  const reverseGeocode = async (coordinates: [number, number]): Promise<GeocodeResult | null> => {
    try {
      loading.value = true
      error.value = null

      const [lng, lat] = coordinates
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${config.accessToken}`

      const response = await $fetch<any>(url)

      if (!response.features || response.features.length === 0) {
        error.value = 'No results found'
        return null
      }

      const feature = response.features[0]

      return {
        coordinates,
        address: feature.place_name,
        placeName: feature.text,
        context: extractContext(feature.context)
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Reverse geocoding failed'
      error.value = errorMessage
      console.error('[nuxt-crouton-maps] Reverse geocoding error:', e)
      return null
    } finally {
      loading.value = false
    }
  }

  return {
    geocode,
    reverseGeocode,
    loading: readonly(loading),
    error: readonly(error)
  }
}

// Helper to extract context information
function extractContext(context?: any[]): GeocodeResult['context'] {
  if (!context) return undefined

  const result: GeocodeResult['context'] = {}

  for (const item of context) {
    if (item.id.startsWith('postcode')) {
      result.postcode = item.text
    } else if (item.id.startsWith('place')) {
      result.place = item.text
    } else if (item.id.startsWith('region')) {
      result.region = item.text
    } else if (item.id.startsWith('country')) {
      result.country = item.text
    }
  }

  return result
}
