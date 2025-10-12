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
