# @fyit/crouton-maps

> Map integration layer for Nuxt Crouton with Mapbox support

Add interactive maps to your Nuxt Crouton applications with this powerful, easy-to-use layer built on Mapbox GL JS.

## Features

- 🗺️ **Mapbox GL JS Integration** - Beautiful, performant vector maps
- 🎯 **Easy Geocoding** - Convert addresses to coordinates and vice versa
- 📍 **Marker Management** - Simple marker and popup components
- 🔐 **Secure API Keys** - Runtime config for safe key management
- 🎨 **Nuxt UI 4 Styling** - Seamless integration with Crouton design system
- 📦 **TypeScript First** - Full type safety out of the box
- 🔌 **Extensible** - Built for future provider support (Google Maps, Leaflet, etc.)

## Installation

```bash
pnpm add @fyit/crouton-maps
```

## Setup

### 1. Add to your Nuxt config

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  extends: [
    '@fyit/crouton',
    '@fyit/crouton-maps'
  ],

  runtimeConfig: {
    public: {
      mapbox: {
        accessToken: process.env.MAPBOX_TOKEN,
        // Optional defaults
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [-122.4194, 37.7749], // [lng, lat]
        zoom: 12
      }
    }
  }
})
```

### 2. Add your Mapbox token

Create a `.env` file:

```bash
MAPBOX_TOKEN=pk.eyJ1IjoieW91ciIsImEiOiJ0b2tlbiJ9...
```

**Get a free Mapbox token:** https://account.mapbox.com/access-tokens/

## Usage

### Basic Map

```vue
<script setup lang="ts">
const center = ref<[number, number]>([-122.4194, 37.7749])
const zoom = ref(12)

const handleMapLoad = (map: any) => {
  console.log('Map loaded!', map)
}
</script>

<template>
  <CroutonMapMap
    :center="center"
    :zoom="zoom"
    height="500px"
    @load="handleMapLoad"
  />
</template>
```

### Map with Markers

```vue
<script setup lang="ts">
const mapInstance = ref(null)

const markers = [
  { position: [-122.4194, 37.7749], name: 'San Francisco' },
  { position: [-118.2437, 34.0522], name: 'Los Angeles' },
  { position: [-122.6765, 45.5231], name: 'Portland' }
]

const handleMapLoad = (map: any) => {
  mapInstance.value = map
}
</script>

<template>
  <CroutonMapMap
    :center="[-120, 37]"
    :zoom="6"
    height="600px"
    @load="handleMapLoad"
  >
    <template #default="{ map }">
      <CroutonMapMarker
        v-for="marker in markers"
        :key="marker.name"
        :map="map"
        :position="marker.position"
        :popup-content="`<h3>${marker.name}</h3>`"
        color="red"
      />
    </template>
  </CroutonMapMap>
</template>
```

### Geocoding Example

```vue
<script setup lang="ts">
const { geocode, reverseGeocode, loading, error } = useGeocode()

const address = ref('1600 Amphitheatre Parkway, Mountain View, CA')
const result = ref(null)

const searchAddress = async () => {
  result.value = await geocode(address.value)
}

const searchCoordinates = async () => {
  result.value = await reverseGeocode([-122.0840575, 37.4220656])
}
</script>

<template>
  <div>
    <UInput v-model="address" placeholder="Enter an address" />
    <UButton @click="searchAddress" :loading="loading">
      Search
    </UButton>

    <div v-if="result">
      <p>{{ result.address }}</p>
      <p>Coordinates: {{ result.coordinates }}</p>
    </div>

    <div v-if="error">
      <p class="text-red-500">{{ error }}</p>
    </div>
  </div>
</template>
```

### Interactive Map with Geocoding

```vue
<script setup lang="ts">
const { geocode, loading } = useGeocode()
const mapInstance = ref(null)
const center = ref<[number, number]>([-122.4194, 37.7749])
const markerPosition = ref<[number, number]>([-122.4194, 37.7749])
const searchQuery = ref('')

const handleSearch = async () => {
  const result = await geocode(searchQuery.value)
  if (result && mapInstance.value) {
    center.value = result.coordinates
    markerPosition.value = result.coordinates
    mapInstance.value.flyTo({
      center: result.coordinates,
      zoom: 14
    })
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex gap-2">
      <UInput
        v-model="searchQuery"
        placeholder="Search for a place..."
        class="flex-1"
        @keyup.enter="handleSearch"
      />
      <UButton @click="handleSearch" :loading="loading">
        Search
      </UButton>
    </div>

    <CroutonMapMap
      :center="center"
      :zoom="12"
      height="500px"
      @load="(map) => mapInstance = map"
    >
      <template #default="{ map }">
        <CroutonMapMarker
          :map="map"
          :position="markerPosition"
          color="red"
        />
      </template>
    </CroutonMapMap>
  </div>
</template>
```

## Components

### `<CroutonMapMap>`

Main map container component.

**Props:**
- `id` - Map container ID (auto-generated)
- `center` - Initial center coordinates `[lng, lat]`
- `zoom` - Initial zoom level (default: 12)
- `style` - Mapbox style URL
- `height` - Container height (default: '400px')
- `width` - Container width (default: '100%')
- `class` - Additional CSS classes

**Events:**
- `@load` - Emitted when map loads, receives map instance
- `@error` - Emitted on error, receives error message

**Slots:**
- `default` - Scoped slot with `{ map }` for adding markers/popups

### `<CroutonMapMarker>`

Map marker component.

**Props:**
- `map` - Map instance (required)
- `position` - Marker position `[lng, lat]` (required)
- `color` - Marker color
- `options` - Mapbox MarkerOptions
- `popupContent` - HTML content for popup

**Events:**
- `@click` - Marker clicked
- `@dragStart` - Drag started
- `@drag` - Dragging
- `@dragEnd` - Drag ended

### `<CroutonMapPopup>`

Popup component.

**Props:**
- `map` - Map instance (required)
- `position` - Popup position `[lng, lat]` (required)
- `closeButton` - Show close button (default: true)
- `closeOnClick` - Close on map click (default: true)
- `maxWidth` - Max width (default: '240px')

**Events:**
- `@open` - Popup opened
- `@close` - Popup closed

**Slots:**
- `default` - Popup content

## Composables

### `useMap()`

Core map management composable.

```typescript
const { map, isLoaded, error, initialize, destroy, resize } = useMap()

await initialize({
  container: 'map-container',
  center: [-122.4194, 37.7749],
  zoom: 12
})
```

### `useMarker()`

Marker management composable.

```typescript
const { marker, addMarker, removeMarker, setPosition, togglePopup } = useMarker()

addMarker({
  map: mapInstance,
  position: [-122.4194, 37.7749],
  popup: { content: '<h3>Hello</h3>' }
})
```

### `useGeocode()`

Geocoding composable.

```typescript
const { geocode, reverseGeocode, loading, error } = useGeocode()

// Address → Coordinates
const result = await geocode('1600 Amphitheatre Parkway')

// Coordinates → Address
const result = await reverseGeocode([-122.0840575, 37.4220656])
```

### `useMapConfig()`

Access map configuration.

```typescript
const { accessToken, style, center, zoom } = useMapConfig()
```

## Mapbox Styles

### Using Style Presets

The package provides convenient presets for all Mapbox default styles:

```vue
<script setup lang="ts">
import { MAPBOX_STYLES, useMapboxStyles } from '#imports'

// Option 1: Use constants directly
const style = MAPBOX_STYLES.dark

// Option 2: Use the composable
const { styles, getStyle } = useMapboxStyles()
const style = styles.satellite

// Option 3: Helper function (works with presets or custom URLs)
const style = getStyle('outdoors') // Returns preset URL
const custom = getStyle('mapbox://styles/username/custom-id') // Returns as-is
</script>

<template>
  <CroutonMapsMap :style="style" />
</template>
```

### Available Style Presets

- `standard` - New Mapbox Standard style (recommended) - fully customizable 3D
- `streets` - Classic streets style (default)
- `outdoors` - Topographic with hiking trails
- `light` - Minimalist light theme
- `dark` - Dark theme for night mode
- `satellite` - Satellite imagery only
- `satelliteStreets` - Satellite with street labels
- `navigationDay` - Optimized for daytime navigation
- `navigationNight` - Optimized for nighttime navigation

### Custom Styles

You can also use custom styles from [Mapbox Studio](https://studio.mapbox.com/):

```vue
<CroutonMapsMap
  style="mapbox://styles/your-username/your-custom-style-id"
/>
```

### Setting a Default Style

Set a default style for your entire app in `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      mapbox: {
        accessToken: process.env.MAPBOX_TOKEN,
        style: 'mapbox://styles/mapbox/dark-v11' // or use MAPBOX_STYLES constant
      }
    }
  }
})
```

## API Limits

**Mapbox Free Tier:**
- 50,000 map loads/month
- 100,000 geocoding requests/month
- Unlimited static maps

For higher limits, see: https://www.mapbox.com/pricing/

## TypeScript Support

All components and composables are fully typed. Import types from the package:

```typescript
import type {
  MapConfig,
  MapInstance,
  MarkerInstance,
  GeocodeResult,
  UseMapOptions
} from '@fyit/crouton-maps'
```

## Future Roadmap

- 🗺️ Additional map providers (Google Maps, Leaflet, MapLibre)
- 🎨 Custom marker components
- 📊 Heatmap support
- 🛣️ Route visualization
- 🌍 Clustering for large datasets
- 🔍 Advanced search with autocomplete

## License

MIT

## Contributing

Issues and PRs welcome at https://github.com/pmcp/nuxt-crouton

---

Built with ❤️ by FYIT
