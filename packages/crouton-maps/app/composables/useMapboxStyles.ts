/**
 * Mapbox style presets
 * @see https://docs.mapbox.com/api/maps/styles/
 */
export const MAPBOX_STYLES = {
  /** New Mapbox Standard style (recommended) - fully customizable 3D style */
  standard: 'mapbox://styles/mapbox/standard',

  /** Classic styles */
  streets: 'mapbox://styles/mapbox/streets-v12',
  outdoors: 'mapbox://styles/mapbox/outdoors-v12',
  light: 'mapbox://styles/mapbox/light-v11',
  dark: 'mapbox://styles/mapbox/dark-v11',

  /** Satellite imagery */
  satellite: 'mapbox://styles/mapbox/satellite-v9',
  satelliteStreets: 'mapbox://styles/mapbox/satellite-streets-v12',

  /** Navigation styles */
  navigationDay: 'mapbox://styles/mapbox/navigation-day-v1',
  navigationNight: 'mapbox://styles/mapbox/navigation-night-v1'
} as const

export type MapboxStylePreset = keyof typeof MAPBOX_STYLES

/**
 * Get style URL by preset name or return custom URL as-is
 *
 * @param styleOrPreset - Preset name (e.g., 'dark') or full Mapbox style URL
 * @returns Mapbox style URL
 *
 * @example
 * ```ts
 * const darkStyle = getMapboxStyle('dark') // returns mapbox://styles/mapbox/dark-v11
 * const custom = getMapboxStyle('mapbox://styles/username/custom') // returns as-is
 * ```
 */
export function getMapboxStyle(styleOrPreset: MapboxStylePreset | string): string {
  return MAPBOX_STYLES[styleOrPreset as MapboxStylePreset] || styleOrPreset
}
