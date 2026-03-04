/** Mapbox Geocoding API feature result */
export interface MapboxFeature {
  center: [number, number]
  place_name: string
  text: string
  context?: Array<{ id: string; text: string }>
}

/** Mapbox Geocoding API response */
export interface MapboxGeocodeResponse {
  features: MapboxFeature[]
}
