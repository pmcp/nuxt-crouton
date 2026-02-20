/**
 * GET /api/maps/geocode
 *
 * Server-side proxy for Mapbox Geocoding API.
 * Keeps the private Mapbox token out of client-side network requests.
 *
 * Query params:
 *   q       - Forward geocoding: address query string
 *   lng,lat - Reverse geocoding: coordinate pair (both required together)
 *
 * The access token is read from private runtimeConfig (never exposed to the client).
 */

interface MapboxFeature {
  center: [number, number]
  place_name: string
  text: string
  context?: Array<{ id: string; text: string }>
}

interface MapboxGeocodeResponse {
  features: MapboxFeature[]
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)

  // Token comes from private runtimeConfig only
  const accessToken = (config.mapbox as { accessToken?: string } | undefined)?.accessToken

  if (!accessToken) {
    throw createError({
      status: 503,
      statusText: 'Map geocoding is not configured'
    })
  }

  const query = getQuery(event)
  const q = query.q as string | undefined
  const lngParam = query.lng as string | undefined
  const latParam = query.lat as string | undefined

  let endpoint: string

  if (q) {
    // Forward geocoding: address → coordinates
    endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json`
  } else if (lngParam && latParam) {
    // Reverse geocoding: coordinates → address
    const lng = Number(lngParam)
    const lat = Number(latParam)
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
      throw createError({ status: 400, statusText: 'Invalid coordinates' })
    }
    endpoint = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json`
  } else {
    throw createError({ status: 400, statusText: 'Provide either q (query) or lng+lat parameters' })
  }

  try {
    // Token is appended server-side — never reaches the client
    const url = `${endpoint}?access_token=${accessToken}`
    const response = await $fetch<MapboxGeocodeResponse>(url)
    return response
  } catch (err) {
    throw createError({
      status: 502,
      statusText: 'Geocoding request failed'
    })
  }
})
