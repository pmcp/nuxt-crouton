# Audit: Assets Package Capabilities

## Summary

The `@fyit/crouton-assets` package is a well-structured, production-ready asset management layer for Nuxt Crouton. It provides a full media library with upload, browse, select, crop, and metadata workflows. Three production apps (velo, sintlukas, alexdeforce) already consume it.

---

## 1. Architecture Overview

### Two-Tier Design

```
┌─────────────────────────────────────────────────┐
│  @fyit/crouton-core (base)                      │
│  ├── POST /api/upload-image    → blob storage   │
│  ├── DELETE /api/upload-image  → blob cleanup   │
│  ├── GET /images/[pathname]    → blob serving    │
│  ├── CroutonImageUpload       → simple file UI  │
│  └── CroutonUsersAvatarUpload → avatar variant  │
├─────────────────────────────────────────────────┤
│  @fyit/crouton-assets (addon)                   │
│  ├── CroutonAssetsPicker      → modal browser   │
│  ├── CroutonAssetsUploader    → upload + meta   │
│  ├── CroutonAssetsLibrary     → full grid view  │
│  ├── CroutonAssetsCard        → grid/list card  │
│  ├── CroutonAssetsAssetTile   → picker tile     │
│  ├── CroutonAssetsForm        → create form     │
│  ├── CroutonAssetsFormUpdate  → edit metadata   │
│  ├── useAssetUpload()         → composable      │
│  ├── /api/assets/generate-alt-text → AI alt     │
│  └── assets-schema.json       → schema template │
├─────────────────────────────────────────────────┤
│  App (generated via crouton-generate)           │
│  └── layers/crouton/collections/assets/         │
│      ├── server/api/teams/[id]/crouton-assets/  │
│      ├── server/database/schema.ts + queries.ts │
│      ├── app/composables/useCroutonAssets.ts    │
│      └── app/components/List.vue, _Form.vue     │
└─────────────────────────────────────────────────┘
```

### Storage: NuxtHub Blob

- Files stored via `@nuxthub/core` blob storage (`hub: { blob: true }`)
- Upload: `POST /api/upload-image` accepts `FormData` with `image` or `file` field
- Serving: `GET /images/{pathname}` proxies from blob
- Delete: `DELETE /api/upload-image` with `{ pathname }` body
- Random suffix added to filenames to prevent collisions

---

## 2. File Handling Flow

### Upload Flow (Full Assets)

```
1. User selects file → CroutonImageUpload (file dialog via @vueuse/core useFileDialog)
2. Optional crop step → CroutonImageCropper (if crop prop enabled)
3. Metadata form → alt text input (single or multi-language via CroutonI18nInput)
4. Optional AI alt text → POST /api/assets/generate-alt-text (requires crouton-ai)
5. Upload to blob → POST /api/upload-image → returns { pathname, contentType, size, filename }
6. Create DB record → POST /api/teams/{teamId}/{collection} → inserts asset row
7. Emit 'uploaded' event with asset ID
```

### Upload Flow (Simple/Base)

```
1. User selects file → CroutonImageUpload
2. Upload to blob → POST /api/upload-image
3. Store pathname URL directly in field (no DB record, no metadata)
```

### Delete Flow

```
1. useAssetUpload().deleteAssetFile(pathname) → DELETE /api/upload-image
2. App-generated delete endpoint removes DB record
```

---

## 3. Validation & Constraints

### Server-Side (upload-image.post.ts)

| Constraint | Default | Configurable |
|---|---|---|
| Max file size | 10MB | `runtimeConfig.public.croutonUpload.maxSize` |
| Allowed MIME types | image/*, application/pdf, video/mp4, video/webm, audio/mpeg, audio/wav, audio/ogg | `runtimeConfig.public.croutonUpload.allowedTypes` |
| Auth required | Yes | No (always required) |
| Random suffix | Always | No |

### Supported File Categories

| Category | Content Types |
|---|---|
| image | image/png, jpeg, webp, gif, svg+xml, avif |
| document | application/pdf, word, spreadsheet, presentation |
| video | video/mp4, video/webm |
| audio | audio/mpeg, wav, ogg |
| other | anything else |

### Validation via `ensureBlob()`

NuxtHub's `ensureBlob()` validates file size and MIME type before storage.

---

## 4. Metadata Schema

### Full Schema (assets-schema.json)

| Field | Type | Required | Notes |
|---|---|---|---|
| id | string | PK | Auto-generated (nanoid) |
| teamId | string | Yes | Team ownership, ref → organisations |
| userId | string | Yes | Uploader, ref → users |
| filename | string | Yes | Original filename |
| pathname | string | Yes | Blob storage path |
| contentType | string | No | MIME type |
| size | number | No | Bytes |
| category | string | No | image/video/audio/document/other |
| width | number | No | Image width px (0 for non-images) |
| height | number | No | Image height px |
| alt | string | No | Alt text (translatable) |
| uploadedAt | date | No | Upload timestamp |
| updatedBy | string | No | Last modifier, ref → users |

### Generated DB Schema (Drizzle/SQLite)

Additional auto-generated fields: `owner`, `order`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`.

---

## 5. Components & Composables

### Components

| Component | Purpose | Key Props |
|---|---|---|
| `CroutonAssetsPicker` | Form field: trigger button → modal browser with search/filter, select existing or upload new | `v-model` (asset ID), `crop`, `collection` |
| `CroutonAssetsUploader` | Upload flow: file select → optional crop → alt text → submit | `collection`, `crop` |
| `CroutonAssetsLibrary` | Full media browser page, uses CroutonCollection with grid layout | `collection` |
| `CroutonAssetsCard` | Grid/list card rendering for CroutonCollection | `item`, `layout`, `collection` |
| `CroutonAssetsAssetTile` | Selection tile in Picker modal (checkmark overlay) | `asset`, `selected`, `selectable` |
| `CroutonAssetsForm` | Create form (wraps Uploader) | `collection`, `action`, `activeItem` |
| `CroutonAssetsFormUpdate` | Edit metadata: alt text, re-crop, revert crop | `item`, `collection` |
| `CroutonImageUpload` | Base: simple file picker with optional crop | `v-model` (URL), `crop` |
| `CroutonImageCropper` | Crop modal (used by Uploader & ImageUpload) | `file`, `aspectRatio` |

### Composables

| Composable | Returns | Purpose |
|---|---|---|
| `useAssetUpload()` | `{ uploadAsset, uploadAssets, deleteAssetFile, uploading, error, progress }` | Programmatic upload with progress tracking, multi-file support |

### Utilities (app/utils/asset.ts)

| Function | Purpose |
|---|---|
| `isImage/isVideo/isAudio/isDocument` | Content type checkers |
| `getFileCategory` | Categorize by MIME type |
| `getFileIcon` | Lucide icon mapping by type |
| `getIconColor` | Color mapping by type |
| `getFileExtension` | Extract extension from filename |
| `formatFileSize` | Human-readable bytes |
| `fileToBase64` | File → base64 data URL |
| `urlToBase64` | URL → base64 data URL |

---

## 6. Integration Points

### AI Alt Text Generation

- Endpoint: `POST /api/assets/generate-alt-text`
- Requires: `crouton-ai` package installed (`hasApp('ai')` check)
- Uses Vercel AI SDK `generateText()` with vision model
- Input: base64 image + MIME type
- Output: 1-2 sentence descriptive alt text

### i18n Support

- Alt text is translatable (marked in schema: `"translatable": true`)
- Multi-locale: uses `CroutonI18nInput` component for per-language alt text
- Translations stored as `{ translations: { en: { alt: "..." }, nl: { alt: "..." } } }`
- AI translate button available in multi-locale mode

### Stub System

- `CroutonAssetsPicker` has a stub in `crouton-core/app/components/stubs/` (priority -1)
- Falls back to `CroutonImageUpload` when assets package is not installed
- Detection via `useCroutonApps().hasApp('assets')`

### Generator Contribution (crouton.manifest.ts)

- `getFormComponent()`: returns `CroutonAssetsForm` when generating the `assets` collection itself
- `enhanceForm()`: replaces image/file fields with `CroutonAssetsPicker` in generated forms
- Detection patterns: field types `image`, `file`; refTarget patterns `asset`, `file`, `image`, `media`

### Crouton Mutation Hooks

- Picker listens for `crouton:mutation` events to auto-refresh after create/update/delete
- Clears selection if selected asset is deleted

---

## 7. Existing App Implementations

All three apps (velo, sintlukas, alexdeforce) follow the same generated pattern:

```
layers/crouton/collections/assets/
├── server/
│   ├── database/schema.ts         # Drizzle SQLite table (crouton_assets)
│   ├── database/queries.ts        # CRUD query functions
│   └── api/teams/[id]/crouton-assets/
│       ├── index.get.ts           # List assets for team
│       ├── index.post.ts          # Create asset (with team/user context)
│       ├── [assetId].patch.ts     # Update asset metadata
│       └── [assetId].delete.ts    # Delete asset
├── app/
│   ├── components/List.vue        # Custom list view (or default)
│   ├── components/_Form.vue       # Overridden by package's CroutonAssetsForm
│   └── composables/useCroutonAssets.ts  # Validation + collection config
├── nuxt.config.ts                 # Layer registration
├── types.ts                       # TypeScript types
└── README.md                      # Generated docs
```

### Key observation

- API route is `/api/teams/{teamId}/crouton-assets/` (not `/assets/`)
- The generated `_Form.vue` is prefixed with `_` indicating it's overridden by the package's `CroutonAssetsForm`
- Team auth via `resolveTeamAndCheckMembership` from `crouton-auth`

---

## 8. For Assistant Integration (Parent Research Context)

### What the package offers for file upload in an assistant:

1. **`useAssetUpload()` composable** — programmatic upload (no UI required), returns asset ID, supports progress tracking and multi-file
2. **`CroutonAssetsPicker`** — drop-in component for selecting existing assets or uploading new ones
3. **`CroutonAssetsUploader`** — standalone upload component with crop + metadata
4. **`CroutonImageUpload`** — simplest option, base package, just file → blob URL
5. **Base upload API** — `POST /api/upload-image` accepts any allowed file type, not just images

### Two integration paths:

| Approach | Complexity | What you get |
|---|---|---|
| **Simple** (base only) | Low | File → blob URL, store URL string, no metadata tracking |
| **Full Assets** | Medium | File → blob + DB record, picker UI, search, metadata, alt text, i18n, AI |

### Requirements for Full Assets:

1. `@fyit/crouton-assets` in `extends`
2. `hub: { blob: true }` in nuxt.config
3. Generate assets collection: `crouton-generate crouton assets --fields-file=...`
4. Team context available (for API routes)
