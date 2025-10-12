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
  navigationNight: 'mapbox://styles/mapbox/navigation-night-v1',
} as const

export type MapboxStylePreset = keyof typeof MAPBOX_STYLES

/**
 * Composable for working with Mapbox styles
 *
 * @example
 * ```vue
 * <script setup>
 * const { styles, getStyle } = useMapboxStyles()
 *
 * // Use preset
 * const darkStyle = styles.dark
 *
 * // Get style by name or pass through custom URL
 * const style = getStyle('dark') // returns URL
 * const custom = getStyle('mapbox://styles/username/custom') // returns as-is
 * </script>
 * ```
 */
export function useMapboxStyles() {
  /**
   * Get style URL by preset name or return custom URL as-is
   * @param styleOrPreset - Preset name (e.g., 'dark') or full Mapbox style URL
   * @returns Mapbox style URL
   */
  const getStyle = (styleOrPreset: MapboxStylePreset | string): string => {
    return MAPBOX_STYLES[styleOrPreset as MapboxStylePreset] || styleOrPreset
  }

  return {
    /** All available Mapbox style presets */
    styles: MAPBOX_STYLES,

    /** Helper to get style URL by preset name or return custom URL */
    getStyle,
  }
}