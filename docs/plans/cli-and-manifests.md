# Plan: Manifest-Driven Architecture + CLI Modernization

> Unified plan merging `manifest-driven-architecture.md` (the "why" and phases) with `cli-unjs-modernization.md` (implementation details). CLI modernization ships inside manifest phases — not as a separate track.

---

## Status (Updated Feb 18, 2026)

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 0 | ✅ Done | 26 characterization tests covering all 11 CLI commands. All 377 tests pass. |
| Phase 1 | ✅ Done | Manifest type, core manifest (12 field types), unjs deps, c12 config loading. All verified. |
| Phase 2+3 | ✅ Done | All manifests created, CLI reads from manifests, `module-registry.json` deleted, designer + MCP consumers migrated, app.config injection working. 374 CLI tests + 32 MCP tests pass. |
| Phase 3.5 (magicast) | ✅ Done | Replaced ~260 lines of regex with magicast AST manipulation in 3 config modification sites. 374 CLI + 32 MCP tests pass. |
| Phase 4 | ✅ Done | Unified module reads manifests for feature discovery. `getCroutonLayers()` exported. Lightweight sync manifest scanner (no new deps). 374 CLI + 32 MCP tests pass. |
| Phase 5 | ✅ Done | CLI framework rewrite complete. Commander→citty, inquirer→@clack/prompts, chalk/ora→consola, fs-extra→Node built-ins. 5 legacy deps removed. 374 tests pass. |

### Recent Commits That Overlap With This Plan

| Commit | Date | What it did | Impact on plan |
|--------|------|-------------|----------------|
| `8f80a870` | Feb 17 | Created `config-builder.mjs` (config file **builder**) + CLI subpath exports | Phase 1: New file survives c12 migration — c12 replaces config **loading**, not config **building**. Subpath exports are needed for manifest loader too |
| `2543fadf` | Feb 17 | Extracted module registry to shared `module-registry.json` | Phase 2.2d done; created transitional JSON that Phase 2+3 deletes |
| `f21ebaed` | Feb 17 | Deleted `crouton-schema-designer` package (old v1) | Phase 3.8 N/A; **broke 5 manifest type imports** (phantom, non-blocking) |
| `808eba07` | Feb 16 | Added `image`/`file` field types to CLI | Partial Phase 1.2 (CLI only, not MCP/designer). MCP still has only 9 types |
| `5e670f51` | Feb 17 | Fixed AI generating auto-generated fields | Workaround for Phase 3.3 (hardcoded, not manifest-driven) |
| `78d5df9c` | Feb 17 | MCP silently skips auto-generated fields | Workaround for Phase 3.7 (hardcoded, not manifest-sourced) |
| `8e9b0f76` | Feb 17 | Fixed i18n locale + duplicate croutonCollections (5th attempt) | Evidence for Phase 5: CLI needs characterization tests — this bug was fixed 5 times across sessions (`53507978`, `d0e43558`, `9711d5fe`, `1d1db963`, `8e9b0f76`) |
| `b4d4ce3d` | Feb 17 | Injected manifest registry into app.config (Task 2.6) | Phase 2.6 complete: crouton-core module discovers manifests at build time, injects field types/reserved names into `app.config` |
| `af6677ed` | Feb 17 | Migrated designer + MCP consumers to manifest data (Phase 3) | Phase 3 complete: all 7 consumer files updated to read from manifests instead of hardcoded data |

### Schema Designer v2 Connection

The schema designer (`apps/crouton-designer/`) has Phase A complete and Phase 3 (seed data) complete. Its **Phase D** ("Package manifests, templates, undo/redo") overlaps directly with this plan:

| Designer Phase D Item | Covered By |
|----------------------|------------|
| Package `manifest.ts` design | Phase 1 (manifest type) |
| Package manifest creation | Phase 2 (all packages get manifests) |
| AI-driven package suggestions from manifests | Phase 3 (designer consumer migration) |
| Cross-phase impact detection | Phase 3 (designer reads manifest dependencies) |

Completing Phase 2+3 of this plan effectively delivers the manifest foundation that the designer's Phase D needs. The remaining Phase D work (templates, undo/redo) is designer-specific and stays in `schema-designer-v2.md`.

### Naming Clarification: Two config-builder Concerns

| Concern | File | What it does | Plan impact |
|---------|------|-------------|-------------|
| Config **building** | `lib/utils/config-builder.mjs` (NEW, from `8f80a870`) | Generates `crouton.config.js` file content as a string | **Keeps** — used by designer scaffold endpoint |
| Config **loading** | Currently inline in `generate-collection.mjs` | Detects and loads `crouton.config.{ts,js,mjs,cjs}` | **Replaced by c12** in Phase 1 |

---

## Decisions

### Architecture Decisions (from manifest plan)

| # | Decision | Answer | Rationale |
|---|----------|--------|-----------|
| 1 | Migration strategy | **Big bang** — Create all 16+ manifests in one phase, then delete `module-registry.json` | No fallback/transitional layer needed |
| 2 | Field type aliases | `integer` → alias for `number`, `datetime` → alias for `date`, `uuid` → **dropped** | 12 canonical types + 2 aliases. `uuid` is just a `string` in SQLite |
| 3 | Broken manifest imports | Fix in Phase 1 when the new type lands | Phantom imports, don't affect builds |
| 4 | `crouton-schema-designer` | Deleted (old v1), no longer in plan scope | New designer is `crouton-designer` |
| 5 | Manifest format | **`.ts` with jiti** — Manifests are TypeScript files loaded via `jiti` at runtime | Opens door to progressive CLI `.mjs` → `.ts` migration |
| 6 | Browser delivery | **App config injection** — Nuxt module reads manifests at build time, injects into `app.config` | Composables access via `useAppConfig()`. No server endpoint needed |
| 7 | Ship strategy | **Atomic Phase 2+3** — All of Phase 2 and Phase 3 ship as one PR | Phase 1 ships independently first. Phase 4 ships whenever convenient |
| 8 | Scope | **Include crouton-themes + crouton-devtools** — Every package gets a manifest | Both thin (~15 lines, no field types). Devtools benefits from manifest awareness |
| 9 | `defineCroutonManifest()` location | **crouton-core** — Lives alongside the `CroutonManifest` type | Avoids every package needing a CLI dev dependency for a one-line identity function |
| 10 | Manifest loader language | **TypeScript** — `manifest-loader.ts` not `.mjs` | jiti is already landing in the same wave. No reason to lose type safety on the most critical new file |
| 11 | Alias resolution | **Flat map** — `getFieldTypeRegistry()` returns both canonical and alias entries | Consumers never resolve aliases themselves. Important for AI consumers where `integer` may appear in natural language |
| 12 | Interleave with CLI modernization | **Not sequential** — unjs deps ship inside manifest phases | Wave 1 with Phase 1, Wave 2 with Phase 2+3, Wave 3 as Phase 5 |

### CLI Modernization Decisions

| # | Decision | Answer | Rationale |
|---|----------|--------|-----------|
| 13 | c12 config loading | **Full discovery** (like nuxt.config) | Auto-discover `.ts`/`.js`/`.mjs`/`.cjs`, env overrides, layer merging — same DX as Nuxt |
| 14 | chalk/ora cleanup | **Full cleanup in Phase 5** | All remaining chalk/ora imports migrated in Phase 5, deps removed entirely. Clean break |
| 15 | inquirer scope | **Only `rollback-interactive.mjs`** | Audit shows only 1 file imports inquirer (not 3 as originally estimated) |
| 16 | Test strategy | **Test-first, extracted as Phase 0** | Characterization tests ship as standalone Phase 0 (parallelizable with Phase 1). Citty-specific tests replace them in Phase 5 |
| 17 | Test coverage | **All 11 CLI commands** | generate, config, install, init, add, rollback, rollback-bulk, rollback-interactive, doctor, scaffold-app, seed-translations |
| 18 | Wave 1 timing | **Bundle with manifest Phase 1** | Deps only become useful when `.ts` manifests exist to load |
| 19 | config-builder.mjs coexistence | **Keep `buildCroutonConfig()`** — c12 replaces config loading, not config building | They're different concerns: c12 reads existing config files, `buildCroutonConfig()` generates new config file content for the designer scaffold endpoint |

### Review Decisions (Feb 17, 2026)

| # | Decision | Answer | Rationale |
|---|----------|--------|-----------|
| 20 | Phase 2+3 atomic PR reviewability | **Granular commits** — each commit leaves app working, `git bisect`-friendly | Solo dev, private monorepo. JSON deletion commit must include `useIntakePrompt.ts` migration |
| 21 | Browser delivery mechanism for Phase 3 | **app.config injection in Phase 2+3** (task 2.6) — crouton-core's Nuxt module injects merged registry | Phase 3 consumers need data before Phase 4. ~20 lines in module hook. Phase 4 remains focused on unified module's feature mapping |
| 22 | Manifest boilerplate | **Full `CroutonManifest` type for all** — no minimal variant | All optional fields already use `?`. Thin manifests just omit them |
| 23 | Phase 0 extraction | **Characterization tests as standalone Phase 0** — parallelizable with Phase 1 | Prevents AI agent regressions immediately. Reduces Phase 5 scope. 5x i18n bug was caused by distributed agent work without test coverage |
| 24 | Rollback strategy | **None needed** — big bang without fallback | Solo dev, private monorepo, greenfield. Fix-forward is faster than maintaining transitional layers |
| 25 | Config file modification tool | **magicast** (unjs) | Replaces ~260 lines of fragile regex in 3 config modification sites. Built on recast + babel, preserves formatting. Has built-in `addNuxtModule` helper. oxc (too low-level, no write-back API), Vite+ (dev toolchain, not code modification), knitwork (code generation strings, useful in Phase 5 but not for config modification) were evaluated and ruled out. |

### Known Issues (Pre-existing)

- All 5 existing `crouton.manifest.ts` files import from deleted `@fyit/crouton-schema-designer/types` (broken phantom imports)
- `crouton-pages/crouton.manifest.ts` imports `defineCroutonManifest` from `@fyit/crouton-cli` (doesn't exist — will import from `@fyit/crouton-core/shared/manifest` instead)
- MCP `field-types.ts` has only 9 types (missing `image`/`file` added to CLI in `808eba07`)
- CLI i18n locale / duplicate croutonCollections bug was fixed 5 times across sessions — addressed by Phase 0 characterization tests

---

## Context

The nuxt-crouton monorepo has ~18 packages but 4 parallel, disconnected systems describing them:

1. **`crouton.manifest.ts` files** — 5 packages have them, all with broken type imports
2. **`app/app.config.ts`** — runtime UI registration (sidebar routes, page types)
3. **CLI sources** — `module-registry.json` (16 entries), `helpers.mjs` typeMapping, `manifest-merge.mjs` hardcoded data
4. **Unified module** — `crouton/src/module.ts` with hardcoded feature-to-package mapping

**Goal**: Make `crouton.manifest.ts` the single source of truth for package metadata. Every consumer (CLI, MCP, designer, unified module) reads from manifests instead of maintaining hardcoded copies. Simultaneously, align the CLI's dependency stack with the unjs ecosystem (same packages Nuxt itself uses).

**What stays separate**: `app/app.config.ts` remains for runtime UI decisions (sidebar routes, page type registration) — these are UX choices that can't be schema-derived.

### Current Duplication Map

| Data | Locations | Status |
|------|-----------|--------|
| Field types (base) | CLI `helpers.mjs` (12), MCP `field-types.ts` (9), designer `useFieldTypes.ts` (15), `designer-chat.post.ts` (14) | OUT OF SYNC |
| Auto-generated fields | CLI generators, designer `useCollectionDesignPrompt.ts`, MCP `validate-schema.ts` | Inconsistent lists |
| Reserved field names | designer `useSchemaValidation.ts`, CLI validators, MCP validator | Different sets |
| Reserved collection names | designer `useSchemaValidation.ts` only | Not shared |
| Package registry | `module-registry.json` (16), 5x `crouton.manifest.ts`, `manifest-merge.mjs` (2) | 3 parallel sources |
| Feature-to-package mapping | `crouton/src/module.ts` lines 43-71 | Hardcoded, no manifest awareness |

### CLI Current Dependencies (What Changes)

| Package | Version | Purpose | Replacement | Phase |
|---------|---------|---------|-------------|-------|
| `commander` | ^11.1.0 | CLI arg parsing + subcommands | `citty` | Phase 5 |
| `chalk` | ^5.3.0 | Terminal colors | `consola` | Phase 2+3 (partial) → Phase 5 (complete) |
| `ora` | ^8.0.1 | Terminal spinners | `consola` | Phase 2+3 (partial) → Phase 5 (complete) |
| `inquirer` | ^9.2.12 | Interactive prompts | `@clack/prompts` | Phase 5 |
| `fs-extra` | ^11.2.0 | File I/O (readJson, copy) | Node `fs/promises` + `pkg-types` | Phase 5 |
| `drizzle-seed` | ^0.3.1 | Faker data for seeding | **Keep** (no unjs equivalent) | — |

### CLI Target State

| Concern | unjs Package | What It Does | Phase |
|---------|-------------|-------------|-------|
| TS imports | **jiti** | Import `.ts` manifest files from `.mjs` context | Phase 1 |
| Config loading | **c12** | Auto-discovers `crouton.config.ts` (powers `nuxt.config.ts` loading) | Phase 1 |
| Deep merge | **defu** | Config defaults merging | Phase 1 |
| Paths | **pathe** | Cross-platform path utilities | Phase 1 |
| Package reading | **pkg-types** | Safe `readPackageJSON()`, `resolvePackageJSON()` | Phase 1 |
| Logging | **consola** | Colors, spinners, log levels — replaces chalk + ora | Phase 2+3 (touched files) → Phase 5 (all files) |
| CLI framework | **citty** | Typed args, subcommands, auto-help (powers `nuxi`) | Phase 5 |
| Interactive prompts | **@clack/prompts** | Beautiful CLI prompts (powers `nuxi init`) | Phase 5 |

**Dependency delta**: Remove 5 bespoke deps, add 8 unjs deps. The unjs deps are already transitive dependencies of Nuxt, so this adds near-zero weight in monorepo context.

---

## Phase 0: CLI Characterization Tests (Standalone PR)

**Objective**: Write tests for all 11 CLI commands against the current Commander-based implementation. These protect against regressions during both manifest migration and the later CLI rewrite. Directly addresses the 5x i18n bug caused by AI agents re-introducing issues across sessions without test coverage.

**PR**: Ships independently. No dependencies on any other phase — can start immediately, parallelizable with Phase 1.

**Why extracted from Phase 5**: Previously bundled with the CLI framework rewrite, but these tests document *current* behavior and have independent value. Starting early means every subsequent phase has a safety net.

**Test file**: `packages/crouton-cli/__tests__/commands.test.mjs`

**Commands to test**:
1. `generate` — generates collection files (test with `--dry-run`)
2. `config` — loads and displays config
3. `install` — installs required modules
4. `init` — full pipeline (scaffold → generate → doctor)
5. `add` — adds modules/features
6. `rollback` — removes a single collection
7. `rollback-bulk` — removes multiple collections or entire layer
8. `rollback-interactive` — interactive removal UI
9. `doctor` — validates existing app
10. `scaffold-app` — creates boilerplate structure
11. `seed-translations` — imports i18n JSON to database

**Test pattern**: Run each command as a subprocess, assert on exit code and stdout patterns. Use temp directories for file generation tests.

### Phase 0 Files Changed

- **Create**: `packages/crouton-cli/__tests__/commands.test.mjs`

### Phase 0 Checklist

- [x] Creasorrysorryte `packages/crouton-cli/tests/integration/commands.test.ts`
- [x] Write characterization tests for all 11 commands (26 tests)
- [x] Verify all tests pass against current Commander-based CLI (377/377)
- [x] Commit: `test(crouton-cli): add Phase 0 characterization tests for all 11 CLI commands`

---

## Phase 1: Canonical Manifest Type + Coycan ire Field Types + unjs Foundation

**Objective**: Define the manifest schema, declare base field types in one place, and land the unjs packages needed for manifest loading.

**PR**: Ships independently.

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

### 1.2 Create crouton-core manifest (base field types + reserved names)

**New file**: `packages/crouton-core/crouton.manifest.ts`

This is the canonical declaration of the 12 base field types (+ 2 aliases) and auto-generated fields:

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
    image:     { label: 'Image',     icon: 'i-lucide-image',        description: 'Image upload',                     db: 'VARCHAR(255)',    drizzle: 'text',      zod: 'z.string()',            tsType: 'string',              defaultValue: "''",    component: 'CroutonImageUpload' },
    file:      { label: 'File',      icon: 'i-lucide-paperclip',    description: 'File upload',                      db: 'VARCHAR(255)',    drizzle: 'text',      zod: 'z.string()',            tsType: 'string',              defaultValue: "''",    component: 'CroutonImageUpload' },
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

**Note on aliases**: `number` has alias `['integer']`, `date` has alias `['datetime']`. The manifest loader resolves aliases transparently — consumers see 12 canonical types. `uuid` is dropped (not a distinct storage type).

### 1.3 ~~Create crouton-assets manifest (image + file field types)~~ → Moved to Phase 2

**Removed from Phase 1**: `image` and `file` field types now live in `crouton-core/crouton.manifest.ts` (task 1.2) since core already has the upload API endpoint (`upload-image.post.ts`) and components (`ImageUpload.vue`, `ImageCropper.vue`, `DropZone.vue`). The `crouton-assets` manifest is created in Phase 2.4 as a thin addon manifest (enhanced picker/gallery UX, no field type contributions).

### 1.4 Add unjs foundation packages to CLI

These packages are required for the manifest loader. Add them alongside the manifest work.

**Edit**: `packages/crouton-cli/package.json` — add dependencies:
- `jiti` — Import `.ts` manifest files from `.mjs` CLI code
- `c12` — Replace manual config loading with full discovery mode
- `defu` — Config defaults merging (manifest defaults + user overrides)
- `pathe` — Cross-platform path utilities for manifest discovery
- `pkg-types` — Safe `readPackageJSON()` for scanning packages

### 1.5 Replace config loading with c12

**Context**: Config _loading_ (detecting and reading `crouton.config.{ts,js,mjs,cjs}`) is currently done inline in `generate-collection.mjs` with manual extension scanning. Replace with c12's `loadConfig()`.

**Note**: This does NOT touch `config-builder.mjs` — that file generates config file _content_ (a different concern). It stays.

```javascript
import { loadConfig } from 'c12'

// Replaces manual extension detection in generate-collection.mjs
// Full discovery: finds crouton.config.{ts,js,mjs,cjs}, reads CROUTON_* env vars
const { config } = await loadConfig({
  name: 'crouton',
  cwd: process.cwd(),
  defaults: {
    dialect: 'sqlite',
    features: {}
  }
})
```

**Unlocks**: Users can write `crouton.config.ts` with full TypeScript + IDE autocomplete. Environment variables like `CROUTON_DIALECT=pg` work automatically.

### Phase 1 Files Changed

- **Create**: `packages/crouton-core/shared/manifest.ts` (type definitions + `defineCroutonManifest()` helper)
- **Create**: `packages/crouton-core/crouton.manifest.ts` (12 base field types + 2 aliases, reserved names)
- **Edit**: `packages/crouton-core/package.json` (add subpath export for `./shared/manifest`)
- **Edit**: `packages/crouton-cli/package.json` (add `jiti`, `c12`, `defu`, `pathe`, `pkg-types`)
- **Edit**: `packages/crouton-cli/lib/generate-collection.mjs` (replace inline config loading with c12)

### Phase 1 Checklist

- [x] Create `packages/crouton-core/shared/manifest.ts` with types + `defineCroutonManifest()`
- [x] Add subpath export `./shared/manifest` to `packages/crouton-core/package.json`
- [x] Create `packages/crouton-core/crouton.manifest.ts` (12 field types + 2 aliases)
- [x] Add `jiti`, `c12`, `defu`, `pathe`, `pkg-types` to `packages/crouton-cli/package.json`
- [x] Replace config loading in `generate-collection.mjs` with c12
- [ ] Use `pathe` for path operations in new files (deferred to Phase 2 — no new files yet)
- [x] Verify: `crouton config` still works with c12 loading (no behavioral change)
- [x] Verify: `crouton.config.ts` supported via c12's jiti integration
- [x] Verify: `npx nuxt typecheck` — pre-existing i18n errors only, no manifest-related regressions
- [x] Import `packages/crouton-core/shared/manifest.ts` from CLI via jiti — works (12 field types loaded)

---

## Phase 2+3: All Manifests + CLI Integration + Consumer Migration (Atomic PR)

**Objective**: CLI reads manifests instead of hardcoded JSON. All packages get manifests in one pass. `module-registry.json` is deleted. Designer and MCP read from manifests. consola logging in all touched files.

**Strategy**: Big bang — create all manifests, wire up the loader, migrate consumers, then delete the JSON. No transitional fallback. Phase 2 and Phase 3 must ship as one atomic PR because task 3.5 (designer's `useIntakePrompt.ts`) depends on `module-registry.json` which Phase 2 deletes.

### Phase 2: Manifest Discovery + CLI Integration

#### 2.1 Create manifest loader utility

**New file**: `packages/crouton-cli/lib/utils/manifest-loader.ts`

Written in TypeScript from the start — jiti is already in place from Phase 1.

Discovery order:
1. Scan `packages/crouton-*/crouton.manifest.ts` (monorepo dev)
2. Scan `node_modules/@fyit/crouton-*/crouton.manifest.ts` (installed deps)
3. Merge all manifests into a unified registry
4. Resolve aliases into flat map

Key functions:
```typescript
import { createJiti } from 'jiti'
import { resolve, join } from 'pathe'
import { readPackageJSON } from 'pkg-types'
import { defu } from 'defu'

export function discoverManifests(rootDir: string): Promise<CroutonManifest[]>
export function getFieldTypeRegistry(manifests: CroutonManifest[]): Record<string, FieldTypeDefinition>
export function getAutoGeneratedFields(manifests: CroutonManifest[]): string[]
export function getReservedFieldNames(manifests: CroutonManifest[]): string[]
export function getModuleRegistry(manifests: CroutonManifest[]): ModuleRegistryEntry[]  // backward compat shape
```

**Alias resolution**: `getFieldTypeRegistry()` returns a flat map where aliases are expanded. Both `number` and `integer` keys reference the same definition. Consumers never need to resolve aliases.

#### 2.2 Replace CLI hardcoded sources

**Edit**: `packages/crouton-cli/lib/utils/helpers.mjs`
- Remove hardcoded `typeMapping` object (lines 93-171)
- Remove hardcoded `mapType()` function (line 44-46)
- Import from manifest loader: `getFieldTypeRegistry()` provides the merged type mapping
- Export a `loadTypeMapping()` function that lazy-loads from manifests
- Keep `getSeedGenerator()` (name-based heuristics don't belong in manifests)
- **consola**: Replace any chalk/ora logging in this file with `consola`

**Edit**: `packages/crouton-cli/lib/utils/manifest-merge.mjs`
- Remove hardcoded `PACKAGE_MANIFESTS` object (lines 22-50)
- Replace with: load manifests via `discoverManifests()`, filter by enabled features
- `mergePackageCollections()` reads from real manifest files instead of embedded data
- **consola**: Replace chalk/ora logging in this file with `consola`

**Delete**: `packages/crouton-cli/lib/module-registry.json`
- All data migrated into per-package manifests
- **Currently live** — designer `useIntakePrompt.ts` reads it. Must update designer (task 3.5) in same pass.

**Edit**: `packages/crouton-cli/lib/module-registry.mjs` *(already partially converted)*
- Change from JSON import to manifest-loader import
- `getModule()`, `listModules()` backed by manifest discovery
- **consola**: Replace chalk/ora logging in this file with `consola`

#### 2.3 Migrate existing manifests to unified format

Update all 5 existing manifests to use the `CroutonManifest` type from crouton-core. This also fixes the broken imports from deleted `crouton-schema-designer`.

- `packages/crouton-bookings/crouton.manifest.ts` — change import to `@fyit/crouton-core/shared/manifest`, add `aiHint` + `category`
- `packages/crouton-sales/crouton.manifest.ts` — same
- `packages/crouton-triage/crouton.manifest.ts` — same
- `packages/crouton-maps/crouton.manifest.ts` — same
- `packages/crouton-pages/crouton.manifest.ts` — rewrite to `CroutonManifest` type, use `defineCroutonManifest()` from `@fyit/crouton-core/shared/manifest`

#### 2.4 Add manifests to remaining packages

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
- `packages/crouton-assets/crouton.manifest.ts` — thin manifest (no field types — image/file are in crouton-core); declares enhanced picker/gallery components
- `packages/crouton-themes/crouton.manifest.ts` — thin manifest (no field types); declares theme components (KoLed, KoKnob, KoPanel)
- `packages/crouton-devtools/crouton.manifest.ts` — thin manifest (no field types); benefits from manifest awareness for inspection panel

#### 2.5 Add consola to CLI (Wave 2 logging)

**Edit**: `packages/crouton-cli/package.json` — add `consola`

Replace chalk + ora in files modified by manifest work (2.2 above). Do NOT migrate untouched generator files — those are cleaned up in Phase 5.

**Migration rules** (apply only to files already being edited):
- `chalk.green('✓ ...')` → `consola.success('...')`
- `chalk.yellow('⚠ ...')` → `consola.warn('...')`
- `chalk.red('...')` → `consola.error('...')`
- `chalk.cyan('...')` → `consola.info('...')`
- `chalk.gray('...')` → `consola.log('...')`
- `ora('...').start()` → `consola.start('...')`
- `spinner.succeed('...')` → `consola.success('...')`
- `spinner.fail('...')` → `consola.error('...')`

**Intermediate state after Phase 2+3** — chalk/ora still imported in these files (cleaned up in Phase 5):
- `bin/crouton-generate.js` — rewritten entirely in Phase 5
- `lib/add-events.mjs`
- `lib/add-module.mjs`
- `lib/doctor.mjs`
- `lib/init-app.mjs`
- `lib/rollback-bulk.mjs`
- `lib/rollback-collection.mjs`
- `lib/rollback-interactive.mjs`
- `lib/scaffold-app.mjs`
- `lib/seed-translations.mjs`

#### 2.6 Add manifest injection to crouton-core's Nuxt module

**Edit**: `packages/crouton-core/src/module.ts` (or equivalent Nuxt module hook)

At build time, discover all manifests and inject the merged registry into `app.config`. This is what Phase 3 consumers read from via `useAppConfig()`.

```typescript
// In crouton-core's Nuxt module setup
const manifests = await discoverManifests(options.rootDir)
const fieldTypeRegistry = getFieldTypeRegistry(manifests)
const autoGeneratedFields = getAutoGeneratedFields(manifests)
const reservedFieldNames = getReservedFieldNames(manifests)
const reservedCollectionNames = getReservedCollectionNames(manifests)

// Inject into app.config so composables can access via useAppConfig()
nuxt.options.appConfig.crouton = defu(nuxt.options.appConfig.crouton || {}, {
  fieldTypes: fieldTypeRegistry,
  autoGeneratedFields,
  reservedFieldNames,
  reservedCollectionNames,
  modules: getModuleRegistry(manifests)
})
```

**Why here (not Phase 4)**: Phase 3 designer composables need manifest data at runtime via `useAppConfig()`. Phase 4 is about the *unified module's* feature-to-package mapping — a different concern. This is ~20 lines in crouton-core's module.

### Phase 3: Designer + MCP Consumer Migration

#### 3.1 Designer: useFieldTypes.ts reads from manifests

**Edit**: `packages/crouton-designer/app/composables/useFieldTypes.ts`
- Remove hardcoded `FIELD_TYPES` array (15 types including uuid/datetime/integer)
- Remove hardcoded `META_PROPERTIES` array
- Read merged field type registry from `useAppConfig().crouton.fieldTypes` (injected by task 2.6)
- Keep the Vue-reactive wrapper (`translatedFieldTypes`, `getFieldIcon`, etc.)
- `uuid` type is dropped; `integer` and `datetime` resolve to `number`/`date` via aliases

#### 3.2 Designer: useSchemaValidation.ts reads from manifests

**Edit**: `packages/crouton-designer/app/composables/useSchemaValidation.ts`
- Remove hardcoded `RESERVED_NAMES` set (line 11-14)
- Remove hardcoded `RESERVED_COLLECTION_NAMES` (line 16)
- Import from crouton-core manifest (`reservedFieldNames`, `reservedCollectionNames`)

#### 3.3 Designer: useCollectionDesignPrompt.ts uses manifest data

**Edit**: `packages/crouton-designer/app/composables/useCollectionDesignPrompt.ts`
- Replace hardcoded auto-generated field list with import from crouton-core manifest `autoGeneratedFields`
- Replaces the workaround fix from commit `5e670f51`

#### 3.4 Designer: designer-chat.post.ts derives fieldTypeEnum from manifests

**Edit**: `packages/crouton-designer/server/api/ai/designer-chat.post.ts`
- Remove hardcoded `fieldTypeEnum = z.enum([...])` (lines 6-11)
- Derive from manifest field type registry at request time (all canonical types + aliases)
- This ensures AI tools always accept the same types that validation accepts

#### 3.5 Designer: useIntakePrompt.ts reads from manifests

**Edit**: `packages/crouton-designer/app/composables/useIntakePrompt.ts`
- Currently: `import moduleRegistry from '../../../crouton-cli/lib/module-registry.json'`
- Replace with manifest-based registry (import from manifest loader or server endpoint)
- Shape stays the same: `description` and `aiHint` per package
- **MUST ship with Phase 2** (same commit/PR) since JSON deletion breaks this import

#### 3.6 MCP: field-types.ts imports from manifests

**Edit**: `packages/crouton-mcp/src/utils/field-types.ts`
- Remove entire hardcoded `FIELD_TYPES` object (9 types — currently missing `image`/`file`)
- Import from CLI's manifest loader: `getFieldTypeRegistry()`
- `isValidFieldType()` and `getFieldTypeReference()` derive from manifest data
- Fixes the out-of-sync issue where MCP was missing image/file types

#### 3.7 MCP: validate-schema.ts uses manifest reserved fields

**Edit**: `packages/crouton-mcp/src/tools/validate-schema.ts`
- Remove hardcoded auto-generated field list
- Import from manifest loader: `getAutoGeneratedFields()`
- Replaces the workaround fix from commit `78d5df9c`

### Phase 2+3 Files Changed

**Phase 2:**
- **Create**: `packages/crouton-cli/lib/utils/manifest-loader.ts`
- **Edit**: `packages/crouton-cli/lib/utils/helpers.mjs` (remove typeMapping, import from loader, consola)
- **Edit**: `packages/crouton-cli/lib/utils/manifest-merge.mjs` (remove hardcoded data, consola)
- **Edit**: `packages/crouton-cli/lib/module-registry.mjs` (read from manifests, consola)
- **Edit**: `packages/crouton-cli/package.json` (add `consola`)
- **Delete**: `packages/crouton-cli/lib/module-registry.json`
- **Edit**: 5 existing `crouton.manifest.ts` files (fix broken imports, migrate type)
- **Create**: ~13 new `crouton.manifest.ts` files for remaining packages (including themes + devtools)
- **Edit**: `packages/crouton-core/src/module.ts` (manifest injection into app.config — task 2.6)

**Phase 3:**
- **Edit**: `packages/crouton-designer/app/composables/useFieldTypes.ts`
- **Edit**: `packages/crouton-designer/app/composables/useSchemaValidation.ts`
- **Edit**: `packages/crouton-designer/app/composables/useCollectionDesignPrompt.ts`
- **Edit**: `packages/crouton-designer/app/composables/useIntakePrompt.ts`
- **Edit**: `packages/crouton-designer/server/api/ai/designer-chat.post.ts`
- **Edit**: `packages/crouton-mcp/src/utils/field-types.ts`
- **Edit**: `packages/crouton-mcp/src/tools/validate-schema.ts`

### Phase 2+3 Checklist

**Manifest loader:**
- [x] Create `packages/crouton-cli/lib/utils/manifest-loader.ts`
- [x] Implement `discoverManifests()` with monorepo + node_modules scanning
- [x] Implement `getFieldTypeRegistry()` with alias expansion (flat map)
- [x] Implement `getAutoGeneratedFields()`, `getReservedFieldNames()`, `getModuleRegistry()`

**CLI integration:**
- [x] Remove `typeMapping` from `helpers.mjs`, replace with manifest loader
- [x] Remove `PACKAGE_MANIFESTS` from `manifest-merge.mjs`, replace with manifest loader
- [x] Update `module-registry.mjs` to use manifest loader
- [x] Delete `module-registry.json`

**Manifest files:**
- [x] Fix 5 existing manifests (broken imports, add category/aiHint)
- [x] Create ~13 new manifests for remaining packages

**consola logging (Wave 2):**
- [x] Add `consola` to `packages/crouton-cli/package.json`
- [x] Replace chalk + ora in `helpers.mjs` with consola
- [x] Replace chalk + ora in `manifest-merge.mjs` with consola
- [x] Replace chalk + ora in `module-registry.mjs` with consola
- [x] Keep `chalk` and `ora` in package.json (still used by ~10 untouched files until Phase 5)

**app.config manifest injection (task 2.6):**
- [x] Add manifest discovery + injection to crouton-core's Nuxt module (~20 lines)
- [x] Verify `useAppConfig().crouton.fieldTypes` returns merged registry in designer app

**Designer consumer migration:**
- [x] `useFieldTypes.ts` — remove hardcoded types, read from `useAppConfig().crouton.fieldTypes`
- [x] `useSchemaValidation.ts` — remove hardcoded reserved names, read from `useAppConfig().crouton`
- [x] `useCollectionDesignPrompt.ts` — remove hardcoded auto-generated fields
- [x] `useIntakePrompt.ts` — replace JSON import with manifest loader
- [x] `designer-chat.post.ts` — derive `fieldTypeEnum` from manifests

**MCP consumer migration:**
- [x] `field-types.ts` — remove hardcoded types, import from manifest loader
- [x] `validate-schema.ts` — remove hardcoded auto-generated fields

**Verification:**
- [x] Run `pnpm crouton config ./crouton.config.js` — CLI reads manifests, validates schemas, syncs framework packages
- [x] Verify `module-registry.json` deleted, no import errors
- [x] Start designer app (`pnpm dev` in `apps/crouton-designer`) — boots cleanly, loads 20 manifests
- [x] CLI output has colors, spinners, success/error messages (consola working)
- [ ] Create new project, verify AI suggests all packages (manual test)
- [ ] Verify field type dropdown shows `image` and `file` (manual test)
- [ ] Create collection with `image` field, verify validation passes (manual test)
- [ ] Run MCP inspector: `validate_schema` accepts `image` and `file` types (manual test)
- [x] CLI output has colors, spinners, success/error messages (consola working)

---

## Phase 3.5: Replace Regex Config Modification with magicast (After Phase 2+3)

**Objective**: Replace ~260 lines of fragile regex-based config file modifications across 3 sites with AST-based manipulation using [magicast](https://github.com/unjs/magicast). magicast is built on recast + babel, preserves formatting, and has built-in helpers like `addNuxtModule`.

**PR**: Ships independently after Phase 2+3.

**Why**: The 3 config modification sites use regex to parse and modify JavaScript/TypeScript files. This is fragile — edge cases in formatting, comments, or complex expressions break the regex. magicast provides a JSON-like API for reading and modifying JS/TS ASTs with format preservation.

### What it replaces (3 sites)

| Site | File | Current LOC | What it does | magicast approach |
|------|------|-------------|-------------|-------------------|
| 1 | `lib/utils/update-nuxt-config.mjs` | ~120 lines | Regex to add/remove entries in `extends` array | ~10 lines with `mod.exports.default.$args` navigation |
| 2 | `generate-collection.mjs` `updateSchemaIndex()` | ~60 lines | String append for schema exports | magicast export helpers with dedup |
| 3 | `generate-collection.mjs` `registerTranslationsUiCollection()` | ~80 lines | Regex to insert into `croutonCollections` object | magicast nested object navigation |

### What stays as-is

All 13 generators (template strings for new files) — magicast is for modifying existing files, template strings are the right tool for generating new files.

### Phase 3.5 Files Changed

- **Edit**: `packages/crouton-cli/package.json` — add `magicast`
- **Rewrite**: `packages/crouton-cli/lib/utils/update-nuxt-config.mjs` — magicast `extends` array manipulation (kept `.mjs` — CLI not yet TS-aware)
- **Rewrite**: `packages/crouton-cli/lib/utils/update-schema-index.mjs` — magicast for AST-based export detection (merged inline function from `generate-collection.mjs`)
- **Create**: `packages/crouton-cli/lib/utils/update-app-config.mjs` — magicast for `croutonCollections` insertion (extracted from `generate-collection.mjs`)
- **Edit**: `packages/crouton-cli/lib/generate-collection.mjs` — replaced inline `updateSchemaIndex()` and `registerTranslationsUiCollection()` with imports
- **Edit**: `packages/crouton-cli/lib/rollback-collection.mjs` — use magicast utils for removal (schema, app.config, nuxt.config)
- **Edit**: `packages/crouton-cli/lib/add-module.mjs` — updated import paths

### Phase 3.5 Checklist

- [x] Add `magicast` to `packages/crouton-cli/package.json`
- [x] Rewrite `update-nuxt-config.mjs` using magicast `extends` array manipulation (kept `.mjs` — CLI not yet TS-loader aware)
- [x] Rewrite `update-schema-index.mjs` using magicast for AST-based export detection + extraction from `generate-collection.mjs`
- [x] Extract `registerTranslationsUiCollection()` from `generate-collection.mjs` into `lib/utils/update-app-config.mjs` using magicast
- [x] Update `generate-collection.mjs` to import from new util files
- [x] Update `rollback-collection.mjs` to use magicast utils for config removal
- [x] `rollback-bulk.mjs` delegates to `rollback-collection.mjs` — no direct changes needed
- [x] Verify: `crouton config ./crouton.config.js` still validates and syncs framework packages
- [x] Verify: Designer app boots cleanly (20 manifests loaded)
- [x] Phase 0 characterization tests still pass (374/374)
- [x] MCP tests still pass (32/32)

### Tools Evaluated for Config File Modification

| Tool | Verdict | Rationale |
|------|---------|-----------|
| **magicast** (unjs) | Selected | AST-based with JSON-like API, format-preserving, built-in `addNuxtModule` helper. Replaces ~260 lines of regex |
| **oxc** | Rejected | Rust-based low-level parser/transformer. No high-level config modification API, no format-preserving write-back |
| **Vite+** | Not relevant | Dev toolchain (bundler + test runner + linter), not a code modification library |
| **knitwork** (unjs) | Deferred to Phase 5 | Safe JS string generation utilities. Useful for template generators but not for modifying existing files |

---

## Phase 4: Unified Module Migration (Optional / Later)

**Objective**: Replace hardcoded feature-to-package mapping in unified module.

**PR**: Ships whenever convenient after Phase 2+3.

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

### Phase 4 Files Changed
- **Edit**: `packages/crouton/src/module.ts`
- **Edit**: `packages/crouton/src/types.ts`

### Phase 4 Checklist
- [x] Replace hardcoded feature mapping with manifest-based discovery
- [x] Keep explicit `CroutonOptions` interface for IDE autocomplete (added source-of-truth comment)
- [x] Create and export `getCroutonLayers()` function
- [x] Verify module builds: `getCroutonLayers` in dist exports
- [ ] Add a new test package with manifest — verify auto-discovered (deferred: manual test)
- [x] `npx nuxt typecheck` — pre-existing i18n errors only, no manifest-related regressions
- [x] 374 CLI + 32 MCP tests pass

---

## Phase 5: CLI Framework Rewrite (Standalone PR)

**Objective**: Replace Commander with citty, remove all remaining chalk/ora/inquirer/fs-extra, consolidate process.argv parsing. This is the largest change — do it as a dedicated PR, not mixed with manifest work.

**Prerequisite**: Phase 0 (characterization tests) must be complete. The tests act as a safety net — rewrite commands and verify tests still pass.

### 5.1 Replace Commander with citty

**Files touched**: `bin/crouton-generate.js` (entry point), every command file

```javascript
// Before (Commander)
import { program } from 'commander'
program
  .command('generate <layer> [collection]')
  .option('-c, --config <path>', 'Config file')
  .option('--dry-run', 'Preview')
  .option('--force', 'Overwrite')
  .action(async (layer, collection, options) => { ... })

// After (citty)
import { defineCommand, runMain } from 'citty'

const generate = defineCommand({
  meta: { name: 'generate', description: 'Generate a CRUD collection' },
  args: {
    layer: { type: 'positional', description: 'Target layer', required: true },
    collection: { type: 'positional', description: 'Collection name' },
    config: { type: 'string', alias: 'c', description: 'Config file path' },
    dryRun: { type: 'boolean', description: 'Preview without writing' },
    force: { type: 'boolean', description: 'Overwrite existing files' },
    dialect: { type: 'string', description: 'Database dialect (sqlite|pg)' },
    hierarchy: { type: 'boolean', description: 'Enable tree structure' },
    seed: { type: 'boolean', description: 'Generate seed data' },
    count: { type: 'string', description: 'Seed row count' },
    noTranslations: { type: 'boolean', description: 'Skip i18n support' },
    autoRelations: { type: 'boolean', description: 'Add relation stubs' },
  },
  async run({ args }) {
    // args is fully typed — no more process.argv.includes()
  }
})

const main = defineCommand({
  meta: { name: 'crouton', version: '1.0.0' },
  subCommands: { generate, config, install, init, add, doctor, rollback, seed: seedTranslations }
})

runMain(main)
```

### 5.2 Remove manual process.argv parsing

**Files touched**: `lib/generate-collection.mjs`, any generator that reads `process.argv` directly.

The `parseArgs()` function in `generate-collection.mjs` is deleted. Args come from citty's typed `args` object, passed down to generators as an options parameter.

```javascript
// Before: generators read process.argv themselves
function parseArgs() {
  const a = process.argv.slice(2)
  const dryRun = a.includes('--dry-run')
  const config = (a.find(x => x.startsWith('--config=')) || '').split('=')[1]
  return { dryRun, config }
}

// After: args passed as typed parameter
export async function generateFormComponent(fields, collection, layer, args) {
  const { dryRun, dialect, noTranslations } = args
  // ...
}
```

### 5.3 Replace inquirer with @clack/prompts

**Files touched**: `lib/rollback-interactive.mjs` (only file importing inquirer)

```javascript
// Before (inquirer)
import inquirer from 'inquirer'
const { layer } = await inquirer.prompt([{
  type: 'list',
  name: 'layer',
  message: 'Which layer?',
  choices: layers
}])

// After (@clack/prompts)
import { select, confirm, text, intro, outro, spinner } from '@clack/prompts'

intro('Create a new collection')
const layer = await select({
  message: 'Which layer?',
  options: layers.map(l => ({ value: l, label: l }))
})
const shouldSeed = await confirm({ message: 'Generate seed data?' })
outro('Collection created!')
```

### 5.4 Remove fs-extra

**Files touched**: Any file importing `fs-extra`

```javascript
// Before (fs-extra)
import fs from 'fs-extra'
const pkg = await fs.readJson(join(cwd, 'package.json'))
await fs.copy(src, dest)

// After (Node built-ins + pkg-types)
import { readFile, cp, mkdir, writeFile } from 'node:fs/promises'
import { readPackageJSON } from 'pkg-types'

const pkg = await readPackageJSON(cwd)
await cp(src, dest, { recursive: true }) // Node 16.7+
```

### 5.5 Complete consola migration (all remaining files)

Migrate ALL remaining chalk/ora imports to consola (~10 files listed in Phase 2+3's "intermediate state"). Remove `chalk` and `ora` from package.json entirely.

### Phase 5 Files Changed
- **Rewrite**: `bin/crouton-generate.js` (citty entry point)
- **Edit**: `lib/generate-collection.ts` (typed args, remove parseArgs)
- **Edit**: `lib/rollback-interactive.ts` (inquirer → @clack/prompts)
- **Edit**: ~10 files (remaining chalk/ora → consola, all migrated `.mjs` → `.ts`)
- **Edit**: Any files using `fs-extra` (→ Node built-ins + pkg-types)
- **Edit**: `packages/crouton-cli/package.json` (add citty, @clack/prompts; remove commander, chalk, ora, inquirer, fs-extra)

### Phase 5 Checklist

**Prerequisite**: Phase 0 characterization tests passing.

**Rewrite + full cleanup:**
- [x] Add `citty` and `@clack/prompts` to package.json
- [x] Rewrite `bin/crouton-generate.js` with citty (11 subcommands via `defineCommand()`)
- [x] Rewrite each command as `defineCommand()`
- [x] Delete `parseArgs()` from `generate-collection.mjs` — split `main()` into `runConfig()` and `runGenerate()`
- [x] Pass typed args to generators as parameter (not process.argv)
- [x] Replace inquirer in `rollback-interactive.mjs` with @clack/prompts
- [x] Replace fs-extra with Node built-ins + pkg-types in all files
- [x] Migrate ALL remaining chalk/ora imports to consola (~10 files)
- [x] Remove `commander`, `chalk`, `ora`, `inquirer`, `fs-extra` from package.json
- [x] Removed standalone rollback bin entries (now citty subcommands)
- [x] Verify Phase 0 characterization tests still pass (374/374)
- [x] Verify all 11 commands work: `generate`, `config`, `install`, `init`, `add`, `rollback`, `rollback-bulk`, `rollback-interactive`, `doctor`, `scaffold-app`, `seed-translations`
- [x] Verify: `--help` auto-generated by citty

**Replace tests (deferred — characterization tests are sufficient for now):**
- [ ] Replace characterization (subprocess) tests with citty-specific unit tests
- [ ] Test `defineCommand()` handlers directly (no subprocess)

---

## ~~Future: TypeScript Migration~~ ✅ Complete

All `lib/` files have been migrated from `.mjs` to `.ts` as part of the Phase 5 CLI framework rewrite. Only `bin/crouton-generate.js` remains as `.js` (citty entry point).

**Migrated files**: All commands (`lib/*.ts`), all utils (`lib/utils/*.ts`), all generators (`lib/generators/*.ts`). jiti handles the `.ts` → runtime bridge.

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
- **CLI generators** (`form-component.ts`, `database-schema.ts`, etc.) — they read from `typeMapping`, which now comes from manifests via the loader
- **`getSeedGenerator()` in helpers.ts** — name-based heuristics stay in CLI (not manifest data)
- **Existing JSON schema files** (`schemas/*.json`) — these define user collections, not package metadata
- **`config-builder.ts`** — generates config file content for designer scaffold. Different concern from c12 config loading
- **`drizzle-seed`** — no unjs equivalent, stays as-is

---

## Verification Strategy

### After Phase 1
```bash
# Config loading works with c12
pnpm crouton config ./crouton.config.js   # existing .js format
pnpm crouton config ./crouton.config.ts   # NEW: TypeScript config

# Manifest types resolve
npx nuxt typecheck                         # in apps/crouton-designer

# Import from CLI compiles
# (verify packages/crouton-core/shared/manifest.ts importable)
```

### After Phase 2+3 (ship together due to JSON deletion)
```bash
# CLI reads manifests
pnpm crouton doctor .                     # in test app
pnpm crouton config ./crouton.config.js   # generation still works

# Designer reads manifests
pnpm dev                                   # in apps/crouton-designer
# → Create new project, verify AI suggests all packages
# → Verify field type dropdown shows image and file
# → Create collection with image field, verify validation passes

# MCP reads manifests
# Run MCP inspector: validate_schema accepts image and file types

# No import errors
# module-registry.json deleted, no broken imports

# consola visual check
pnpm crouton generate shop products --dry-run  # colors, spinners work

# Typecheck all modified packages
npx nuxt typecheck
```

### After Phase 4
```bash
# Unified module feature discovery
# Verify getCroutonLayers() works from nuxt.config.ts
# Add a new test package with manifest — verify auto-discovered
```

### After Phase 5
```bash
# All commands work with citty
pnpm crouton --help                       # auto-generated help
pnpm crouton generate --help              # subcommand help
pnpm crouton generate shop products       # normal generation
pnpm crouton init my-app                  # interactive prompts (@clack)
pnpm crouton add auth                     # module installation
pnpm crouton doctor .                     # project validation
pnpm crouton rollback shop products       # cleanup

# No legacy deps
# commander, chalk, ora, inquirer, fs-extra all removed from package.json
```

---

## Key Files Reference

| File | Current Role | What Changes | Phase |
|------|-------------|-------------|-------|
| `packages/crouton-core/shared/manifest.ts` | *(new)* | Manifest type + `defineCroutonManifest()` | 1 |
| `packages/crouton-core/crouton.manifest.ts` | *(new)* | 12 base field types (incl. image/file) + reserved names | 1 |
| `packages/crouton-cli/lib/utils/manifest-loader.ts` | *(new)* | Discovery, registry, alias resolution | 2 |
| `packages/crouton-cli/lib/utils/helpers.ts` | Hardcoded typeMapping | Remove typeMapping, import from loader, consola | 2 |
| `packages/crouton-cli/lib/utils/manifest-merge.ts` | Hardcoded PACKAGE_MANIFESTS | Remove hardcoded data, consola | 2 |
| `packages/crouton-cli/lib/module-registry.ts` | Module lookup from JSON | Read from manifests, consola | 2 |
| `packages/crouton-cli/lib/module-registry.json` | 16 module entries | **Deleted** | 2 |
| `packages/crouton-cli/lib/utils/config-builder.ts` | Build config file content | **Untouched** — different concern from c12 | — |
| `packages/crouton-cli/lib/generate-collection.ts` | Main orchestrator (~80KB) | Phase 1: c12 config loading. Phase 2+3: consola. Phase 3.5: extract config modification to utils. Phase 5: typed args | 1, 2, 3.5, 5 |
| `packages/crouton-cli/lib/utils/paths.ts` | PATH_CONFIG template system | Use pathe for joins/resolves | 1 |
| `packages/crouton-cli/lib/utils/detect-package-manager.ts` | Lock file scanning | Could use pkg-types | 5 |
| `packages/crouton-cli/bin/crouton-generate.js` | Entry point, citty setup | Rewrite with citty | 5 |
| `packages/crouton-cli/lib/rollback-interactive.ts` | Interactive rollback | Replace inquirer with @clack/prompts | 5 |
| `packages/crouton-cli/lib/init-app.ts` | Scaffold pipeline | consola + @clack/prompts | 5 |
| `packages/crouton-cli/lib/scaffold-app.ts` | App boilerplate | consola + @clack/prompts | 5 |
| `packages/crouton-cli/lib/add-module.ts` | Module installer | consola | 5 |
| `packages/crouton-cli/lib/generators/*.ts` | 13 code generators | consola (Phase 5). All now `.ts` | 5 |
| `packages/crouton-designer/app/composables/useFieldTypes.ts` | Hardcoded 15 types | Read from manifests | 3 |
| `packages/crouton-designer/app/composables/useSchemaValidation.ts` | Hardcoded reserved names | Read from manifests | 3 |
| `packages/crouton-designer/app/composables/useCollectionDesignPrompt.ts` | Hardcoded auto-gen fields | Read from manifests | 3 |
| `packages/crouton-designer/app/composables/useIntakePrompt.ts` | Reads module-registry.json | Read from manifests | 3 |
| `packages/crouton-designer/server/api/ai/designer-chat.post.ts` | Hardcoded fieldTypeEnum | Derive from manifests | 3 |
| `packages/crouton-mcp/src/utils/field-types.ts` | Hardcoded 9 types | Import from manifest loader | 3 |
| `packages/crouton-mcp/src/tools/validate-schema.ts` | Hardcoded auto-gen fields | Import from manifest loader | 3 |
| `packages/crouton/src/module.ts` | Hardcoded feature mapping | Read from manifests | 4 |
| `packages/crouton-cli/lib/utils/update-nuxt-config.ts` | Regex-based extends array modification | Rewrite with magicast | 3.5 |
| `packages/crouton-cli/lib/utils/update-schema-index.ts` | String append for schema exports | Rewrite with magicast | 3.5 |
| `packages/crouton-cli/lib/utils/update-app-config.ts` | *(new, extracted)* | magicast for croutonCollections insertion | 3.5 |

---

## Scope Summary

| Phase | Effort | Impact | Deps Added | Deps Removed | PR |
|-------|--------|--------|-----------|-------------|-----|
| Phase 0 | Small | CLI safety net — characterization tests for all 11 commands | — | — | PR 0 (parallelizable with PR 1) |
| Phase 1 | Medium | Foundation — types + core manifest + unjs base | jiti, c12, defu, pathe, pkg-types | — | PR 1 |
| Phase 2+3 | Large | CLI reads manifests, all packages get manifests (incl. crouton-assets), JSON deleted, consumers migrated, app.config injection, consola in touched files | consola | — (chalk/ora kept temporarily) | PR 2 (atomic) |
| Phase 3.5 | Small | Replace regex config modification with magicast AST | magicast | — | PR 2.5 (after Phase 2+3) |
| Phase 4 | Small | Unified module reads manifests + getCroutonLayers() | — | — | PR 3 |
| Phase 5 | Medium | CLI framework rewrite + full dep cleanup (tests already exist from Phase 0). Consider knitwork for template string generation. | citty, @clack/prompts | commander, chalk, ora, inquirer, fs-extra (all 5 removed) | PR 4 |
| Future | ✅ Done | All `lib/` files migrated `.mjs` → `.ts` | — | — | Completed with Phase 5 |

**Ship order**: Phase 0 + Phase 1 (parallel) → Phase 2+3 (atomic) → Phase 3.5 (magicast) → Phase 4 (whenever) → Phase 5 (after manifests land) → Future (opportunistic)

**Total files**: ~1 created (Phase 0) + ~5 created (Phase 1) + ~16 created + ~13 edited (Phase 2+3) + ~3 created + ~4 edited (Phase 3.5) + ~2 edited (Phase 4) + ~15 edited (Phase 5) = **~59 files**

**Total dep changes**: +9 unjs deps (incl. magicast), -5 legacy deps. Net result: CLI uses the same stack as Nuxt itself.

### Cross-Plan Dependencies

| This Plan | Enables | In Plan |
|-----------|---------|---------|
| Phase 0 (characterization tests) | Prevents regressions across all subsequent phases + AI agent sessions | Internal quality |
| Phase 1 (manifest type) | Designer Phase D: package manifest schema | `schema-designer-v2.md` |
| Phase 2 (all manifests) | Designer Phase D: AI-driven package suggestions | `schema-designer-v2.md` |
| Phase 3 (consumer migration) | Designer Phase D: cross-phase impact detection | `schema-designer-v2.md` |
