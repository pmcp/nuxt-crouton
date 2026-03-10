# Documentation Verification Report

**Date**: 2026-03-10
**Pages verified**: 44
**Scope**: All sections (features, api-reference, generation, patterns, customization)

## Summary

| Status | Count |
|--------|-------|
| ✅ Verified claims | ~350+ |
| ❌ Broken claims | 52 |
| ⚠️ Suspicious | 34 |
| 📝 Missing from docs | 120+ |

## Pages by Health

### 🔴 Needs Rewrite (>50% broken claims or fundamentally wrong)

- `8.api-reference/components/modal-components.md` — Documents `CroutonButton` and `CroutonList` which don't exist; uses v3 column format; wrong LayoutType
- `4.patterns/3.tables.md` — References `CroutonList` throughout (should be `CroutonCollection`); snake_case field names
- `4.patterns/5.list-layouts.md` — All `CroutonList` references should be `CroutonCollection`
- `5.customization/4.custom-columns.md` — Uses Nuxt UI v3 column format (`key`/`label`/`render`) instead of v4 (`accessorKey`/`header`/`cell`)

### 🟡 Needs Fixes (specific broken claims)

- `6.features/7.assets.md` — Claims 2 components (actually 7); wrong package path; missing props
- `6.features/1.internationalization.md` — CroutonI18nInput props incomplete; fabricated type names
- `6.features/9.events.md` — Wrong dependency name; missing `teamId` from type
- `6.features/13.ai.md` — `o3-mini` not in model list; uses deprecated `statusCode`; incomplete AIChatboxProps type
- `6.features/14.admin.md` — Uses `@crouton/auth` (should be `@fyit/crouton-auth`)
- `6.features/18.pages.md` — Only 6 of 20+ block types documented
- `6.features/20.sales.md` — Wrong import path for `calculateItemPrice`
- `3.generation/2.schema-format.md` — `userId` should be `owner`; missing `createdBy` field
- `3.generation/4.cli-reference.md` — `userId` → `owner`; wrong metadata fields; outdated version
- `3.generation/cli-commands.md` — Wrong generated file structure; `Table.vue` doesn't exist; wrong flags
- `4.patterns/1.relations.md` — `type: "uuid"` is not valid
- `4.patterns/2.forms.md` — `CroutonButton` doesn't exist (should be `CroutonFormActionButton`)
- `4.patterns/drizzle.md` — Schema uses array format instead of object format
- `5.customization/1.index.md` — Wrong generated file structure
- `5.customization/3.custom-components.md` — Wrong component name `EditorSimple` (should be `CroutonEditorSimple`)
- `5.customization/5.layouts.md` — References `CroutonList` once
- `8.api-reference/3.types.md` — Wrong LayoutType; missing `inline` container; `null` vs `undefined`
- `8.api-reference/4.server.md` — Uses deprecated `statusCode`/`statusMessage`; wrong return field name
- `8.api-reference/5.internal-api.md` — `useExpandableSlideover` return type wrong; sort type mismatch
- `8.api-reference/6.use-collection-item.md` — Wrong cache key format; wrong caching mechanism
- `8.api-reference/composables/data-composables.md` — `useCollection` (legacy) doesn't exist; `useCollectionProxy` is not a composable
- `8.api-reference/composables/mutation-composables.md` — Missing `isReady` return; hook payload differences
- `8.api-reference/composables/form-composables.md` — `null` vs `undefined` for CroutonAction; missing `inline` container
- `8.api-reference/composables/table-composables.md` — Missing hideDefaultColumns keys
- `8.api-reference/components/table-components.md` — snake_case vs camelCase field names
- `8.api-reference/components/layout-components.md` — Wrong LayoutType; missing props
- `8.api-reference/components/utility-components.md` — Component name inconsistencies (missing `Crouton` prefix)

### 🟢 Healthy (<5% issues)

- `6.features/6.rich-text.md` — No broken claims found
- `6.features/10.maps.md` — No broken claims found; minor missing props
- `6.features/12.flow.md` — No broken claims found
- `6.features/15.export.md` — No broken claims found
- `6.features/16.collaboration.md` — No broken claims found
- `6.features/17.email.md` — No broken claims found
- `6.features/19.bookings.md` — Minor dep version concern only
- `6.features/11.devtools.md` — Minor structural differences only
- `8.api-reference/composables/query-composables.md` — No broken claims
- `8.api-reference/components/content-components.md` — No broken claims
- `8.api-reference/components/form-components.md` — No broken claims

---

## Cross-Cutting Issues (Affect Multiple Pages)

### 1. `CroutonList` does not exist (4 pages)
**Affected**: tables.md, list-layouts.md, modal-components.md, layouts.md
**Fix**: Replace all `CroutonList` references with `CroutonCollection`

### 2. `CroutonButton` does not exist (3 pages)
**Affected**: forms.md, modal-components.md, api-reference
**Fix**: Replace with `CroutonFormActionButton`

### 3. `userId` vs `owner` (4 pages)
**Affected**: schema-format.md, cli-reference.md, cli-commands.md, relations.md
**Fix**: The auto-generated user field is `owner`, not `userId`

### 4. Missing `createdBy` from metadata (3 pages)
**Affected**: schema-format.md, cli-reference.md, cli-commands.md
**Fix**: `useMetadata` generates 4 fields: `createdAt`, `updatedAt`, `createdBy`, `updatedBy`

### 5. Wrong generated file structure (3 pages)
**Affected**: cli-commands.md, customization/index.md, customization/custom-components.md
**Fix**: Path is `layers/[layer]/collections/[collection]/app/components/`, not `layers/[layer]/components/[collection]/`

### 6. LayoutType wrong everywhere (5 pages)
**Affected**: types.md, modal-components.md, layout-components.md, tables.md, layouts.md
**Fix**: No `'cards'` type. Correct: `'table' | 'list' | 'grid' | 'tree' | 'kanban' | 'workspace'`

### 7. Column format v3 vs v4 (3 pages)
**Affected**: custom-columns.md, modal-components.md, tables.md
**Fix**: Use v4 format (`accessorKey`, `header`, `cell`) not v3 (`key`, `label`, `render`)

### 8. `statusCode`/`statusMessage` deprecated (3 pages)
**Affected**: ai.md, server.md, various examples
**Fix**: Use Nitro v3 `status`/`statusText` per project conventions

### 9. snake_case vs camelCase field names (3 pages)
**Affected**: tables.md, internal-api.md, table-components.md
**Fix**: Use `createdAt`/`updatedAt` (camelCase), not `created_at`/`updated_at`

### 10. `CroutonAction` null vs undefined (3 pages)
**Affected**: types.md, form-composables.md, forms.md
**Fix**: Type is `... | undefined`, not `... | null`

---

## Detailed Findings by Page

### 6.features/1.internationalization.md

#### Verified ✅
- Package name `@fyit/crouton-i18n`, version `0.1.0`
- Strategy `'no_prefix'`, default locales en/nl/fr
- All 8 components exist with correct prefixes
- `useT()` composable returns all documented properties
- `useEntityTranslations()` exists with correct fallback behavior
- `translationsUiSchema` and related exports confirmed
- Database schema structure matches

#### Broken ❌
- **CroutonI18nInput props incomplete**: Missing `showAiTranslate`, `fieldType`, `collab`, `layout`, `primaryLocale`, `secondaryLocale`, `fieldOptions`, `fieldGroups`, `defaultOpenGroups`
- **CroutonI18nInput type definition wrong**: Uses fabricated type names `SingleFieldValue | MultiFieldValue` — actual type is `TranslationsValue`
- **CroutonI18nDisplay badge "Error" color misleading**: Not a validation failure — it's for empty translation values
- **`useT()` `tInfo` return type**: `TranslationInfo` type name doesn't exist in source

#### Suspicious ⚠️
- Seed command `crouton-generate seed-translations` may differ from actual CLI invocation
- Default locale config mechanism differs from what docs imply (config-driven, not hardcoded)

#### Missing from docs 📝
- `CroutonI18nAITranslateButton` component
- `CroutonI18nInput` `update:english` emit
- Composables: `useFieldTransforms`, `useFieldGroups`, `useAiTranslation`, `useTranslationFields`, `useLocaleLayout`

---

### 6.features/6.rich-text.md

#### Verified ✅
- Package `@fyit/crouton-editor` v0.1.0, all deps confirmed
- All 5 components verified with correct props, events, defaults
- `useEditorVariables()` returns and signatures match
- Layer config confirmed

#### Broken ❌
- None found

#### Suspicious ⚠️
- `CroutonEditorBlocks` events `block:select` and `block:edit` not fully verified from read portion

#### Missing from docs 📝
- Nothing significant

---

### 6.features/7.assets.md

#### Verified ✅
- Package `@fyit/crouton-assets` v0.1.0
- `CroutonAssetsPicker` and `CroutonAssetsUploader` exist
- `useAssetUpload()` composable exists with documented returns
- Upload flow and blob storage requirement confirmed

#### Broken ❌
- **Docs claim 2 components, actually 7**: Missing `Library`, `Card`, `Form`, `FormUpdate`, `AssetTile`
- **Package path wrong**: `packages/nuxt-crouton-assets/` should be `packages/crouton-assets/`
- **CroutonAssetsPicker props incomplete**: Missing `crop` prop and `select` emit
- **CroutonAssetsUploader props incomplete**: Missing `crop` prop
- **AssetMetadata incomplete**: Missing `translations` property
- **`useAssetUpload()` first section omits `deleteAssetFile` and `progress`** (included in later API Reference section)
- **Docs say `useRoute().params.team`** but composable uses `useTeamContext().getTeamId()`

#### Suspicious ⚠️
- `@nuxthub/core` listed as prerequisite but not in package.json dependencies
- Image cropping via cropperjs — dependency not in assets package.json

#### Missing from docs 📝
- 5 undocumented components: Library, Card, Form, FormUpdate, AssetTile
- AI alt text generation feature
- Multi-locale alt text support
- Auto-refresh on mutations

---

### 6.features/9.events.md

#### Verified ✅
- Package `@fyit/crouton-events` v0.1.0
- All composables exist with correct signatures and returns
- All 6 components exist with correct props
- Database schema, API endpoints, cleanup utility all confirmed
- Smart diff logic and operation types confirmed

#### Broken ❌
- **Dependencies**: Docs say `@fyit/crouton` but actual peer dep is `@fyit/crouton-core`
- **CroutonEvent type missing `teamId`**: DB has it but client-side type doesn't

#### Suspicious ⚠️
- Error handling mode behavior: Plugin always does dev-toast/prod-silent regardless of `mode` config
- `enrichUserData`: Marked as planned/not fully implemented (accurate)
- Metadata `ipAddress` and `duration` never actually set
- Cleanup caps at 5000 per run (undocumented)

#### Missing from docs 📝
- `useCroutonEventsExport` composable with export functionality
- Export API endpoint
- `crouton_operations` table
- `event-display.ts` utils
- `FilterState`, `DateGroup` types
- Server-side `operation-listener.ts` plugin

---

### 6.features/10.maps.md

#### Verified ✅
- Package `@fyit/crouton-maps` v0.1.0, all deps confirmed
- All components exist with correct props, events, slots
- All composables exist with correct signatures
- All 9 Mapbox style presets match
- Geocoding proxy confirmed

#### Broken ❌
- None found

#### Suspicious ⚠️
- TypeScript import path `from '@fyit/crouton-maps'` may not work (layer, not compiled module)
- `CroutonMapsMarker` `active` prop undocumented
- `drag`/`dragEnd` event payloads not shown in docs

#### Missing from docs 📝
- `active` prop on CroutonMapsMarker
- `drag`/`dragEnd` event payloads
- Block components (MapBlockView, MapBlockRender, CollectionMapBlock*)
- Graceful degradation when Mapbox unconfigured
- Dark mode auto-switching
- `isConfigured` in useMapConfig return

---

### 6.features/11.devtools.md

#### Verified ✅
- Package `@fyit/crouton-devtools` v0.1.0
- Nuxt module (not layer) confirmed
- Dev-only, custom tab registration, operation tracker all confirmed
- All RPC endpoints confirmed
- Stats calculation matches

#### Broken ❌
- **`CollectionCard`/`CollectionDetailModal`**: Described as standalone components but are inline in embedded HTML app
- **Hook name**: Uses both `'request'` and `'afterResponse'` hooks (two-phase tracking), not just `onAfterResponse`
- **`useAppConfig` in collections handler**: Actually reads from Nitro runtime config at build time

#### Suspicious ⚠️
- `@nuxt/devtools: v3.0.0` requirement — package uses `@nuxt/devtools-kit`

#### Missing from docs 📝
- System operations tracking (full feature with endpoints)
- Events integration endpoints
- Generation history endpoint
- Custom API route prefix tracking
- `Operation.itemId`, `Operation.metadata`, `Operation.routeGroup` fields
- Data browser page (already implemented, listed as roadmap)

---

### 6.features/12.flow.md

#### Verified ✅
- All Flow component props, events confirmed
- All 5 composables exist with correct signatures and returns
- Dagre auto-layout, custom node convention, Yjs CRDT sync all confirmed

#### Broken ❌
- None found

#### Suspicious ⚠️
- `flowConfig` sub-options `autoLayout` and `positionField` may be dead config (not consumed in source)

#### Missing from docs 📝
- `selectionChange` and `nodeDrop` events on Flow component
- `allowDrop`, `allowedCollections`, `autoCreateOnDrop` props
- `useFlowDragDrop`, `useFlowSyncBridge` composables
- `GhostNode.vue` component
- `connect`/`disconnect` methods from `useFlowSync`
- `applyLayoutToNew` from `useFlowLayout`
- `collection` prop on Node.vue

---

### 6.features/13.ai.md

#### Verified ✅
- Package `@fyit/crouton-ai` v0.1.0, all deps confirmed
- All 3 composables and 3 components exist
- Server utility `createAIProvider` confirmed
- Provider auto-detection, model lists, runtime config all confirmed

#### Broken ❌
- **`AIChatboxProps` type incomplete**: Missing `provider`/`model` in type definition (component has them)
- **`o3-mini` not in model list**: Example uses it but it's not in the official list
- **`statusCode: 429`** in rate limiting example (should be `status: 429`)

#### Suspicious ⚠️
- Import path `from '@fyit/crouton-ai'` — correct import would be `from '@fyit/crouton-ai/types'`
- CLI command syntax may differ from docs

#### Missing from docs 📝
- `useTranslationSuggestion` composable
- `AITranslateButton`, `AIPageGenerator` components
- Tool call support (`toolCalls`, `rawMessages`, `maxSteps`, `onToolCall`)
- `AIInput` `maxRows` prop
- Translation and page generation API endpoints

---

### 6.features/14.admin.md

#### Verified ✅
- Three-tier architecture confirmed
- All composables exist with correct signatures
- All API endpoints exist and match
- All components exist
- `requireSuperAdmin` server utility confirmed
- Runtime config defaults confirmed

#### Broken ❌
- **Import path `@crouton/auth`**: Should be `@fyit/crouton-auth`

#### Suspicious ⚠️
- `croutonAuth` config key is from crouton-auth, may confuse readers on admin page

#### Missing from docs 📝
- `useAdminUsers` returns `pageSize`, `totalPages`
- `useAdminTeams` returns `page`, `pageSize`, `totalPages`, `getTeamMembers()`
- `useImpersonation` `error` return
- Theme/favicon components and composables
- `getSuperAdmin()`, `isSuperAdmin()` server utilities

---

### 6.features/15.export.md

#### Verified ✅
- `useCollectionExport` composable exists with correct interface
- `ExportButton` component exists with correct props/events
- Export options, field handling, CSV features all confirmed

#### Broken ❌
- None found

#### Suspicious ⚠️
- i18n key `export.button` may not exist — actual key is `common.export`

#### Missing from docs 📝
- Integration with `TableHeader.vue` (export button in collection table headers)

---

### 6.features/16.collaboration.md

#### Verified ✅
- Package `@fyit/crouton-collab`, Yjs CRDTs confirmed
- All composables and components exist
- Durable Object, WebSocket route, API endpoints confirmed

#### Broken ❌
- None found

#### Suspicious ⚠️
- "Stable" status claim for relatively new package

#### Missing from docs 📝
- `useCollabConnection` composable
- `useCollabLocalizedContent` composable
- Collection sync signal system (cross-client list refresh)
- `form-collab.client.ts` plugin
- `sync` room type

---

### 6.features/17.email.md

#### Verified ✅
- Package `@fyit/crouton-email`, all deps confirmed
- All server utilities, sender functions, components, templates confirmed
- Runtime config structure matches

#### Broken ❌
- None found

#### Suspicious ⚠️
- Docs imply email is always available with `@fyit/crouton` — may be optional/disabled by default

#### Missing from docs 📝
- `VerificationLink.vue` template, `sendVerificationLink` sender
- `template-renderer.ts` utility
- `auth-email-listener.ts` plugin

---

### 6.features/18.pages.md

#### Verified ✅
- Package `@fyit/crouton-pages`, peer deps confirmed
- Core composables and components exist
- Route files and documented block types confirmed

#### Broken ❌
- None confirmed

#### Suspicious ⚠️
- Only 6 of 20+ block types documented — significantly incomplete

#### Missing from docs 📝
- 14+ undocumented block types (FAQ, TwoColumn, Image, Video, File, ButtonRow, Collection, Embed, Logo, Stats, Gallery, Mailing, Contact, Addon)
- Many undocumented components and composables
- Workspace editor components

---

### 6.features/19.bookings.md

#### Verified ✅
- Package `@fyit/crouton-bookings`, all deps confirmed
- All 9+ composables, all components, all API endpoints, all schemas confirmed

#### Broken ❌
- Minor: Peer dep `zod: ^3.0.0` but project uses zod 4.2.1

#### Missing from docs 📝
- `useBookingCartStorage` composable
- Server email utility, charts plugin
- Admin pages

---

### 6.features/20.sales.md

#### Verified ✅
- Package `@fyit/crouton-sales`, all components/composables confirmed
- All schemas and server utilities confirmed

#### Broken ❌
- **Import path `from '@fyit/crouton-sales'`** for `calculateItemPrice` won't work — it's auto-imported, not a named export

#### Suspicious ⚠️
- French locale file exists but not declared in nuxt.config.ts

#### Missing from docs 📝
- Types, app config, manifest not documented

---

### 3.generation/2.schema-format.md

#### Verified ✅
- Field types, reference fields, cross-layer references confirmed
- Meta properties, repeater fields, dependent fields confirmed

#### Broken ❌
- **`userId` should be `owner`**: Auto-generated user field is `owner`, not `userId`
- **Audit trail wrong**: Missing `createdBy` field; `owner` not `userId`

#### Suspicious ⚠️
- Metadata fields description missing `createdBy`

#### Missing from docs 📝
- `owner` field, `createdBy` field
- Field types `image` and `file`
- `nullable`, `group`, `properties`, `translatableProperties` meta properties

---

### 3.generation/3.multi-collection.md

#### Verified ✅
- Config file structure, collection options, flags confirmed

#### Broken ❌
- **`collab: true`** doesn't mention dependency on `@fyit/crouton-collab`

#### Suspicious ⚠️
- `dialect: 'mysql'` — CLI only supports `'pg' | 'sqlite'`
- `schemaPath` directory vs file confusion

#### Missing from docs 📝
- `features`, `seed`, `formComponent`, `publishable` config options

---

### 3.generation/4.cli-reference.md

#### Verified ✅
- Package name, commands, flags confirmed

#### Broken ❌
- **`userId` should be `owner`**
- **Metadata fields**: Missing `createdBy`
- **`add events` behavior**: Now a module installer, not a layer generator
- **Version "v2.0.0 (Current)"** but package.json shows `0.1.0`

#### Missing from docs 📝
- Commands: `doctor`, `deploy-setup`, `deploy-check`, `scaffold-app`, `seed-translations`, `db-pull`
- `--no-auto-merge` flag
- Full module registry for `crouton add`

---

### 3.generation/cli-commands.md

#### Verified ✅
- Basic syntax, config file usage, rollback commands confirmed

#### Broken ❌
- **Generated file structure wrong**: Shows `layers/[layer]/components/` — actual is `layers/[layer]/collections/[collection]/app/components/`
- **`Table.vue` listed**: Generator creates `List.vue`, not `Table.vue`
- **`_Form.vue`**: No underscore prefix in generated files
- **`--preview` flag**: Actual flag is `--dry-run`
- **`crouton-rollback`**: Should be `crouton rollback` (subcommand)
- **`userId`** should be `owner`

---

### 4.patterns/1.relations.md

#### Broken ❌
- **`type: "uuid"`** — Not a valid field type; should be `"string"`

#### Missing from docs 📝
- `owner` field for user relations

---

### 4.patterns/2.forms.md

#### Broken ❌
- **`CroutonButton`** doesn't exist — should be `CroutonFormActionButton`

#### Missing from docs 📝
- `inline` container type
- `deleteItems` method on `useCollectionMutation`

---

### 4.patterns/3.tables.md

#### Broken ❌
- **`CroutonList`** doesn't exist — should be `CroutonCollection`
- **`created_at`/`updated_at`** should be camelCase

#### Missing from docs 📝
- `kanban` and `workspace` layout types

---

### 4.patterns/5.list-layouts.md

#### Broken ❌
- **`CroutonList`** doesn't exist — should be `CroutonCollection`

---

### 4.patterns/drizzle.md

#### Broken ❌
- **Schema format**: Uses array-of-objects but correct format is object-with-keys

#### Suspicious ⚠️
- `useDB()` helper — may be `useDrizzle()` instead

---

### 5.customization/1.index.md

#### Broken ❌
- **File structure wrong**: Shows `layers/[layer]/components/` — actual is `layers/[layer]/collections/[collection]/app/components/`
- **`Table.vue` listed** — Generator creates `List.vue`

---

### 5.customization/3.custom-components.md

#### Broken ❌
- **`EditorSimple` component name**: Should be `CroutonEditorSimple` (auto-import adds prefix)

#### Missing from docs 📝
- Other editor components (Blocks, Variables, Preview, WithPreview)
- `enableImageUpload`, `enableTranslationAI` props

---

### 5.customization/4.custom-columns.md

#### Broken ❌
- **Column `render` function**: Not a Nuxt UI 4 column property
- **Column `component` property**: Not standard v4
- **Column `align` property**: Not standard v4
- **Column `sortable` property**: v4 handles sorting differently

---

### 5.customization/5.layouts.md

#### Broken ❌
- **`CroutonList`** reference — should be `CroutonCollection`

#### Missing from docs 📝
- `workspace` layout type, `inline` container type

---

### 8.api-reference/3.types.md

#### Broken ❌
- **LayoutType**: `'cards'` doesn't exist; missing `'kanban'`, `'workspace'`
- **CollectionProps incomplete**: Missing `hierarchy`, `cardComponent`, `sortable`, `gridSize`, `stateless`, `showCollabPresence`
- **CroutonState.containerType**: Missing `'inline'`
- **CroutonAction**: Uses `undefined` not `null`
- **CollectionMutation return**: Missing `delete` alias and `isReady`
- **CroutonMutationPayload**: `updates` not `data`; `itemIds` not `itemId`; missing `correlationId`, `timestamp`, `beforeData`

---

### 8.api-reference/4.server.md

#### Broken ❌
- **`statusCode`/`statusMessage`**: Should use `status`/`statusText`
- **`resolveTeamAndCheckMembership`** return: `member` not `membership`

---

### 8.api-reference/5.internal-api.md

#### Broken ❌
- **`useExpandableSlideover` return**: Docs say `{ open, close, level }` but actual is `{ isOpen, isExpanded, toggleExpand, expand, collapse, open, close, slideoverUi, expandIcon, expandTooltip }`
- **Sort type mismatch**: Examples use `{ id, desc }` but actual type is `{ column, direction }`
- **hideDefaultColumns**: snake_case vs camelCase; missing `select`/`presence`

---

### 8.api-reference/6.use-collection-item.md

#### Broken ❌
- **Cache key format**: Uses hyphens not colons (`collection-item-users-123`)
- **Caching mechanism**: Uses `useAsyncData`, not `useFetch`

---

### 8.api-reference/composables/data-composables.md

#### Broken ❌
- **`useCollection` (legacy) does NOT exist** — entire section documents a phantom composable
- **`useCollectionProxy` is NOT a composable** — it's two standalone functions; function name is `applyProxyTransform` not `applyTransform`

---

### 8.api-reference/composables/mutation-composables.md

#### Broken ❌
- **Missing `isReady`** return on `useCollectionMutation`
- **Hook payload differences**: Missing `correlationId`, `timestamp`, `beforeData`; uses `updates` not `data`

---

### 8.api-reference/composables/form-composables.md

#### Broken ❌
- **CroutonAction**: `null` vs `undefined`
- **CroutonState.containerType**: Missing `'inline'`

---

### 8.api-reference/composables/table-composables.md

#### Broken ❌
- **hideDefaultColumns**: Missing `select` and `presence` keys
- **Missing options**: `sortable` and `showCollabPresence`

---

### 8.api-reference/composables/query-composables.md

#### Broken ❌
- None found

---

### 8.api-reference/composables/utility-composables.md

#### Missing from docs 📝
- Many undocumented composables: `useNotify`, `useCroutonError`, `useContentToc`, `useCroutonCollectionsNav`, `useCroutonShortcuts`, `useTreeItemState`, `useKanban`, `useCollectionExport`, `useCollectionImport`, `useDisplayConfig`, `useImageCrop`, `useAdminStatusBar`, `useCroutonBlocks`, `useTreeDrag`, `useTreeMutation`, `useDependentFieldResolver`, `useCroutonApps`

---

### 8.api-reference/components/table-components.md

#### Broken ❌
- **hideDefaultColumns**: snake_case keys should be camelCase; missing `select`/`presence`

---

### 8.api-reference/components/form-components.md

#### Broken ❌
- None found

#### Missing from docs 📝
- `CroutonFormOptionsSelect`, `CroutonFormColorPicker`, `CroutonFormDependentButtonGroup`, `CroutonFormDependentSelectOption`, `CroutonFormTranslatableOptionItem`, `CroutonFormExpandableSlideOver`

---

### 8.api-reference/components/modal-components.md

#### Broken ❌
- **`CroutonButton` does NOT exist** — should be `CroutonFormActionButton`
- **`CroutonList` does NOT exist** — should be `CroutonCollection`
- **LayoutType**: No `'cards'` type
- **Column interface**: Uses v3 format (`key`/`label`/`render`) not v4
- **hideDefaultColumns**: snake_case vs camelCase

---

### 8.api-reference/components/layout-components.md

#### Broken ❌
- **LayoutType wrong**: No `'cards'` type
- **CollectionProps incomplete**: Missing many props

---

### 8.api-reference/components/content-components.md

#### Broken ❌
- None found

---

### 8.api-reference/components/utility-components.md

#### Broken ❌
- **Component name inconsistency**: `<Loading />` and `<ValidationErrorSummary />` won't work — must use `CroutonLoading` and `CroutonValidationErrorSummary`

#### Missing from docs 📝
- `CroutonConfirmButton`, `CroutonExportButton`, `CroutonImportButton`, `CroutonImportPreviewModal`, `CroutonIconPicker`, `CroutonDarkModeSwitcher`, `CroutonDropZone`, `CroutonImageCropper`, `CroutonImageUpload`, `CroutonShortcutHint`, `CroutonAdminStatusBar`

---

## Recommended Actions

### Delete (page describes nonexistent features)
- None — all pages describe real features, just with inaccuracies

### Rewrite (too many broken claims to patch)
- `8.api-reference/components/modal-components.md` — Documents phantom components with wrong APIs
- `5.customization/4.custom-columns.md` — Entirely wrong column format
- `3.generation/cli-commands.md` — Multiple structural errors

### Fix (specific claims to update)

**High priority (component/API renames):**
- All `CroutonList` → `CroutonCollection` (4 pages)
- All `CroutonButton` → `CroutonFormActionButton` (3 pages)
- All `userId` → `owner` for auto-generated fields (4 pages)
- All `LayoutType` to include `kanban`/`workspace`, remove `cards` (5 pages)
- All `statusCode`/`statusMessage` → `status`/`statusText` (3 pages)
- All column format v3 → v4 where applicable

**Medium priority (missing props/returns):**
- Add `inline` to containerType (3 pages)
- Add `isReady` to mutation composable returns
- Fix `useExpandableSlideover` return type
- Fix `resolveTeamAndCheckMembership` return field name
- Add metadata field `createdBy` (3 pages)
- Fix generated file structure paths (3 pages)
- Fix `CroutonAction` null → undefined (3 pages)
- Add missing asset components (7 total, not 2)

**Low priority (documentation gaps):**
- Document undocumented composables in utility-composables.md
- Add missing block types to pages.md
- Document missing components in form-components.md and utility-components.md
- Add event payloads and missing props for maps components

### Leave (healthy or cosmetic issues only)
- `6.features/6.rich-text.md`
- `6.features/10.maps.md`
- `6.features/12.flow.md`
- `6.features/15.export.md`
- `6.features/16.collaboration.md`
- `6.features/17.email.md`
- `6.features/19.bookings.md`
- `8.api-reference/composables/query-composables.md`
- `8.api-reference/components/content-components.md`
- `8.api-reference/components/form-components.md`
