# CLAUDE.md - @fyit/crouton-maps

## Package Purpose

Map integration layer for Nuxt Crouton with Mapbox GL JS. Provides map components, markers, geocoding composables, and style presets.

## Key Files

| File | Purpose |
|------|---------|
| `crouton.manifest.ts` | Package manifest (components, composables, config) |
| `nuxt.config.ts` | Layer config — defines `runtimeConfig.public.mapbox` from `MAPBOX_TOKEN` |
| `app/components/Map.vue` | Main map container (graceful placeholder when unconfigured) |
| `app/components/Marker.vue` | Map marker component |
| `app/components/Popup.vue` | Popup component |
| `app/components/Preview.vue` | Location preview thumbnail with modal |
| `app/composables/useMapConfig.ts` | Reads Mapbox config, returns `isConfigured` flag |
| `app/composables/useMap.ts` | Map management |
| `app/composables/useMarker.ts` | Marker management |
| `app/composables/useGeocode.ts` | Geocoding (address ↔ coords), no-ops when unconfigured |
| `app/composables/useMarkerColor.ts` | Derives marker color from CSS `--ui-primary` |
| `app/composables/useMapboxStyles.ts` | Style presets |

## Configuration

### Quick Start

1. Add `@fyit/crouton-maps` to your `extends` array
2. Set `MAPBOX_TOKEN` in your `.env` file

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  extends: [
    '@fyit/crouton',
    '@fyit/crouton-maps'
  ]
  // No runtimeConfig needed — the layer defines it automatically
  // Just set MAPBOX_TOKEN in your .env
})
```

### Environment Variable

The layer reads `MAPBOX_TOKEN` from `process.env` automatically via its own `nuxt.config.ts`. No need to add `runtimeConfig.public.mapbox` in your app — it's already defined by the layer.

```bash
# .env
MAPBOX_TOKEN=pk.eyJ1IjoieW91ciIsImEiOiJ0b2tlbiJ9...
```

Get a free token at https://account.mapbox.com/access-tokens/

### Graceful Degradation

If `MAPBOX_TOKEN` is not set:
- Map components show a placeholder ("Map unavailable — set MAPBOX_TOKEN in .env")
- `useGeocode()` returns `null` silently (no crash)
- Forms with map pickers remain fully functional (minus the map)

### Optional Overrides

To customize defaults, you can override in your app's `nuxt.config.ts`:

```typescript
runtimeConfig: {
  public: {
    mapbox: {
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [4.9041, 52.3676],  // Amsterdam [lng, lat]
      zoom: 10
    }
  }
}
```

## Components

### CroutonMapMap

```vue
<CroutonMapMap
  :center="[-122.4194, 37.7749]"
  :zoom="12"
  height="500px"
  @load="handleMapLoad"
>
  <template #default="{ map }">
    <CroutonMapMarker :map="map" :position="position" color="red" />
  </template>
</CroutonMapMap>
```

### CroutonMapMarker

```vue
<CroutonMapMarker
  :map="map"
  :position="[-122.4194, 37.7749]"
  :popup-content="'<h3>Hello</h3>'"
  color="red"
  @click="handleClick"
/>
```

### CroutonMapPopup

```vue
<CroutonMapPopup :map="map" :position="position">
  <h3>Custom Content</h3>
</CroutonMapPopup>
```

## Composables

```typescript
// Map management
const { map, isLoaded, initialize, destroy } = useMap()

// Markers
const { marker, addMarker, removeMarker, setPosition } = useMarker()

// Geocoding
const { geocode, reverseGeocode, loading, error } = useGeocode()
const coords = await geocode('1600 Amphitheatre Parkway')
const address = await reverseGeocode([-122.0840575, 37.4220656])

// Style presets
const { styles, getStyle } = useMapboxStyles()
```

## Style Presets

```typescript
import { MAPBOX_STYLES } from '#imports'

MAPBOX_STYLES.standard      // 3D customizable
MAPBOX_STYLES.streets       // Classic (default)
MAPBOX_STYLES.outdoors      // Topographic
MAPBOX_STYLES.light         // Light theme
MAPBOX_STYLES.dark          // Dark theme
MAPBOX_STYLES.satellite     // Satellite imagery
MAPBOX_STYLES.satelliteStreets
MAPBOX_STYLES.navigationDay
MAPBOX_STYLES.navigationNight
```

## Component Naming

Components auto-import with `CroutonMap` prefix:
- `Map.vue` → `<CroutonMapMap />`
- `Marker.vue` → `<CroutonMapMarker />`
- `Popup.vue` → `<CroutonMapPopup />`

## Common Tasks

### Add custom marker icon
Use `options` prop with Mapbox MarkerOptions.

### Add geocoding autocomplete
Combine `useGeocode()` with `UInput` and debounced search.

### Use custom style
Pass Mapbox Studio style URL to `style` prop.

## API Limits (Free Tier)

- 50,000 map loads/month
- 100,000 geocoding requests/month
- Unlimited static maps

## Dependencies

- **Extends**: `@fyit/crouton`
- **Core**: `nuxt-mapbox ^1.6.4`
- **Peer deps**: `nuxt ^4.0.0`, `@nuxt/ui ^4.0.0`

## Environment

| Variable | Required | Description |
|----------|----------|-------------|
| `MAPBOX_TOKEN` | Yes (for map features) | Mapbox GL access token. Maps degrade gracefully without it. |

The layer reads this via `process.env.MAPBOX_TOKEN` in its own `nuxt.config.ts`. Consuming apps only need the `.env` entry — no `runtimeConfig` setup required.

## Testing

```bash
npx nuxt typecheck  # MANDATORY after changes
```
