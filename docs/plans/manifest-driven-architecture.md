# Plan: Manifest-Driven Package Architecture

## Status (Updated Feb 17, 2026)

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1 | Not started | Canonical manifest type + core field types |
| Phase 2 | ~15% done | `module-registry.mjs` converted; `module-registry.json` is live intermediate |
| Phase 3 | ~10% done | `useIntakePrompt.ts` reads from registry JSON; schema-designer deleted |
| Phase 4 | Not started | Unified module (optional) |

### Recent Commits That Overlap With This Plan

| Commit | Date | What it did | Impact on plan |
|--------|------|-------------|----------------|
| `2543fadf` | Feb 17 | Extracted module registry to shared `module-registry.json` | Phase 2.2d done; created transitional JSON |
| `f21ebaed` | Feb 17 | Deleted `crouton-schema-designer` package | Phase 3.8 N/A; **broke 5 manifest type imports** |
| `808eba07` | Feb 16 | Added `image`/`file` field types to CLI | Partial Phase 1.4 (CLI only, not MCP/designer) |
| `5e670f51` | Feb 17 | Fixed AI generating auto-generated fields | Workaround for Phase 3.3 (hardcoded, not manifest-driven) |
| `78d5df9c` | Feb 17 | MCP silently skips auto-generated fields | Workaround for Phase 3.7 (hardcoded, not manifest-sourced) |

### Decisions Made

1. **Migration strategy: Big bang** — Create all 16+ manifests in one phase, then delete `module-registry.json`. No fallback/transitional layer.
2. **Field type aliases (greenfield)**:
   - `integer` → alias for `number` (same SQLite INTEGER, same component)
   - `datetime` → alias for `date` (same TIMESTAMP, same component)
   - `uuid` → **dropped** (just a `string` in SQLite; `id` is auto-generated)
   - Result: **11 canonical types + 2 aliases** in core manifest
3. **Broken manifest imports** — Fix in Phase 1 when the new type lands (phantom imports, don't affect builds)
4. **`crouton-schema-designer`** — Deleted, no longer in plan scope. Phase 3.8 removed entirely.
5. **Manifest format: `.ts` with jiti** — Manifests are TypeScript files. CLI uses `jiti` to import them at runtime. Opens the door to progressively migrate CLI from `.mjs` to `.ts`. jiti is already a Nuxt transitive dependency.
6. **Browser delivery: App config injection** — A Nuxt module reads manifests at build time and injects field types/metadata into `app.config`. Composables access via `useAppConfig()`. No server endpoint needed. Manifests rarely change so rebuild-on-change is acceptable.
7. **Ship strategy: Atomic Phase 2+3** — All of Phase 2 and Phase 3 ship as one PR. Phase 1 ships independently first. Phase 4 ships whenever convenient.
8. **Scope: Include crouton-themes + crouton-devtools** — Every package gets a manifest for completeness. Both are thin (~15 lines, no field types). Devtools benefits from manifest awareness for its inspection panel.
9. **`defineCroutonManifest()` in crouton-core** — Lives alongside the `CroutonManifest` type, not in crouton-cli. Avoids every package needing a CLI dev dependency for a one-line identity function.
10. **Manifest loader written in TypeScript** — `manifest-loader.ts` (not `.mjs`). jiti is already landing in the same wave (CLI unjs modernization Wave 1), so no reason to write the most critical new file without type safety.
11. **Alias resolution via flat map** — `getFieldTypeRegistry()` returns entries for both canonical names and aliases (e.g., both `number` and `integer`). Aliases point to the same `FieldTypeDefinition` object. Consumers never need to resolve aliases themselves — important for AI consumers (MCP, designer chat) where `integer` may appear in natural language.
12. **Interleave with CLI unjs modernization** — Not sequential. Wave 1 (jiti, c12, defu, pathe, pkg-types) ships with Manifest Phase 1-2. Wave 2 (consola) ships with Manifest Phase 2+3. See `cli-unjs-modernization.md`.

### Known Issues (Pre-existing)

- All 5 existing `crouton.manifest.ts` files import from deleted `@fyit/crouton-schema-designer/types` (broken phantom imports)
- `crouton-pages/crouton.manifest.ts` imports `defineCroutonManifest` from `@fyit/crouton-cli` (doesn't exist — will import from `@fyit/crouton-core/shared/manifest` instead)
- MCP `field-types.ts` has only 9 types (missing `image`/`file` added to CLI in `808eba07`)

---

## Context

The nuxt-crouton monorepo has ~18 packages but 4 parallel, disconnected systems describing them:

1. **`crouton.manifest.ts` files** — 5 packages have them, all with broken type imports
2. **`app/app.config.ts`** — runtime UI registration (sidebar routes, page types)
3. **CLI sources** — `module-registry.json` (16 entries), `helpers.mjs` typeMapping, `manifest-merge.mjs` hardcoded data
4. **Unified module** — `crouton/src/module.ts` with hardcoded feature-to-package mapping

**Goal**: Make `crouton.manifest.ts` the single source of truth for package metadata. Every consumer (CLI, MCP, designer, unified module) reads from manifests instead of maintaining hardcoded copies.

**What stays separate**: `app/app.config.ts` remains for runtime UI decisions (sidebar routes, page type registration) — these are UX choices that can't be schema-derived.

### Current Duplication Map

| Data | Locations | Status |
|------|-----------|--------|
| Field types (base) | CLI `helpers.mjs` (11), MCP `field-types.ts` (9), designer `useFieldTypes.ts` (15), `designer-chat.post.ts` (14) | OUT OF SYNC |
| Auto-generated fields | CLI generators, designer `useCollectionDesignPrompt.ts`, MCP `validate-schema.ts` | Inconsistent lists |
| Reserved field names | designer `useSchemaValidation.ts`, CLI validators, MCP validator | Different sets |
| Reserved collection names | designer `useSchemaValidation.ts` only | Not shared |
| Package registry | `module-registry.json` (16), 5x `crouton.manifest.ts`, `manifest-merge.mjs` (2) | 3 parallel sources |
| Feature-to-package mapping | `crouton/src/module.ts` lines 43-71 | Hardcoded, no manifest awareness |

### Key Files

| File | What it contains | Current state |
|------|-----------------|---------------|
| `packages/crouton-cli/lib/utils/helpers.mjs` | Hardcoded `typeMapping` (11 types), `mapType()` | Unchanged — needs manifest migration |
| `packages/crouton-mcp/src/utils/field-types.ts` | Hardcoded `FIELD_TYPES` (9 types, missing image/file) | OUT OF SYNC with CLI |
| `packages/crouton-designer/app/composables/useFieldTypes.ts` | Hardcoded field types (15 types with icons, labels) | Has 3 extra types (uuid, datetime, integer) |
| `packages/crouton-designer/app/composables/useSchemaValidation.ts` | Hardcoded `RESERVED_NAMES` (10), `RESERVED_COLLECTION_NAMES` (12) | Unchanged |
| `packages/crouton-designer/app/composables/useCollectionDesignPrompt.ts` | Hardcoded auto-generated field list | Has workaround fix from `5e670f51` |
| `packages/crouton-designer/app/composables/useIntakePrompt.ts` | Imports from `module-registry.json` | Converted in `2543fadf` — reads JSON dynamically |
| `packages/crouton-designer/server/api/ai/designer-chat.post.ts` | Hardcoded `fieldTypeEnum` (14 types) | Unchanged |
| `packages/crouton-cli/lib/module-registry.json` | 16 module entries | **LIVE** — designer depends on this |
| `packages/crouton-cli/lib/module-registry.mjs` | Reads from JSON, exposes `getModule()` etc. | Converted in `2543fadf` |
| `packages/crouton-cli/lib/utils/manifest-merge.mjs` | Hardcoded `PACKAGE_MANIFESTS` (only bookings + sales) | Unchanged |
| `packages/crouton/src/module.ts` | Hardcoded `getRequiredLayers()` (21 features) | Unchanged |

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
  category: 'core' | 'addon' | 'miniapp'
  bundled?: boolean                 // Included in @fyit/crouton by default

  // Layer
  layer?: {
    name: string
    editable: boolean
    reason?: string
  }

  // Dependencies
  dependencies?: string[]           // Other crouton package IDs required

  // Field type contributions
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
  aiHint?: string
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
  component?: string                // Default form component
  previewComponent?: string
  aliases?: string[]                // e.g., ['integer'] on number
  meta?: Record<string, unknown>
}

export interface ManifestCollection {
  name: string
  tableName?: string
  description: string
  schema?: Record<string, ManifestSchemaField>
  schemaPath?: string
  optional?: boolean
  condition?: string
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

**Also in this file**, add the `defineCroutonManifest()` helper (identity function with runtime validation):

```typescript
export function defineCroutonManifest(manifest: CroutonManifest): CroutonManifest {
  if (!manifest.id || !manifest.name) {
    throw new Error(`Manifest must have id and name`)
  }
  return manifest
}
```

**Subpath export** in `packages/crouton-core/package.json`:
```json
"exports": {
  "./shared/manifest": "./shared/manifest.ts"
}
```

### 1.2 ~~Create `defineCroutonManifest()` helper in crouton-cli~~ (Moved to 1.1)

`defineCroutonManifest()` now lives in `crouton-core/shared/manifest.ts` alongside the type. This keeps the manifest contract in one package — every package already depends on crouton-core, so no new dependency needed. Fixes the phantom import in crouton-pages (which was importing from `@fyit/crouton-cli`).

### 1.3 Create crouton-core manifest (base field types + reserved names)

**New file**: `packages/crouton-core/crouton.manifest.ts`

This is the canonical declaration of the 10 base field types (+ 2 aliases) and auto-generated fields:

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
    string:    { label: 'String',    icon: 'i-lucide-type',         description: 'Short text (VARCHAR 255)',         db: 'VARCHAR(255)',    drizzle: 'text',      zod: 'z.string()',            tsType: 'string',              defaultValue: "''",    component: 'UInput' },
    text:      { label: 'Text',      icon: 'i-lucide-file-text',    description: 'Long text content',                db: 'TEXT',            drizzle: 'text',      zod: 'z.string()',            tsType: 'string',              defaultValue: "''",    component: 'UTextarea' },
    number:    { label: 'Number',    icon: 'i-lucide-hash',         description: 'Integer value',                    db: 'INTEGER',         drizzle: 'integer',   zod: 'z.number()',            tsType: 'number',              defaultValue: '0',     component: 'UInputNumber', aliases: ['integer'] },
    decimal:   { label: 'Decimal',   icon: 'i-lucide-percent',      description: 'Decimal number (10,2)',            db: 'DECIMAL(10,2)',   drizzle: 'decimal',   zod: 'z.number()',            tsType: 'number',              defaultValue: '0',     component: 'UInputNumber', meta: { precision: 10, scale: 2 } },
    boolean:   { label: 'Boolean',   icon: 'i-lucide-toggle-left',  description: 'True/false toggle',                db: 'BOOLEAN',         drizzle: 'boolean',   zod: 'z.boolean()',           tsType: 'boolean',             defaultValue: 'false', component: 'UCheckbox' },
    date:      { label: 'Date',      icon: 'i-lucide-calendar',     description: 'Date/timestamp',                   db: 'TIMESTAMP',       drizzle: 'timestamp', zod: 'z.date()',              tsType: 'Date | null',         defaultValue: 'null',  component: 'CroutonCalendar', aliases: ['datetime'] },
    json:      { label: 'JSON',      icon: 'i-lucide-braces',       description: 'JSON object',                      db: 'JSON',            drizzle: 'json',      zod: 'z.record(z.any())',     tsType: 'Record<string, any>', defaultValue: '{}',    component: 'UTextarea' },
    repeater:  { label: 'Repeater',  icon: 'i-lucide-layers',       description: 'Repeatable items array',           db: 'JSON',            drizzle: 'json',      zod: 'z.array(z.any())',      tsType: 'any[]',               defaultValue: '[]',    component: 'CroutonFormRepeater' },
    array:     { label: 'Array',     icon: 'i-lucide-list',         description: 'String array',                     db: 'TEXT',            drizzle: 'text',      zod: 'z.array(z.string())',   tsType: 'string[]',            defaultValue: '[]',    component: 'UTextarea' },
    reference: { label: 'Reference', icon: 'i-lucide-link',         description: 'Reference to another collection',  db: 'VARCHAR(255)',    drizzle: 'text',      zod: 'z.string()',            tsType: 'string',              defaultValue: "''",    component: 'CroutonFormReferenceSelect' },
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

**Note on aliases**: `number` has alias `['integer']`, `date` has alias `['datetime']`. The manifest loader resolves aliases transparently — consumers see 10 canonical types. `uuid` is dropped (not a distinct storage type).

### 1.4 Create crouton-assets manifest (image + file field types)

**New file**: `packages/crouton-assets/crouton.manifest.ts`

```typescript
import type { CroutonManifest } from '@fyit/crouton-core/shared/manifest'

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

export default manifest
```

### Files changed in Phase 1
- **Create**: `packages/crouton-core/shared/manifest.ts` (type definitions + `defineCroutonManifest()` helper)
- **Create**: `packages/crouton-core/crouton.manifest.ts` (10 base field types + 2 aliases, reserved names)
- **Create**: `packages/crouton-assets/crouton.manifest.ts` (image/file field types)
- **Edit**: `packages/crouton-core/package.json` (add subpath export for `./shared/manifest`)

---

## Phase 2: Manifest Discovery + CLI Integration (Big Bang)

**Objective**: CLI reads manifests instead of hardcoded JSON. All packages get manifests in one pass. `module-registry.json` is deleted.

**Strategy**: Big bang — create all manifests, wire up the loader, then delete the JSON. No transitional fallback.

### 2.1 Create manifest loader utility

**New file**: `packages/crouton-cli/lib/utils/manifest-loader.ts`

Written in TypeScript from the start — jiti is already landing in the same wave (CLI unjs modernization Wave 1), and this is the most critical new file in the plan. No reason to lose type safety.

Scans installed packages for `crouton.manifest.ts` files using `jiti`.

Discovery order:
1. Scan `packages/crouton-*/crouton.manifest.ts` (monorepo dev)
2. Scan `node_modules/@fyit/crouton-*/crouton.manifest.ts` (installed deps)
3. Merge all manifests into a unified registry
4. Resolve aliases into flat map (see below)

Key functions:
```typescript
export function discoverManifests(rootDir: string): Promise<CroutonManifest[]>
export function getFieldTypeRegistry(manifests: CroutonManifest[]): Record<string, FieldTypeDefinition>
export function getAutoGeneratedFields(manifests: CroutonManifest[]): string[]
export function getReservedFieldNames(manifests: CroutonManifest[]): string[]
export function getModuleRegistry(manifests: CroutonManifest[]): ModuleRegistryEntry[]  // backward compat shape
```

**Alias resolution**: `getFieldTypeRegistry()` returns a flat map where aliases are expanded into separate entries pointing to the same `FieldTypeDefinition` object. For example, if `number` has `aliases: ['integer']`, the returned map contains both `number` and `integer` keys referencing the same definition. Consumers never need to resolve aliases — important for AI consumers (MCP, designer chat) where `integer` may appear in natural language.

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
- **Currently live** — designer `useIntakePrompt.ts` reads it. Must update designer (Phase 3.5) in same pass.

**Edit**: `packages/crouton-cli/lib/module-registry.mjs` *(already partially converted)*
- Change from JSON import to manifest-loader import
- `getModule()`, `listModules()` backed by manifest discovery

### 2.3 Migrate existing manifests to unified format

Update all 5 existing manifests to use the `CroutonManifest` type from crouton-core. This also fixes the broken imports from deleted `crouton-schema-designer`.

- `packages/crouton-bookings/crouton.manifest.ts` — change import to `@fyit/crouton-core/shared/manifest`, add `aiHint` + `category`
- `packages/crouton-sales/crouton.manifest.ts` — same
- `packages/crouton-triage/crouton.manifest.ts` — same
- `packages/crouton-maps/crouton.manifest.ts` — same
- `packages/crouton-pages/crouton.manifest.ts` — rewrite to `CroutonManifest` type, use `defineCroutonManifest()` from `@fyit/crouton-core/shared/manifest`

### 2.4 Add manifests to remaining packages

Create `crouton.manifest.ts` for packages currently only in `module-registry.json`. Minimal: identity + aiHint + dependencies.

Data source for each: the corresponding entry in `module-registry.json`.

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
- `packages/crouton-themes/crouton.manifest.ts` — thin manifest (no field types); declares theme components (KoLed, KoKnob, KoPanel)
- `packages/crouton-devtools/crouton.manifest.ts` — thin manifest (no field types); benefits from manifest awareness for inspection panel

### Files changed in Phase 2
- **Create**: `packages/crouton-cli/lib/utils/manifest-loader.ts`
- **Edit**: `packages/crouton-cli/lib/utils/helpers.mjs` (remove typeMapping, import from loader)
- **Edit**: `packages/crouton-cli/lib/utils/manifest-merge.mjs` (remove hardcoded data)
- **Edit**: `packages/crouton-cli/lib/module-registry.mjs` (read from manifests instead of JSON)
- **Delete**: `packages/crouton-cli/lib/module-registry.json`
- **Edit**: 5 existing `crouton.manifest.ts` files (fix broken imports, migrate type)
- **Create**: ~13 new `crouton.manifest.ts` files for remaining packages (including themes + devtools)

---

## Phase 3: Designer + MCP Consumer Migration

**Objective**: Designer and MCP read from manifests instead of local hardcoded data.

**Note**: Phase 3.5 (useIntakePrompt) must ship in the same pass as Phase 2's JSON deletion since it's a live dependency.

### 3.1 Designer: useFieldTypes.ts reads from manifests

**Edit**: `packages/crouton-designer/app/composables/useFieldTypes.ts`
- Remove hardcoded `FIELD_TYPES` array (15 types including uuid/datetime/integer)
- Remove hardcoded `META_PROPERTIES` array
- Import the merged field type registry from manifests (via server endpoint or build-time import)
- Keep the Vue-reactive wrapper (`translatedFieldTypes`, `getFieldIcon`, etc.)
- `uuid` type is dropped; `integer` and `datetime` resolve to `number`/`date` via aliases

### 3.2 Designer: useSchemaValidation.ts reads from manifests

**Edit**: `packages/crouton-designer/app/composables/useSchemaValidation.ts`
- Remove hardcoded `RESERVED_NAMES` set (line 11-14)
- Remove hardcoded `RESERVED_COLLECTION_NAMES` (line 16)
- Import from crouton-core manifest (`reservedFieldNames`, `reservedCollectionNames`)

### 3.3 Designer: useCollectionDesignPrompt.ts uses manifest data

**Edit**: `packages/crouton-designer/app/composables/useCollectionDesignPrompt.ts`
- Replace hardcoded auto-generated field list with import from crouton-core manifest `autoGeneratedFields`
- Replaces the workaround fix from commit `5e670f51`

### 3.4 Designer: designer-chat.post.ts derives fieldTypeEnum from manifests

**Edit**: `packages/crouton-designer/server/api/ai/designer-chat.post.ts`
- Remove hardcoded `fieldTypeEnum = z.enum([...])` (lines 6-11)
- Derive from manifest field type registry at request time (all canonical types + aliases)
- This ensures AI tools always accept the same types that validation accepts

### 3.5 Designer: useIntakePrompt.ts reads from manifests

**Edit**: `packages/crouton-designer/app/composables/useIntakePrompt.ts`
- Currently: `import moduleRegistry from '../../../crouton-cli/lib/module-registry.json'`
- Replace with manifest-based registry (import from manifest loader or server endpoint)
- Shape stays the same: `description` and `aiHint` per package
- **MUST ship with Phase 2** (same commit/PR) since JSON deletion breaks this import

### 3.6 MCP: field-types.ts imports from manifests

**Edit**: `packages/crouton-mcp/src/utils/field-types.ts`
- Remove entire hardcoded `FIELD_TYPES` object (9 types — currently missing `image`/`file`)
- Import from CLI's manifest loader: `getFieldTypeRegistry()`
- `isValidFieldType()` and `getFieldTypeReference()` derive from manifest data
- Fixes the out-of-sync issue where MCP was missing image/file types

### 3.7 MCP: validate-schema.ts uses manifest reserved fields

**Edit**: `packages/crouton-mcp/src/tools/validate-schema.ts`
- Remove hardcoded auto-generated field list
- Import from manifest loader: `getAutoGeneratedFields()`
- Replaces the workaround fix from commit `78d5df9c`

### Files changed in Phase 3
- **Edit**: `packages/crouton-designer/app/composables/useFieldTypes.ts`
- **Edit**: `packages/crouton-designer/app/composables/useSchemaValidation.ts`
- **Edit**: `packages/crouton-designer/app/composables/useCollectionDesignPrompt.ts`
- **Edit**: `packages/crouton-designer/app/composables/useIntakePrompt.ts`
- **Edit**: `packages/crouton-designer/server/api/ai/designer-chat.post.ts`
- **Edit**: `packages/crouton-mcp/src/utils/field-types.ts`
- **Edit**: `packages/crouton-mcp/src/tools/validate-schema.ts`

---

## Phase 4: Unified Module Migration (Optional / Later)

**Objective**: Replace hardcoded feature-to-package mapping in unified module.

### 4.1 Module reads manifests for feature discovery

**Edit**: `packages/crouton/src/module.ts`
- `getRequiredLayers()` currently has hardcoded feature-to-package mapping (21 features)
- Replace with: scan manifests, build mapping from `manifest.id` to `@fyit/${manifest.id}`
- Use `manifest.category` and `manifest.bundled` to determine defaults

**Edit**: `packages/crouton/src/types.ts`
- `CroutonOptions` currently hardcodes 18 boolean flags
- Keep explicit interface for IDE autocomplete
- Add comment linking to manifest as source of truth

### 4.2 Create getCroutonLayers() (currently phantom)

**New export in**: `packages/crouton/src/module.ts`
- Referenced in CLAUDE.md and CLI utils but doesn't exist
- Reads `crouton.config.js` features section
- Returns array of `@fyit/crouton-*` package names based on enabled features
- Uses manifest discovery to map feature IDs to package names

### Files changed in Phase 4
- **Edit**: `packages/crouton/src/module.ts`
- **Edit**: `packages/crouton/src/types.ts`

---

## app.config.ts Integration

Package `app.config.ts` files currently duplicate identity data (id, name, icon) from manifests. After manifests land, packages import identity from their own manifest:

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

Routes and page types remain local (UX choices that can't be schema-derived).

---

## What Does NOT Change
- **CLI generators** (`form-component.mjs`, `database-schema.mjs`, etc.) — they read from `typeMapping`, which now comes from manifests via the loader
- **`getSeedGenerator()` in helpers.mjs** — name-based heuristics stay in CLI (not manifest data)
- **Existing JSON schema files** (`schemas/*.json`) — these define user collections, not package metadata

---

## Verification Strategy

### After Phase 1
- `npx nuxt typecheck` in `apps/crouton-designer` — manifest types resolve
- Import `packages/crouton-core/shared/manifest.ts` from CLI — compiles

### After Phase 2 + 3 (ship together due to JSON deletion)
- Run `pnpm crouton doctor .` in test app — CLI reads manifests successfully
- Run `pnpm crouton config ./crouton.config.js` in test app — generation still works
- Verify: `module-registry.json` deleted, no import errors
- Start designer app (`pnpm dev` in `apps/crouton-designer`)
- Create new project, verify AI suggests all packages
- Verify field type dropdown shows `image` and `file`
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
| Phase 2+3 | Large | CLI reads manifests, all packages get manifests, JSON deleted, consumers migrated | crouton-cli + ~18 packages + crouton-designer + crouton-mcp |
| Phase 4 | Small | Unified module + getCroutonLayers() | crouton (unified module) |

**Ship order**: Phase 1 ships independently → Phase 2+3 ships as one atomic PR → Phase 4 ships whenever convenient.

**Total files**: ~6 created (Phase 1) + ~14 created + ~12 edited (Phase 2+3) + ~2 edited (Phase 4) = **~34 files**.