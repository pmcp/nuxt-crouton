# CLAUDE.md - @fyit/crouton-assets

## Package Purpose

Centralized asset management for Nuxt Crouton. Provides picker/uploader components and composables for a full-featured media library with team-based ownership and metadata tracking.

## Key Files

| File | Purpose |
|------|---------|
| `app/components/Picker.vue` | Browse/select existing assets |
| `app/components/Uploader.vue` | Upload with metadata form |
| `app/composables/useAssetUpload.ts` | Programmatic upload helper |
| `assets-schema.json` | Reference schema for generation |

## Architecture

```
nuxt-crouton (base)
├── POST /api/upload-image      # Upload to blob
├── GET /images/[pathname]      # Serve from blob
├── CroutonImageUpload          # Simple file picker

nuxt-crouton-assets (this package)
├── CroutonAssetsPicker         # Browse/select UI
├── CroutonAssetsUploader       # Upload + metadata
├── useAssetUpload()            # Composable
├── assets-schema.json          # Schema template

Your Project (generated)
├── layers/core/collections/assets/
│   ├── API endpoints
│   ├── Form.vue, List.vue
│   └── useCoreAssets()
```

## Setup

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  extends: [
    '@fyit/crouton',
    '@fyit/crouton-assets'
  ],
  hub: {
    blob: true  // Required: Enable NuxtHub blob storage
  }
})
```

## Generate Assets Collection

```bash
crouton-generate core assets \
  --fields-file=node_modules/@fyit/crouton-assets/assets-schema.json \
  --dialect=sqlite
```

## Usage

### In Schema (Asset Picker)

```json
{
  "imageId": {
    "type": "string",
    "refTarget": "assets",
    "meta": {
      "component": "CroutonAssetsPicker",
      "label": "Featured Image"
    }
  }
}
```

### Direct Upload (Simple)

```vue
<CroutonImageUpload
  v-model="imageUrl"
  @file-selected="handleUpload"
/>
```

### Asset Picker (Full Library)

```vue
<CroutonAssetsPicker v-model="selectedAssetId" />
```

## Component Naming

Components auto-import with `CroutonAssets` prefix:
- `Picker.vue` → `<CroutonAssetsPicker />`
- `Uploader.vue` → `<CroutonAssetsUploader />`

## Asset Schema

```typescript
{
  id: string              // Primary key
  teamId: string          // Team ownership
  userId: string          // Uploader
  filename: string        // Original filename
  pathname: string        // Blob storage path
  contentType: string     // MIME type
  size: number            // Bytes
  alt: string             // Alt text (translatable)
  uploadedAt: Date
}
```

## Common Tasks

### Add custom metadata field
1. Extend `assets-schema.json` with new field
2. Regenerate collection
3. Update uploader component if needed

### Filter assets by type
Query with `contentType` filter (e.g., `image/*`).

## Dependencies

- **Extends**: `@fyit/crouton` (required)
- **Requires**: `@nuxthub/core` with `hub.blob: true`
- **Peer deps**: `@vueuse/core ^11.0.0`

## Testing

```bash
npx nuxt typecheck  # MANDATORY after changes
```
