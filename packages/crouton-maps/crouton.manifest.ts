import type { PackageManifest } from '@fyit/crouton-schema-designer/types'

const manifest: PackageManifest = {
  id: 'crouton-maps',
  name: 'Maps',
  description: 'Mapbox GL JS integration with map components, markers, geocoding, and style presets. Used by crouton-bookings for location maps.',
  icon: 'i-lucide-map',
  version: '0.1.0',

  layer: {
    name: 'maps',
    editable: false,
    reason: 'No database tables — provides components and composables only.'
  },

  dependencies: [
    '@fyit/crouton'
  ],

  // No collections — this is a UI/composable-only package
  collections: [],

  configuration: {
    'accessToken': {
      type: 'string',
      label: 'Mapbox Access Token',
      description: 'Set via MAPBOX_TOKEN environment variable in .env. Get a free token at https://account.mapbox.com/access-tokens/',
      default: ''
    },
    'style': {
      type: 'select',
      label: 'Default Map Style',
      description: 'Default Mapbox style for all maps. Can be overridden per component.',
      default: 'streets',
      options: [
        { value: 'streets', label: 'Streets (default)' },
        { value: 'light', label: 'Light' },
        { value: 'dark', label: 'Dark' },
        { value: 'satellite', label: 'Satellite' },
        { value: 'outdoors', label: 'Outdoors' },
        { value: 'standard', label: 'Standard (3D)' }
      ]
    }
  },

  extensionPoints: [],

  provides: {
    composables: [
      'useMap',
      'useMarker',
      'useGeocode',
      'useMapConfig',
      'useMarkerColor',
      'useMapboxStyles'
    ],
    components: [
      { name: 'CroutonMapMap', description: 'Main map container with Mapbox GL JS', props: ['center', 'zoom', 'style', 'height'] },
      { name: 'CroutonMapMarker', description: 'Map marker with optional popup', props: ['map', 'position', 'color', 'options'] },
      { name: 'CroutonMapPopup', description: 'Map popup with custom content', props: ['map', 'position'] },
      { name: 'CroutonMapsPreview', description: 'Location preview thumbnail with modal', props: ['location'] }
    ],
    apiRoutes: []
  }
}

export default manifest
