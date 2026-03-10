# Documentation Verification Report

**Date:** 2026-03-10 (sixth pass — full re-verification)
**Pages verified:** 73
**Scope:** All documentation sections

## Summary

| Status | Count |
|--------|-------|
| ✅ Verified claims | ~350+ |
| ❌ Broken claims | 18 |
| ⚠️ Suspicious | 22 |
| 📝 Missing from docs | 55+ |

## Pages by Health

### 🔴 Needs Rewrite (>50% broken claims)
_(none)_

### 🟡 Needs Fixes (broken claims found)

| Page | Broken | Issue Summary |
|------|--------|---------------|
| `6.features/9.events.md` | 2 | Wrong dependency name; missing batch cap detail |
| `6.features/10.maps.md` | 1 | Undocumented `active` prop |
| `6.features/11.devtools.md` | 2 | Missing RPC endpoints; wrong hook name in code |
| `6.features/12.flow.md` | 3 | Missing event; wrong `rows` required marker; collab prop mismatch |
| `6.features/14.admin.md` | 1 | Non-existent `/admin/[team]/settings/translations` route |
| `6.features/18.pages.md` | 1 | Misleading claim about Form.vue being manifest-only |
| `8.api-reference/3.types.md` | 1 | `tree-default` preset value wrong |
| `4.patterns/3.tables.md` | 1 | `useCollectionQuery` shown with non-existent `filter`/`pagination` params |
| `3.generation/3.multi-collection.md` | 1 | Wrong generated directory structure |
| `3.generation/cli-commands.md` | 1 | Missing server directory from file tree |
| `5.customization/1.index.md` | 1 | Wrong composable naming convention |
| `5.customization/4.custom-columns.md` | 1 | Bug in example code (`row.status` vs `props.row.status`) |
| `10.guides/5.asset-management.md` | 1 | `CroutonList` component does not exist |
| `2.fundamentals/7.packages.md` | 1 | `AIMessage` component name incorrect |
| `10.guides/3.best-practices.md` | 1 | Claims `Card.vue`/`Table.vue` are generated files |

### 🟢 Healthy (<5% issues)

All remaining pages (58 pages) — mostly verified clean or with only minor suspicious/missing items.

---

## Detailed Findings

---

### 6.features/1.internationalization.md

#### Verified ✅
- Package name `@fyit/crouton-i18n` and version `0.1.0` match
- All 11 components exist with documented props matching source
- `useT()` returns all documented properties
- `useEntityTranslations()` signature and fallback behavior match
- `useTranslationsUi` exports match
- Database schema fields and unique constraint match
- Default locales (en, nl, fr) confirmed

#### Broken ❌
- Display badge color docs misleading — source uses `'error'` for "no translation found", not "validation failed"

#### Suspicious ⚠️
- Seed command `crouton-generate seed-translations` may differ from actual `crouton-i18n-seed` bin
- `@nuxtjs/i18n` shown as fixed version but is `^9.0.0` caret range
- `strategy: 'no_prefix'` as built-in not fully verified

#### Missing from docs 📝
- `CroutonI18nAITranslateButton` component
- `useFieldTransforms`, `useFieldGroups`, `useAiTranslation`, `useTranslationFields`, `useLocaleLayout` composables
- `UiList` does NOT use `CroutonTable` directly — "CroutonTable Integration" claim appears inaccurate

---

### 6.features/6.rich-text.md

#### Verified ✅
- Package name, version, all 5 components, all props/events match source exactly
- `useEditorVariables` return signature matches
- Toolbar features match source
- Nuxt config matches actual config

#### Broken ❌
_(none)_

#### Suspicious ⚠️
- `UEditorMentionMenu` reference should be verified as real Nuxt UI 4 component

---

### 6.features/7.assets.md

#### Verified ✅
- Package name, version, all 7 components confirmed
- `useAssetUpload` return signature and parameter types match
- `AssetMetadata` and `UploadAssetResult` interfaces match
- Picker and Uploader props match source

#### Broken ❌
_(none — but Picker default collection logic oversimplified in docs)_

#### Suspicious ⚠️
- `CroutonAvatarUpload` referenced but not in assets package (likely crouton-core)
- `hub: { blob: true }` shown as required but crouton-core already sets it

#### Missing from docs 📝
- `AspectRatioPreset` type not fully documented
- AI-powered alt text generation feature not mentioned
- Multi-language alt text via `CroutonI18nInput` integration not documented
- `CroutonImageCropper` dependency not documented

---

### 6.features/9.events.md

#### Verified ✅
- All runtime config defaults, interfaces, composables, components, API endpoints match
- Smart diff excluded fields match exactly
- All component props match source

#### Broken ❌
- **Dependency name**: Docs say `@fyit/crouton` but actual peer dep is `@fyit/crouton-core`
- **Cleanup batch cap**: Docs say batches of 1000 but miss the 5000-per-run cap

#### Suspicious ⚠️
- `errorHandling.mode` config doesn't actually switch behavior in source
- `useCollectionQuery('collectionEvents')` claim not supported

#### Missing from docs 📝
- `useCroutonEventsExport` composable
- Export API endpoint `/api/teams/:teamId/crouton-events/export`
- Server plugin `operation-listener.ts`
- `CroutonActivityLog` `eventClick` emit

---

### 6.features/10.maps.md

#### Verified ✅
- Package name, version, dependencies all match
- All components props and events match source
- `useMapConfig()`, `useGeocode()` signatures match
- `MAPBOX_STYLES` const matches exactly
- Server-side geocoding proxy confirmed

#### Broken ❌
- Marker `active` prop exists but is not documented

#### Suspicious ⚠️
- TypeScript exports list may include types not all actually exported

#### Missing from docs 📝
- Block components: `MapBlockView`, `MapBlockRender`, `CollectionMapBlockView`, `CollectionMapBlockRender`

---

### 6.features/11.devtools.md

#### Verified ✅
- Package type (Nuxt Module), dev-only behavior, custom tab registration all match
- Collections discovery, operation tracker, all listed RPC endpoints exist

#### Broken ❌
- **Missing from directory listing**: `generationHistory.ts`, `systemOperations.ts`, `clearSystemOperations.ts`
- **Hook name**: Code example shows `afterResponse` but Nitro hook is `onAfterResponse`

#### Suspicious ⚠️
- Operation tracker may track more routes than documented

#### Missing from docs 📝
- System operations and generation history RPC endpoints
- Data browser route

---

### 6.features/12.flow.md

#### Verified ✅
- Package name, version, all composables, most props/events match
- Custom node convention, sync mode, D1 migration schema confirmed

#### Broken ❌
- **`selectionChange` event** exists in emits but not in docs
- **`rows` prop** documented as "required" but source shows optional
- **Collab component props** shown with inconsistent ref handling

#### Missing from docs 📝
- Props: `allowDrop`, `allowedCollections`, `autoCreateOnDrop`
- Events: `nodeDrop`
- Components: `GhostNode.vue`
- Composables: `useFlowDragDrop`, `useFlowSyncBridge`
- Admin pages with CRUD API for `flow_configs`

---

### 6.features/13.ai.md

#### Verified ✅
- All composables, components, endpoints, dependencies match

#### Missing from docs 📝
- `useTranslationSuggestion()` has no detailed section
- `AITranslateButton` and `AIPageGenerator` have no prop docs
- TipTap editor extension not documented

---

### 6.features/14.admin.md

#### Verified ✅
- Three-tier route architecture, middlewares, composables, components, API endpoints all exist

#### Broken ❌
- `/admin/[team]/settings/translations` route does not exist

#### Missing from docs 📝
- `domains.vue` and `look-and-feel.vue` pages
- `useTeamTheme`, `useTeamFavicon` composables
- Theme-related components

---

### 6.features/15.export.md

#### Verified ✅
- `useCollectionExport` and `CroutonExportButton` exist

#### Missing from docs 📝
- No YAML frontmatter

---

### 6.features/16.collaboration.md

#### Verified ✅
- Package, all composables, components, server files, D1 migration confirmed

#### Missing from docs 📝
- `useCollabConnection`, `useCollabLocalizedContent`, `useFormCollabPresence`, `useCollectionSyncSignal`
- Client plugins

---

### 6.features/17.email.md

#### Verified ✅
- Package, server utilities, templates, client components all confirmed

#### Suspicious ⚠️
- Import alias paths may differ from `package.json` exports

#### Missing from docs 📝
- `VerificationLink.vue` template
- `auth-email-listener.ts` plugin

---

### 6.features/18.pages.md

#### Verified ✅
- Package, composables, components, block types, API endpoints confirmed

#### Broken ❌
- Claims `CroutonPagesForm` is manifest-only but `Form.vue` exists

#### Missing from docs 📝
- `useGhostPage`, `useReorderMode`, `useLocalizedSlug` composables
- `ContactBlockView`, `MailingBlockView` block types
- Editor components

---

### 6.features/19.bookings.md

#### Verified ✅
- All 10 composables, 8+ API endpoints, 5 schemas, all components confirmed
- i18n locales confirmed

---

### 6.features/20.sales.md

#### Verified ✅
- All composables, 10 schemas, components, server utilities confirmed

---

### 8.api-reference/* (All API Reference Pages)

#### Verified ✅
- All core composable signatures match source
- All component pages verified
- Server utilities confirmed
- `useExpandableSlideover` returns match

#### Broken ❌
- **types.md**: `tree-default` preset documented as `{ base: 'list', md: 'tree', lg: 'tree' }` but source has `{ base: 'tree' }`

#### Suspicious ⚠️
- **data-composables.md**: Header says "useExternalCollection" but function is `defineExternalCollection`
- **table-composables.md**: Column ordering description incomplete
- **form-components.md**: References `CroutonReferenceSelect` but no standalone `.vue` exists

#### Missing from docs 📝
- `useTableColumns` `sortable` and `showCollabPresence` parameters
- `CollectionProps.stateless` field
- `CroutonCollectionViewer.defaultLayout` accepts `'cards'` and `'workspace'`

---

### 3.generation/* (Generation Pages)

#### Verified ✅
- Field types, auto-generated fields, CLI commands, config format — all confirmed

#### Broken ❌
- **multi-collection.md**: Directory structure shows `layers/shop/components/` but actual is `layers/shop/collections/[name]/app/components/`
- **cli-commands.md**: Server directory omitted from file tree

#### Suspicious ⚠️
- **Contradiction**: CLI Reference says `schemaPath` can be dir; multi-collection says must be file
- `area` property description may be outdated

#### Missing from docs 📝
- `array` field type rendering example
- `meta.properties` for typed repeater items
- `kind` option, `db-pull`/`deploy-setup`/`deploy-check` command details

---

### 4.patterns/* (Pattern Pages)

#### Verified ✅
- Relations, forms, tables, list layouts, Drizzle setup mostly accurate

#### Broken ❌
- **tables.md**: `useCollectionQuery` with non-existent `filter`/`pagination` params

#### Suspicious ⚠️
- `sortable: true` column property vs TanStack `enableSorting`

---

### 5.customization/* (Customization Pages)

#### Broken ❌
- **index.md**: Composable naming `use[Collection].ts` wrong — should be `use[Layer][Collection].ts`
- **custom-columns.md**: `row.status` should be `props.row.status`

---

### 1.getting-started/*, 2.fundamentals/*, 7.advanced/*, 10.guides/*, 9.reference/*

#### Verified ✅
- Installation, usage, architecture, forms, data ops, caching, packages — all mostly accurate
- Auth composables, conditional fields, bulk ops, optimistic updates — valid
- Troubleshooting, migration, deployment guides — mostly accurate

#### Broken ❌
- **asset-management.md**: `<CroutonList>` doesn't exist — should be `<CroutonCollection>`
- **packages.md**: `AIMessage` wrong — actual is `CroutonAiMessage`
- **best-practices.md**: Claims `Card.vue`/`Table.vue` are generated files

#### Suspicious ⚠️
- **team-based-auth.md**: Says manual auth install needed, but other docs say auto-included
- **troubleshooting.md**: Uses old path format

#### Missing from docs 📝
- Packages `@fyit/crouton-triage`, `@fyit/crouton-charts`, `@fyit/crouton-atelier`, `@fyit/crouton-mcp-toolkit`
- Single-item cache key format

---

## Recommended Actions

### Fix (specific claims to update)

| Priority | Page | Fix |
|----------|------|-----|
| **High** | `4.patterns/3.tables.md` | Rewrite `useCollectionQuery` examples to use actual `query` param API |
| **High** | `3.generation/3.multi-collection.md` | Fix directory structure to `layers/shop/collections/products/app/components/` |
| **High** | `10.guides/5.asset-management.md` | Replace `CroutonList` with `CroutonCollection` |
| **High** | `8.api-reference/3.types.md` | Fix `tree-default` preset value to `{ base: 'tree' }` |
| **Medium** | `6.features/9.events.md` | Fix dependency from `@fyit/crouton` to `@fyit/crouton-core` |
| **Medium** | `6.features/11.devtools.md` | Add missing RPC endpoints; fix hook name |
| **Medium** | `6.features/12.flow.md` | Add `selectionChange` event; fix `rows` required marker; add drag-drop props |
| **Medium** | `6.features/14.admin.md` | Remove non-existent `/admin/[team]/settings/translations` route |
| **Medium** | `5.customization/1.index.md` | Fix composable naming to `use[Layer][Collection].ts` |
| **Medium** | `3.generation/cli-commands.md` | Add server directory to generated file tree |
| **Low** | `2.fundamentals/7.packages.md` | Fix `AIMessage` → `CroutonAiMessage` |
| **Low** | `10.guides/3.best-practices.md` | Remove `Card.vue`/`Table.vue` from generated files list |
| **Low** | `5.customization/4.custom-columns.md` | Fix `row.status` → `props.row.status` in example |
| **Low** | `6.features/18.pages.md` | Clarify that `Form.vue` does exist as a file |

### Resolve contradictions

1. `schemaPath` — CLI Reference (can be dir) vs multi-collection (must be file)
2. Auth install — team-based-auth (manual install) vs installation page (auto-included)
3. Path conventions — some pages use `layers/x/components/` vs correct `layers/x/collections/y/app/components/`

### Document missing features (optional)

Key undocumented features:
- **crouton-collab**: Real-time collection sync (`useCollectionSyncSignal`)
- **crouton-flow**: Drag-and-drop onto canvas, admin pages
- **crouton-events**: Export functionality
- **crouton-assets**: AI alt text generation
- **crouton-admin**: Domain/theme settings pages

### Leave (healthy)

58 pages verified clean or with only cosmetic/missing-from-docs issues. No action needed.
