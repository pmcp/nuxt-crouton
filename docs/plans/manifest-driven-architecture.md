# Plan: Manifest-Driven Package Architecture

## Status (Feb 2026)

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1 | Not started | Canonical manifest type + core field types |
| Phase 2 | Not started | CLI integration + all packages get manifests |
| Phase 3 | Not started | Designer + MCP consumer migration |
| Phase 4 | Not started | Unified module (optional) |

**Prerequisites done:**
- `scaffold-app` CLI command — complete (`df36e4e7`)
- `crouton doctor` CLI command — complete (`9b9d0f37`)
- Deploy script — complete (`4c94a6d8`)
- Designer Create App flow — complete (`ab8d2c33`)

**Supersedes:** The "Designer registry sync" task (P3 from the app-scaffold briefing) is fully covered by Phase 3.5 of this plan. The current interim solution (`useIntakePrompt.ts` imports from `module-registry.json`) works as a bridge until Phase 3.

**Independent prerequisite (not part of this plan):** Two generator bugs (missing i18n locale files, duplicate `croutonCollections` key) should be fixed before this work begins — they're in `generate-collection.mjs` and don't interact with manifest changes.

---

## Context

The nuxt-crouton monorepo has ~18 packages but 4 parallel, disconnected systems describing them:

1. **`crouton.manifest.ts` files** — 5 packages have them, 2 incompatible formats
2. **`app/app.config.ts`** — runtime UI registration (sidebar routes, page types)
3. **CLI hardcoded JSON** — `module-registry.json`, `manifest-merge.mjs` with embedded data
4. **Unified module** — `crouton/src/module.ts` with hardcoded feature-to-package mapping

Field types are duplicated in 5 places, reserved field names in 4+, component mappings in 3. The schema designer v2 (Phase A complete) is the primary consumer — its Phase D explicitly deferred manifests until real requirements emerged from building the designer. Those requirements are now clear.

**Goal**: Make `crouton.manifest.ts` the single source of truth for package metadata. Every consumer (CLI, MCP, designer, unified module) reads from manifests instead of maintaining hardcoded copies.

**What stays separate**: `app/app.config.ts` remains for runtime UI decisions (sidebar routes, page type registration) — these are UX choices that can't be schema-derived.

### Current Duplication Map

| Data | Locations | Status |
|------|-----------|--------|
| Field types (base) | CLI `helpers.mjs`, MCP `field-types.ts`, designer `useFieldTypes.ts`, schema-designer `useFieldTypes.ts`, `designer-chat.post.ts` | OUT OF SYNC (MCP missing image/file) |
| Auto-generated fields | CLI generators, designer `useCollectionDesignPrompt.ts`, MCP `validate-schema.ts` | Inconsistent lists |
| Reserved field names | designer `useSchemaValidation.ts`, CLI validators, MCP validator | Different sets |
| Reserved collection names | designer `useSchemaValidation.ts` only | Not shared |
| Package registry | `module-registry.json`, 5x `crouton.manifest.ts`, `manifest-merge.mjs` hardcoded | 3 parallel sources |
| Feature-to-package mapping | `crouton/src/module.ts` lines 43-71 | Hardcoded, no manifest awareness |

### Key Files to Understand

| File | What it contains | Lines of interest |
|------|-----------------|-------------------|
| `packages/crouton-cli/lib/utils/helpers.mjs` | Canonical `typeMapping` (11 types), `mapType()` | Lines 44-46, 93-171 |
| `packages/crouton-mcp/src/utils/field-types.ts` | Duplicate `FIELD_TYPES` (9 types, missing image/file) | Lines 14-78 |
| `packages/crouton-designer/app/composables/useFieldTypes.ts` | UI field types (15 types with icons, labels) | Lines 3-121 |
| `packages/crouton-designer/app/composables/useSchemaValidation.ts` | Hardcoded `RESERVED_NAMES` (10), `RESERVED_COLLECTION_NAMES` (12) | Lines 11-16 |
| `packages/crouton-designer/app/composables/useCollectionDesignPrompt.ts` | Hardcoded auto-generated field list | Line 89 |
| `packages/crouton-designer/app/composables/useIntakePrompt.ts` | Imports from `module-registry.json` (cross-package) | Line 2 |
| `packages/crouton-designer/server/api/ai/designer-chat.post.ts` | Hardcoded `fieldTypeEnum` for AI tools | Lines 6-11 |
| `packages/crouton-cli/lib/module-registry.json` | 16 module entries with description, deps, aiHint | Full file |
| `packages/crouton-cli/lib/utils/manifest-merge.mjs` | Hardcoded `PACKAGE_MANIFESTS` (only bookings + sales) | Lines 22-50 |
| `packages/crouton/src/module.ts` | Hardcoded `getRequiredLayers()` (18 features) | Lines 43-71 |
| `packages/crouton/src/types.ts` | `CroutonOptions` with 18 boolean feature flags | Full file |
| `packages/crouton-pages/crouton.manifest.ts` | Imports phantom `defineCroutonManifest` (doesn't exist) | Import line |
| `packages/crouton-schema-designer/server/utils/package-registry.ts` | Hardcoded `WORKSPACE_PACKAGES` (only 2 of 18 packages) | Top of file |

### Existing Manifest Audit

| Package | Has manifest? | Format | Notes |
|---------|--------------|--------|-------|
| crouton-bookings | Yes | `PackageManifest` (phantom import) | Has collections, config, extension points |
| crouton-sales | Yes | `PackageManifest` (phantom import) | Has collections, config |
| crouton-triage | Yes | `PackageManifest` (phantom import) | Has collections |
| crouton-maps | Yes | `PackageManifest` (phantom import) | Has collections, config |
| crouton-pages | Yes | `defineCroutonManifest()` (different format) | Incompatible structure |
| crouton-core | No | — | Should declare base field types |
| crouton-assets | No | — | Should declare image/file field types |
| crouton-auth | No | — | In module-registry.json only |
| crouton-admin | No | — | In module-registry.json only |
| crouton-i18n | No | — | In module-registry.json only |
| crouton-editor | No | — | In module-registry.json only |
| crouton-ai | No | — | In module-registry.json only |
| crouton-flow | No | — | In module-registry.json only |
| crouton-email | No | — | In module-registry.json only |
| crouton-events | No | — | In module-registry.json only |
| crouton-collab | No | — | In module-registry.json only |
| crouton-designer | No | — | Not in any registry |
| crouton-mcp-toolkit | No | — | Not in any registry |

---

## Phase 1: Canonical Manifest Type + Core Field Types

**Objective**: Define the manifest schema and declare base field types in one place.

### 1.1 Create manifest type in crouton-core

Create a plain TypeScript file (no Vue/Nuxt deps) exportable via subpath:

**New file**: `packages/crouton-core/shared/manifest.ts`

```typescript
export interface CroutonManifest {
  // Identity
  id: string                        // e.g., 'crouton-bookings'
  name: string                      // Display name
  description: string               // AI-readable description
  icon: string                      // Lucide icon class
  version: string

  // Classification
  category: 'core' | 'addon' | 'miniapp'  // bundled core, optional addon, or full mini-app
  bundled?: boolean                 // Included in @fyit/crouton by default

  // Layer
  layer?: {
    name: string                    // Layer name (table prefix)
    editable: boolean
    reason?: string
  }

  // Dependencies
  dependencies?: string[]           // Other crouton package IDs required

  // Field type contributions (NEW - the key addition)
  fieldTypes?: Record<string, FieldTypeDefinition>

  // Auto-generated fields (only crouton-core declares this)
  autoGeneratedFields?: string[]
  reservedFieldNames?: string[]
  reservedCollectionNames?: string[]

  // Collections this package provides
  collections?: ManifestCollection[]

  // Configuration options
  configuration?: Record<string, ManifestConfigOption>

  // Extension points
  extensionPoints?: ManifestExtensionPoint[]

  // What the package provides
  provides?: {
    composables?: string[]
    components?: ManifestComponent[]
    apiRoutes?: string[]
  }

  // AI hints (migrated from module-registry.json)
  aiHint?: string                   // When AI should suggest this package
}

export interface FieldTypeDefinition {
  label: string
  icon: string
  description: string
  db: string                        // e.g., 'VARCHAR(255)'
  drizzle: string                   // e.g., 'text'
  zod: string                       // e.g., 'z.string()'
  tsType: string                    // e.g., 'string'
  defaultValue: string              // e.g., "''"
  component?: string                // Default form component: 'UInput'
  previewComponent?: string         // Preview component (if different)
  aliases?: string[]                // e.g., integer is alias for number
  meta?: Record<string, unknown>    // Default meta properties
}

export interface ManifestCollection {
  name: string
  tableName?: string
  description: string
  schema?: Record<string, ManifestSchemaField>
  schemaPath?: string               // Relative path to JSON file
  optional?: boolean
  condition?: string                // e.g., 'config.email.enabled'
  hierarchy?: boolean | { parentField: string; orderField: string }
}

export interface ManifestSchemaField {
  type: string
  meta?: Record<string, unknown>
  refTarget?: string
  refScope?: string
}

export interface ManifestConfigOption {
  type: 'boolean' | 'string' | 'number' | 'select' | 'multiselect'
  label: string
  description?: string
  default: unknown
  options?: Array<{ value: string; label: string }>
}

export interface ManifestExtensionPoint {
  collection: string
  allowedFields: string[]
  description: string
}

export interface ManifestComponent {
  name: string
  description: string
  props?: string[]
}
```

**Subpath export** in `packages/crouton-core/package.json`:
```json
"exports": {
  "./shared/manifest": "./shared/manifest.ts"
}
```

### 1.2 Create `defineCroutonManifest()` helper in crouton-cli

**New file**: `packages/crouton-cli/lib/utils/define-manifest.mjs`

Simple identity function with optional runtime validation. This makes the phantom import from crouton-pages actually work.

```javascript
export function defineCroutonManifest(manifest) {
  if (!manifest.id || !manifest.name) {
    throw new Error(`Manifest must have id and name`)
  }
  return manifest
}
```

**Export from CLI package.json**:
```json
"exports": {
  ".": "./bin/crouton-generate.js",
  "./define-manifest": "./lib/utils/define-manifest.mjs"
}
```

### 1.3 Create crouton-core manifest (base field types + reserved names)

**New file**: `packages/crouton-core/crouton.manifest.ts`

This is the canonical declaration of base field types and auto-generated fields:

```typescript
import type { CroutonManifest } from './shared/manifest'

const manifest: CroutonManifest = {
  id: 'crouton-core',
  name: 'Crouton Core',
  description: 'Base CRUD framework with collections, forms, tables, and team support',
  icon: 'i-lucide-database',
  version: '1.0.0',
  category: 'core',
  bundled: true,

  fieldTypes: {
    string:   { label: 'String',   icon: 'i-lucide-type',         description: 'Short text (VARCHAR 255)',      db: 'VARCHAR(255)',    drizzle: 'text',      zod: 'z.string()',            tsType: 'string',              defaultValue: "''",    component: 'UInput' },
    text:     { label: 'Text',     icon: 'i-lucide-file-text',    description: 'Long text content',             db: 'TEXT',            drizzle: 'text',      zod: 'z.string()',            tsType: 'string',              defaultValue: "''",    component: 'UTextarea' },
    number:   { label: 'Number',   icon: 'i-lucide-hash',         description: 'Integer value',                 db: 'INTEGER',         drizzle: 'integer',   zod: 'z.number()',            tsType: 'number',              defaultValue: '0',     component: 'UInputNumber', aliases: ['integer'] },
    decimal:  { label: 'Decimal',  icon: 'i-lucide-percent',      description: 'Decimal number (10,2)',         db: 'DECIMAL(10,2)',   drizzle: 'decimal',   zod: 'z.number()',            tsType: 'number',              defaultValue: '0',     component: 'UInputNumber', meta: { precision: 10, scale: 2 } },
    boolean:  { label: 'Boolean',  icon: 'i-lucide-toggle-left',  description: 'True/false toggle',             db: 'BOOLEAN',         drizzle: 'boolean',   zod: 'z.boolean()',           tsType: 'boolean',             defaultValue: 'false', component: 'UCheckbox' },
    date:     { label: 'Date',     icon: 'i-lucide-calendar',     description: 'Date/timestamp',                db: 'TIMESTAMP',       drizzle: 'timestamp', zod: 'z.date()',              tsType: 'Date | null',         defaultValue: 'null',  component: 'CroutonCalendar', aliases: ['datetime'] },
    json:     { label: 'JSON',     icon: 'i-lucide-braces',       description: 'JSON object',                   db: 'JSON',            drizzle: 'json',      zod: 'z.record(z.any())',     tsType: 'Record<string, any>', defaultValue: '{}',    component: 'UTextarea' },
    repeater: { label: 'Repeater', icon: 'i-lucide-layers',       description: 'Repeatable items array',        db: 'JSON',            drizzle: 'json',      zod: 'z.array(z.any())',      tsType: 'any[]',               defaultValue: '[]',    component: 'CroutonFormRepeater' },
    array:    { label: 'Array',    icon: 'i-lucide-list',         description: 'String array',                  db: 'TEXT',            drizzle: 'text',      zod: 'z.array(z.string())',   tsType: 'string[]',            defaultValue: '[]',    component: 'UTextarea' },
    reference:{ label: 'Reference',icon: 'i-lucide-link',         description: 'Reference to another collection',db: 'VARCHAR(255)',   drizzle: 'text',      zod: 'z.string()',            tsType: 'string',              defaultValue: "''",    component: 'CroutonFormReferenceSelect' },
  },

  autoGeneratedFields: [
    'id', 'teamId', 'owner',
    'createdAt', 'updatedAt', 'createdBy', 'updatedBy'
  ],

  reservedFieldNames: [
    'id', 'teamId', 'owner',
    'createdAt', 'updatedAt', 'createdBy', 'updatedBy',
    'order', 'optimisticId', 'optimisticAction',
    'parentId', 'path', 'depth'
  ],

  reservedCollectionNames: [
    'api', 'server', 'app', 'pages', 'components',
    'composables', 'layouts', 'middleware', 'plugins',
    'assets', 'public', 'node_modules'
  ],

  provides: {
    composables: ['useCollections', 'useCollectionImport', 'useCroutonApps', 'useDisplayConfig'],
    components: [
      { name: 'CroutonCollection', description: 'Full CRUD table' },
      { name: 'CroutonDetail', description: 'Generic detail view' },
      { name: 'CroutonFormLayout', description: 'Form layout with slots' },
      { name: 'CroutonDefaultCard', description: 'Display-aware card' }
    ]
  }
}

export default manifest
```

### 1.4 Create crouton-assets manifest (image + file field types)

**New file**: `packages/crouton-assets/crouton.manifest.ts`

```typescript
const manifest: CroutonManifest = {
  id: 'crouton-assets',
  name: 'Media Library',
  description: 'Image and file upload with cropping, drag-drop, and CDN caching',
  icon: 'i-lucide-image',
  version: '1.0.0',
  category: 'addon',
  dependencies: ['crouton-core'],

  fieldTypes: {
    image: { label: 'Image', icon: 'i-lucide-image',     description: 'Image upload', db: 'VARCHAR(255)', drizzle: 'text', zod: 'z.string()', tsType: 'string', defaultValue: "''", component: 'CroutonAssetsPicker' },
    file:  { label: 'File',  icon: 'i-lucide-paperclip', description: 'File upload',  db: 'VARCHAR(255)', drizzle: 'text', zod: 'z.string()', tsType: 'string', defaultValue: "''", component: 'CroutonAssetsPicker' },
  },

  aiHint: 'When user needs image uploads, file attachments, or media management',
}
```

### Files changed in Phase 1
- **Create**: `packages/crouton-core/shared/manifest.ts` (type definitions)
- **Create**: `packages/crouton-core/crouton.manifest.ts` (base field types, reserved names)
- **Create**: `packages/crouton-assets/crouton.manifest.ts` (image/file field types)
- **Create**: `packages/crouton-cli/lib/utils/define-manifest.mjs` (helper function)
- **Edit**: `packages/crouton-core/package.json` (add subpath export)
- **Edit**: `packages/crouton-cli/package.json` (add export for define-manifest)

---

## Phase 2: Manifest Discovery + CLI Integration

**Objective**: CLI reads manifests instead of hardcoded JSON.

### 2.1 Create manifest loader utility

**New file**: `packages/crouton-cli/lib/utils/manifest-loader.mjs`

Scans installed packages for `crouton.manifest.ts` files using `jiti` (already used by schema-designer's package-registry.ts). Falls back to reading from `node_modules/` or workspace paths.

Discovery order:
1. Scan `packages/crouton-*/crouton.manifest.ts` (monorepo dev)
2. Scan `node_modules/@fyit/crouton-*/crouton.manifest.ts` (installed deps)
3. Merge all manifests into a unified registry

Key functions:
```javascript
export function discoverManifests(rootDir)        // -> CroutonManifest[]
export function getFieldTypeRegistry(manifests)    // -> merged Record<string, FieldTypeDefinition>
export function getAutoGeneratedFields(manifests)  // -> string[]
export function getReservedFieldNames(manifests)   // -> string[]
export function getModuleRegistry(manifests)       // -> same shape as current module-registry.json (backward compat)
```

### 2.2 Replace CLI hardcoded sources

**Edit**: `packages/crouton-cli/lib/utils/helpers.mjs`
- Remove hardcoded `typeMapping` object (lines 93-171)
- Remove hardcoded `mapType()` function (line 44-46)
- Import from manifest loader: `getFieldTypeRegistry()` provides the merged type mapping
- Export a `loadTypeMapping()` function that lazy-loads from manifests
- Keep `getSeedGenerator()` (name-based heuristics don't belong in manifests)

**Edit**: `packages/crouton-cli/lib/utils/manifest-merge.mjs`
- Remove hardcoded `PACKAGE_MANIFESTS` object (lines 22-50)
- Replace with: load manifests via `discoverManifests()`, filter by enabled features
- `mergePackageCollections()` reads from real manifest files instead of embedded data

**Delete**: `packages/crouton-cli/lib/module-registry.json`
- All data migrated into per-package manifests
- Replace with `getModuleRegistry()` call from manifest-loader for any legacy consumers

**Edit**: `packages/crouton-cli/lib/module-registry.mjs`
- Change from JSON import to manifest-loader import
- `getModule()`, `listModules()` backed by manifest discovery

### 2.3 Migrate existing manifests to unified format

Update all 5 existing manifests to use the `CroutonManifest` type from crouton-core:

- `packages/crouton-bookings/crouton.manifest.ts` — migrate from phantom `PackageManifest` type, add `aiHint` from module-registry.json
- `packages/crouton-sales/crouton.manifest.ts` — same
- `packages/crouton-triage/crouton.manifest.ts` — same
- `packages/crouton-maps/crouton.manifest.ts` — same
- `packages/crouton-pages/crouton.manifest.ts` — migrate from `defineCroutonManifest()` format to unified type (keep using `defineCroutonManifest()` but with new type)

### 2.4 Add manifests to remaining packages

Create `crouton.manifest.ts` for packages that currently only exist in `module-registry.json`. These are minimal — identity + aiHint + dependencies:

- `packages/crouton-auth/crouton.manifest.ts`
- `packages/crouton-admin/crouton.manifest.ts`
- `packages/crouton-i18n/crouton.manifest.ts`
- `packages/crouton-editor/crouton.manifest.ts`
- `packages/crouton-ai/crouton.manifest.ts`
- `packages/crouton-flow/crouton.manifest.ts`
- `packages/crouton-email/crouton.manifest.ts`
- `packages/crouton-events/crouton.manifest.ts`
- `packages/crouton-collab/crouton.manifest.ts`
- `packages/crouton-designer/crouton.manifest.ts`
- `packages/crouton-mcp-toolkit/crouton.manifest.ts`

Data source: `module-registry.json` entries (description, dependencies, bundled, aiHint, tables).

### Files changed in Phase 2
- **Create**: `packages/crouton-cli/lib/utils/manifest-loader.mjs`
- **Edit**: `packages/crouton-cli/lib/utils/helpers.mjs` (remove typeMapping, import from loader)
- **Edit**: `packages/crouton-cli/lib/utils/manifest-merge.mjs` (remove hardcoded data)
- **Edit**: `packages/crouton-cli/lib/module-registry.mjs` (read from manifests)
- **Delete**: `packages/crouton-cli/lib/module-registry.json`
- **Edit**: 5 existing `crouton.manifest.ts` files (migrate type import)
- **Create**: ~11 new `crouton.manifest.ts` files for remaining packages

---

## Phase 3: Designer + MCP Consumer Migration

**Objective**: Designer and MCP read from manifests instead of local hardcoded data.

### 3.1 Designer: useFieldTypes.ts reads from manifests

**Edit**: `packages/crouton-designer/app/composables/useFieldTypes.ts`
- Remove hardcoded `FIELD_TYPES` array (lines 3-109)
- Remove hardcoded `META_PROPERTIES` array (lines 111-121)
- Import the merged field type registry (via a new composable or server API that aggregates manifests)
- Keep the Vue-reactive wrapper (`translatedFieldTypes`, `getFieldIcon`, etc.)
- Add i18n label/description lookups as before

Implementation approach: The designer extends crouton-core, so it can import the core manifest at build time. For dynamic package discovery (when features change), provide a server endpoint `/api/designer/field-types` that runs manifest discovery and returns the merged registry. The composable can `useFetch` this, or import statically from discovered manifests at build time.

### 3.2 Designer: useSchemaValidation.ts reads from manifests

**Edit**: `packages/crouton-designer/app/composables/useSchemaValidation.ts`
- Remove hardcoded `RESERVED_NAMES` set (line 11-14)
- Remove hardcoded `RESERVED_COLLECTION_NAMES` (line 16)
- Import from crouton-core manifest (`reservedFieldNames`, `reservedCollectionNames`)

### 3.3 Designer: useCollectionDesignPrompt.ts uses manifest data

**Edit**: `packages/crouton-designer/app/composables/useCollectionDesignPrompt.ts`
- Line 89 hardcodes auto-generated fields: `id, teamId, createdAt, updatedAt, createdBy, updatedBy`
- Replace with import from crouton-core manifest `autoGeneratedFields`

### 3.4 Designer: designer-chat.post.ts derives fieldTypeEnum from manifests

**Edit**: `packages/crouton-designer/server/api/ai/designer-chat.post.ts`
- Remove hardcoded `fieldTypeEnum = z.enum([...])` (lines 6-11)
- Derive from manifest field type registry at request time
- This ensures AI tools always accept the same types that validation accepts

### 3.5 Designer: useIntakePrompt.ts reads from manifests instead of module-registry.json

**Edit**: `packages/crouton-designer/app/composables/useIntakePrompt.ts`
- Line 2: `import moduleRegistry from '../../../crouton-cli/lib/module-registry.json'`
- Replace with manifest-based registry (either imported statically from discovered manifests or via server endpoint)
- Shape stays the same: `description` and `aiHint` per package

### 3.6 MCP: field-types.ts imports from CLI/manifests

**Edit**: `packages/crouton-mcp/src/utils/field-types.ts`
- Remove entire hardcoded `FIELD_TYPES` object (lines 14-78)
- Import from CLI's manifest loader: `getFieldTypeRegistry()`
- `isValidFieldType()` and `getFieldTypeReference()` now derive from manifest data

### 3.7 MCP: validate-schema.ts uses manifest reserved fields

**Edit**: `packages/crouton-mcp/src/tools/validate-schema.ts`
- Remove hardcoded auto-generated field list (line 62)
- Import from manifest loader: `getAutoGeneratedFields()`

### 3.8 Schema-designer (v1): migrate if still used

**Edit**: `packages/crouton-schema-designer/app/composables/useFieldTypes.ts`
- Remove hardcoded field types (13 types)
- Import from crouton-core manifest
- Keep `META_PROPERTIES` (or also derive from manifest if added)

**Edit**: `packages/crouton-schema-designer/server/utils/package-registry.ts`
- Remove hardcoded `WORKSPACE_PACKAGES = ['crouton-bookings', 'crouton-sales']`
- Replace with manifest discovery

**Delete**: `packages/crouton-schema-designer/app/types/package-manifest.ts`
- Type now lives in `packages/crouton-core/shared/manifest.ts`

### Files changed in Phase 3
- **Edit**: `packages/crouton-designer/app/composables/useFieldTypes.ts`
- **Edit**: `packages/crouton-designer/app/composables/useSchemaValidation.ts`
- **Edit**: `packages/crouton-designer/app/composables/useCollectionDesignPrompt.ts`
- **Edit**: `packages/crouton-designer/app/composables/useIntakePrompt.ts`
- **Edit**: `packages/crouton-designer/server/api/ai/designer-chat.post.ts`
- **Edit**: `packages/crouton-mcp/src/utils/field-types.ts`
- **Edit**: `packages/crouton-mcp/src/tools/validate-schema.ts`
- **Edit**: `packages/crouton-schema-designer/app/composables/useFieldTypes.ts`
- **Edit**: `packages/crouton-schema-designer/server/utils/package-registry.ts`
- **Delete**: `packages/crouton-schema-designer/app/types/package-manifest.ts`

---

## Phase 4: Unified Module Migration (Optional / Later)

**Objective**: Replace hardcoded feature-to-package mapping in unified module.

### 4.1 Module reads manifests for feature discovery

**Edit**: `packages/crouton/src/module.ts`
- `getRequiredLayers()` currently has hardcoded feature-to-package mapping (lines 43-71)
- Replace with: scan manifests, build mapping from `manifest.id` to `@fyit/${manifest.id}`
- Use `manifest.category` and `manifest.bundled` to determine defaults

**Edit**: `packages/crouton/src/types.ts`
- `CroutonOptions` currently hardcodes 18 boolean flags
- Could be derived from manifest discovery, but keep explicit interface for IDE autocomplete
- Add comment linking to manifest as source of truth

### 4.2 Create getCroutonLayers() (currently phantom)

**New export in**: `packages/crouton/src/module.ts`
- This function is referenced in CLAUDE.md and CLI utils but doesn't exist
- Reads `crouton.config.js` features section
- Returns array of `@fyit/crouton-*` package names based on enabled features
- Uses manifest discovery to map feature IDs to package names

### Files changed in Phase 4
- **Edit**: `packages/crouton/src/module.ts`
- **Edit**: `packages/crouton/src/types.ts`

---

## app.config.ts Integration

Package `app.config.ts` files currently duplicate identity data (id, name, icon) from manifests — and sometimes diverge (bookings has `i-heroicons-calendar` in manifest but `i-lucide-calendar` in app.config).

**Approach**: Packages import identity from their own manifest. Routes and page types remain local.

```typescript
// packages/crouton-bookings/app/app.config.ts
import manifest from '../crouton.manifest'

export default defineAppConfig({
  croutonApps: {
    [manifest.id]: {
      id: manifest.id,
      name: `${manifest.id}.title`,    // i18n key convention
      icon: manifest.icon,              // single source of truth
      adminRoutes: [...],               // package-specific decisions
      dashboardRoutes: [...],
      pageTypes: [...]
    }
  }
})
```

For scaffolded apps, the CLI generates `app.config.ts` from manifest data when running `crouton scaffold-app`.

**`useCroutonApps()` composable** — continues reading from `app.config.croutonApps`, no changes needed.

---

## What Does NOT Change
- **CLI generators** (`form-component.mjs`, `database-schema.mjs`, etc.) — they read from `typeMapping`, which now comes from manifests via the loader
- **`getSeedGenerator()` in helpers.mjs** — name-based heuristics stay in CLI (not manifest data)
- **Existing JSON schema files** (`schemas/*.json`) — these define user collections, not package metadata

---

## Migration Path for Existing Manifests

| Package | Current Format | Action |
|---------|---------------|--------|
| crouton-bookings | `PackageManifest` from phantom import | Change import to `@fyit/crouton-core/shared/manifest`, add `aiHint` + `category` |
| crouton-sales | `PackageManifest` from phantom import | Same as above |
| crouton-triage | `PackageManifest` from phantom import | Same as above |
| crouton-maps | `PackageManifest` from phantom import | Same as above, add `fieldTypes` if applicable |
| crouton-pages | `defineCroutonManifest()` (different format) | Rewrite to `CroutonManifest` type, keep `defineCroutonManifest()` wrapper |

All existing manifest data (collections, configuration, extensionPoints, provides) carries over — the type is a superset.

---

## Verification Strategy

### After Phase 1
- `npx nuxt typecheck` in `apps/crouton-designer` — manifest types resolve
- Import `packages/crouton-core/shared/manifest.ts` from CLI — compiles

### After Phase 2
- Run `pnpm crouton doctor .` in test app — CLI reads manifests successfully
- Run `pnpm crouton config ./crouton.config.js` in test app — generation still works
- Verify: `module-registry.json` deleted, no import errors

### After Phase 3
- Start designer app (`pnpm dev` in `apps/crouton-designer`)
- Create new project, verify AI suggests all packages (not just 2)
- In Phase 2, verify field type dropdown shows `image` and `file`
- Create collection with `image` field, verify validation passes
- Run MCP inspector: `validate_schema` accepts `image` and `file` types
- `npx nuxt typecheck` in all modified packages

### After Phase 4
- Verify `getCroutonLayers()` works from nuxt.config.ts
- Add a new test package with manifest — verify auto-discovered

---

## Scope Summary

| Phase | Effort | Impact | Packages Touched |
|-------|--------|--------|------------------|
| Phase 1 | Medium | Foundation — types + core manifest | crouton-core, crouton-cli, crouton-assets |
| Phase 2 | Large | CLI reads manifests, all packages get manifests | crouton-cli + ~16 packages |
| Phase 3 | Medium | Consumers migrate, duplicates deleted | crouton-designer, crouton-mcp, crouton-schema-designer |
| Phase 4 | Small | Unified module + getCroutonLayers() | crouton (unified module) |

Phases 1-3 are the core work. Phase 4 is optional cleanup that can follow later.
