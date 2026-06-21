/**
 * Map style presets — OpenFreeMap (https://openfreemap.org)
 *
 * OpenFreeMap serves free, keyless MapLibre styles. No access token is required.
 * @see https://openfreemap.org/quick_start/
 */
const OFM = 'https://tiles.openfreemap.org/styles'

export const MAP_STYLES = {
  /** Full-detail default style (recommended) */
  liberty: `${OFM}/liberty`,
  /** High-contrast style */
  bright: `${OFM}/bright`,
  /** Ultra-clean minimal light style */
  positron: `${OFM}/positron`,
  /** Dark style */
  dark: `${OFM}/dark`,
  /** Muted, low-saturation style */
  fiord: `${OFM}/fiord`,

  // --- Legacy preset names (mapped to the closest OpenFreeMap style) ---
  /** @deprecated use `liberty` */
  standard: `${OFM}/liberty`,
  /** @deprecated use `liberty` */
  streets: `${OFM}/liberty`,
  /** @deprecated use `liberty` — OpenFreeMap has no dedicated outdoors style */
  outdoors: `${OFM}/liberty`,
  /** @deprecated use `positron` */
  light: `${OFM}/positron`,
  /** @deprecated no keyless satellite tiles available — falls back to `liberty` */
  satellite: `${OFM}/liberty`
} as const

export type MapStylePreset = keyof typeof MAP_STYLES

/**
 * Resolve a style preset name to an OpenFreeMap style URL. A value that is
 * already a URL (or any non-preset string) is returned unchanged, so callers
 * can pass either a preset (`'dark'`) or a full custom style URL.
 *
 * @example
 * getMapStyle('dark')     // 'https://tiles.openfreemap.org/styles/dark'
 * getMapStyle('https://example.com/style.json') // returned as-is
 */
export function getMapStyle(styleOrPreset: MapStylePreset | string): string {
  return MAP_STYLES[styleOrPreset as MapStylePreset] || styleOrPreset
}

// ---------------------------------------------------------------------------
// Backwards-compatible aliases (pre-MapLibre naming). Deprecated — prefer the
// `MAP_STYLES` / `getMapStyle` names above.
// ---------------------------------------------------------------------------

/** @deprecated renamed to {@link MAP_STYLES} */
export const MAPBOX_STYLES = MAP_STYLES
/** @deprecated renamed to {@link MapStylePreset} */
export type MapboxStylePreset = MapStylePreset
/** @deprecated renamed to {@link getMapStyle} */
export function getMapboxStyle(styleOrPreset: MapStylePreset | string): string {
  return getMapStyle(styleOrPreset)
}
