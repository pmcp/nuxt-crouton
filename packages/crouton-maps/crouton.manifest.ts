import { defineCroutonManifest, defineGeneratorContribution } from '@fyit/crouton-core/shared/manifest'

export default defineCroutonManifest({
  id: 'crouton-maps',
  name: 'Maps',
  description: 'Mapbox GL JS integration with map components, markers, geocoding, and style presets. Used by crouton-bookings for location maps.',
  icon: 'i-lucide-map',
  version: '0.1.0',
  category: 'addon',
  aiHint: 'use when app has location features or map displays',

  layer: {
    name: 'maps',
    editable: false,
    reason: 'No database tables — provides components and composables only.'
  },

  dependencies: [],

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
      'useGeocode',
      'useMapConfig',
      'useMarkerColor',
      'useMapboxStyles'
    ],
    components: [
      // Component prefix is 'CroutonMaps' — Map.vue → CroutonMapsMap, etc.
      { name: 'CroutonMapsMap', description: 'Main map container with Mapbox GL JS — graceful placeholder when unconfigured', props: ['center', 'zoom', 'style', 'height', 'flyToOnCenterChange'] },
      { name: 'CroutonMapsMarker', description: 'Map marker with optional popup text and drag support', props: ['map', 'position', 'color', 'options', 'popupText', 'animateTransitions'] },
      { name: 'CroutonMapsPopup', description: 'Map popup with custom slot content', props: ['map', 'position'] },
      { name: 'CroutonMapsPreview', description: 'Location preview thumbnail with modal — used in collection list cells', props: ['location'] }
    ],
    apiRoutes: [
      '/api/maps/geocode',
    ]
  },

  // Detection patterns — what schema fields trigger map/geocoding generation
  detects: {
    fieldNamePatterns: [
      'street', 'address', 'city', 'town', 'zip', 'zipcode',
      'postal', 'postalcode', 'postcode', 'country', 'state', 'province', 'region'
    ],
    coordinatePatterns: [
      'location', 'coordinates', 'coords', 'lat', 'latitude',
      'lng', 'lon', 'longitude', 'geocoordinates', 'latlng', 'lnglat'
    ],
  }
})

// ---------------------------------------------------------------------------
// Generator contribution — owns the map/geocoding form and list enhancements
// ---------------------------------------------------------------------------

export const generatorContribution = defineGeneratorContribution({
  enhanceForm(ctx) {
    const { detected } = ctx
    const { addressFields, coordinateField, hasAddress } = detected

    if (!hasAddress || !coordinateField) return null

    const coordinateFieldName = coordinateField.name

    // Determine which group to inject the map into
    // If coordinate field has a group (e.g. 'map'), use that — otherwise fall back to 'address'
    const coordGroup = (coordinateField.meta?.group as string) || 'address'

    const mapSection = `
       <!-- MapBox Map Display -->
      <UFormField label="Location Map" name="${coordinateFieldName}" class="not-last:pb-4">
        <CroutonMapsMap
          :center="mapCenter"
          :zoom="14"
          height="400px"
          class="rounded-lg border"
          :fly-to-on-center-change="true"
          @load="handleMapLoad"
        >
          <template #default="{ map }">
            <CroutonMapsMarker
              v-if="mapCenter[0] !== 0 || mapCenter[1] !== 0"
              :map="map"
              :position="mapCenter"
              :color="markerColor"
              :options="{ draggable: true }"
              :animate-transitions="true"
              @dragEnd="handleMarkerDragEnd"
            />
          </template>
        </CroutonMapsMap>
        <p v-if="geocoding" class="text-sm text-gray-500 mt-2">
          Geocoding address...
        </p>
      </UFormField>`

    const scriptCode = `
// Map & Geocoding functionality
const { geocode, loading: geocoding } = useGeocode()

// Parse existing coordinates from location field (handle both array and string formats)
const parseCoordinates = (value: any): [number, number] | null => {
  if (!value) return null
  if (Array.isArray(value) && value.length === 2) {
    return [Number(value[0]), Number(value[1])]
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed) && parsed.length === 2) {
        return [Number(parsed[0]), Number(parsed[1])]
      }
    } catch {
      return null
    }
  }
  return null
}

const initialCoordinates = parseCoordinates(state.value.${coordinateFieldName})
const mapCenter = ref<[number, number]>(initialCoordinates || [0, 0])
const mapInstance = ref<any>(null)

const markerColor = useMarkerColor()

// Store map instance when loaded
const handleMapLoad = (map: any) => {
  mapInstance.value = map
}

// Auto-geocode when address fields change
watchDebounced(
  () => [${addressFields.map((f: any) => `state.value.${f.name}`).join(', ')}],
  async () => {
    if (canGeocode.value) {
      await handleGeocode()
    }
  },
  { debounce: 1000, maxWait: 3000 }
)

// Check if we have enough address data to geocode
const canGeocode = computed(() => {
  return ${addressFields.map((f: any) => `!!state.value.${f.name}`).slice(0, 2).join(' || ')}
})

// Handle geocoding of address fields
const handleGeocode = async () => {
  try {
    const addressParts: string[] = []
    ${addressFields.map((f: any) => `if (state.value.${f.name}) addressParts.push(state.value.${f.name} as string)`).join('\n    ')}

    const addressQuery = addressParts.join(', ')
    if (!addressQuery.trim()) return

    const result = await geocode(addressQuery)
    if (result) {
      mapCenter.value = result.coordinates

      // Update the coordinate field in the form state (store as JSON string)
      state.value.${coordinateFieldName} = JSON.stringify(result.coordinates)
    }
  } catch (error) {
    console.error('Geocoding failed:', error)
  }
}

// Handle marker drag to update coordinates
const handleMarkerDragEnd = (position: { lng: number; lat: number }) => {
  mapCenter.value = [position.lng, position.lat]
  state.value.${coordinateFieldName} = JSON.stringify([position.lng, position.lat])
}`

    return {
      excludeFieldNames: [coordinateFieldName],
      groupInjections: { [coordGroup]: mapSection },
      scriptCode,
    }
  },

  enhanceList(ctx) {
    const { detected } = ctx
    const { coordinateField, hasAddress } = detected

    if (!hasAddress || !coordinateField) return null

    const coordinateFieldName = coordinateField.name

    return {
      cellTemplates: {
        [coordinateFieldName]: `
    <template #${coordinateFieldName}-cell="{ row }">
      <CroutonMapsPreview :location="row.original.${coordinateFieldName}" />
    </template>`,
      },
    }
  },
})
