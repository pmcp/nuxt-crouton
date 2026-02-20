# CLAUDE.md - @fyit/crouton-maps

## Package Purpose

Map integration layer for Nuxt Crouton with Mapbox GL JS. Provides map components, markers, geocoding composables, and style presets.

## Key Files

| File | Purpose |
|------|---------|
| `crouton.manifest.ts` | Package manifest (components, composables, config) |
| `nuxt.config.ts` | Layer config — private `config.mapbox.accessToken` (server key) + public browser key |
| `server/api/maps/geocode.get.ts` | Server-side geocoding proxy — keeps token out of client network requests |
| `app/components/Map.vue` | Main map container (graceful placeholder when unconfigured) |
| `app/components/Marker.vue` | Map marker component |
| `app/components/Popup.vue` | Popup component |
| `app/components/Preview.vue` | Location preview thumbnail with modal |
| `app/composables/useMapConfig.ts` | Reads Mapbox config, returns `isConfigured` flag |
| `app/composables/useMap.ts` | Map management |
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

### Environment Variables

The layer uses two env vars with different security scopes:

```bash
# .env

# PRIVATE server key — used only by the /api/maps/geocode proxy (never in client bundle)
# Can be your full/unrestricted Mapbox token
MAPBOX_TOKEN=sk.eyJ1IjoieW91ciIsImEiOiJ0b2tlbiJ9...

# PUBLIC browser key — embedded in client bundle for Mapbox GL JS tile loading
# Create a domain-restricted key at https://account.mapbox.com/access-tokens/
# Scope it to your domain (e.g. *.yourdomain.com) to limit misuse
# Falls back to MAPBOX_TOKEN if not set (acceptable for local dev)
MAPBOX_PUBLIC_TOKEN=pk.eyJ1IjoieW91ciIsImEiOiJ0b2tlbiJ9...
```

Get tokens at https://account.mapbox.com/access-tokens/

**Why two tokens?** Mapbox GL JS must authenticate tile requests client-side — this is an inherent Mapbox architecture constraint. The geocoding API calls, however, go through `/api/maps/geocode` (a server proxy) so that token never appears in client network logs. Use a domain-restricted browser key for `MAPBOX_PUBLIC_TOKEN` to limit exposure.

### Graceful Degradation

If neither token is set:
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
<!-- Safe: popupText renders as plain text (no XSS risk) -->
<CroutonMapMarker
  :map="map"
  :position="[-122.4194, 37.7749]"
  :popup-text="locationName"
  color="red"
  @click="handleClick"
/>

<!-- For rich popup content, use CroutonMapsPopup instead -->
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
| `MAPBOX_TOKEN` | Yes (for map features) | Full/unrestricted key — server only (geocoding proxy). Never exposed to client. |
| `MAPBOX_PUBLIC_TOKEN` | Recommended for production | Domain-restricted browser key for Mapbox GL JS tile loading. Falls back to `MAPBOX_TOKEN` if unset (fine for local dev). |

The layer reads both vars automatically. Consuming apps only need the `.env` entries — no `runtimeConfig` setup required.

## Testing

```bash
npx nuxt typecheck  # MANDATORY after changes
```
