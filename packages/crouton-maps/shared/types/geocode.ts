/** Normalized geocoding feature result (returned by /api/maps/geocode) */
export interface GeocodeFeature {
  center: [number, number]
  place_name: string
  text: string
  context?: Array<{ id: string; text: string }>
}

/** Normalized geocoding API response */
export interface GeocodeApiResponse {
  features: GeocodeFeature[]
}

/** @deprecated renamed to {@link GeocodeFeature} */
export type MapboxFeature = GeocodeFeature
/** @deprecated renamed to {@link GeocodeApiResponse} */
export type MapboxGeocodeResponse = GeocodeApiResponse
