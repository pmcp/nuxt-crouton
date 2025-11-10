import type { Map, MapOptions, Marker, MarkerOptions, Popup, PopupOptions, LngLatLike } from 'mapbox-gl'

/**
 * Configuration for Mapbox maps
 */
export interface MapConfig {
  accessToken: string
  style?: string
  center?: LngLatLike
  zoom?: number
  options?: Partial<MapOptions>
}

/**
 * Map instance with state
 */
export interface MapInstance {
  map: Map | null
  isLoaded: Ref<boolean>
  error: Ref<string | null>
  container: Ref<HTMLElement | null>
}

/**
 * Marker instance with configuration
 */
export interface MarkerInstance {
  marker: Marker | null
  position: LngLatLike
  options?: MarkerOptions
}

/**
 * Popup instance with configuration
 */
export interface PopupInstance {
  popup: Popup | null
  content: string
  options?: PopupOptions
}

/**
 * Options for useMap composable
 */
export interface UseMapOptions {
  container: string | HTMLElement
  accessToken?: string
  style?: string
  center?: LngLatLike
  zoom?: number
  options?: Partial<MapOptions>
}

/**
 * Options for creating markers
 */
export interface UseMarkerOptions {
  map: Map
  position: LngLatLike
  options?: MarkerOptions
  popup?: {
    content: string
    options?: PopupOptions
  }
}

/**
 * Easing function type for animations
 * Takes progress (0-1) and returns eased progress (0-1)
 */
export type EasingFunction = (t: number) => number

/**
 * Preset easing function names
 */
export type EasingPreset = 'linear' | 'ease' | 'easeInOut' | 'easeInOutCubic'

/**
 * Animation options for marker transitions
 */
export interface MarkerAnimationOptions {
  /** Enable smooth animation when position changes (default: true) */
  animateTransitions?: boolean
  /** Animation duration in milliseconds (default: 800) */
  animationDuration?: number
  /** Animation easing function or preset name (default: 'easeInOutCubic') */
  animationEasing?: EasingPreset | EasingFunction
}

/**
 * Animation options for map flyTo transitions
 */
export interface MapFlyToOptions {
  /** Enable smooth flyTo animation when center changes (default: false) */
  flyToOnCenterChange?: boolean
  /** FlyTo animation duration in milliseconds (default: 800) */
  flyToDuration?: number
  /** FlyTo easing function (default: easeInOutCubic) */
  flyToEasing?: EasingFunction
}

// Re-export Mapbox GL JS types for convenience
export type {
  Map,
  Marker,
  Popup,
  MapOptions,
  MarkerOptions,
  PopupOptions,
  LngLatLike
}

// Re-export style types from composable
export type { MapboxStylePreset } from '../composables/useMapboxStyles'
