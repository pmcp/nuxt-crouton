# Overengineering & Non-Idiomatic Patterns Audit

**Date**: 2026-03-03
**Scope**: All 25 packages in nuxt-crouton monorepo
**Focus**: Overengineering, non-Nuxt/Vue patterns, code duplication, reinventing the wheel

---

## Summary

| Severity | Count |
|----------|-------|
| Critical (SSR bugs, architectural) | 8 |
| Major (significant cleanup) | 22 |
| Moderate (quality improvements) | 25 |
| Minor (style/consistency) | 12 |

**Overall verdict**: The codebase is well-structured architecturally. Issues are primarily DRY violations, manual fetch boilerplate that Nuxt handles natively, and a few SSR-unsafe patterns. No Pinia, no Options API, no Axios — the big decisions are all correct.

---

## Critical Issues

### 1. God Composables (Split Required)

- [ ] **crouton-auth** — `useAuth.ts` (925 lines)
  - Handles: login, registration, OAuth, passkeys, 2FA, password management
  - 20+ methods with identical try/catch boilerplate
  - Has `useAuthError().withError()` wrapper but doesn't use it
  - **Fix**: Split into `useEmailAuth()`, `useOAuth()`, `usePasskeys()`, `useTwoFactor()`, `usePasswordManagement()`. Use `withError()` wrapper to eliminate boilerplate.

- [x] ✅ **crouton-bookings** — ~~`useBookingCart.ts` (670 lines, 40+ exports)~~
  - ~~Handles: form state, availability, slot computation, cart CRUD, schedule rules, monthly limits, calendar helpers~~
  - ~~Duplicates ~40% of `useBookingAvailability` logic~~
  - **Done**: Exported `parseLocationSlots()` standalone from `useBookingSlots.ts`, moved `AvailabilityData`/`ALL_DAY_SLOT` to `types/booking.ts`, refactored `useBookingCart` to compose `useBookingAvailability` (eliminating base availability duplication), deduped slot parsing in `useScheduleRules`. Cart: 669→600L. Public API unchanged.

- [ ] **crouton-flow** — `Flow.vue` (812 lines in `<script setup>`)
  - Handles: standalone + sync modes, Yjs seeding, layout, drag/drop, ghost nodes, custom node resolution, presence
  - **Fix**: Extract `useFlowDragDrop()` and `useFlowSyncBridge()` composables.

### 2. SSR-Unsafe Module-Level `ref()` (State Bleed Between Requests)

These use `ref()` at module scope instead of `useState()`, causing state to persist across SSR requests:

- [ ] **crouton-auth** — `useAccountSettingsModal.ts` — `isOpen` and `defaultTab` refs
- [ ] **crouton-admin** — `useImpersonation.ts` — impersonation state refs
- [ ] **crouton-core** — `useTreeDrag.ts` — `moveBlocked`, `autoExpandedIds`, `expandTimeouts`
- [x] **crouton-triage** — `useTriageNotionSchema.ts` — ~~`fetchingSchema`, `schemaFetchError`, `fetchedSchema`~~ → replaced with `useAsyncData` (SSR-safe)

**Fix for all**: Replace `ref()` with `useState('key', () => defaultValue)`.

### 3. Direct `localStorage` Without SSR Safety

- [ ] **crouton-auth** — `useScopedAccess.ts` — raw `localStorage.getItem/setItem`
  - **Fix**: Use `useCookie()` for SSR+client persistence
- [ ] **crouton-themes** — `useThemeSwitcher.ts` — manual localStorage with `import.meta.client` guards
  - **Fix**: Use VueUse's `useLocalStorage()`

### 4. Unsafe Config Loading (`new Function` / eval)

- [ ] **crouton** (main module) — `module.ts:137-163` — `new Function()` to parse config
- [ ] **crouton-i18n** — `config-utils.ts:64` — `new Function()` to parse config

**Fix**: Use `jiti` (already a Nuxt dependency) or `c12`'s `loadConfig`.

---

## Major Issues

### 5. Manual Fetch Boilerplate (Should Use `useFetch`/`useAsyncData`)

All of these manually manage `loading`, `error`, `data` refs around `$fetch` calls:

- [ ] **crouton-admin** — `useAdminStats.ts` (only auto-refresh via `useIntervalFn` is added value)
- [x] **crouton-admin** — `useAdminTeams.ts` — ~~identical boilerplate~~ → extracted `withLoading()` helper, replaced `URLSearchParams` with `$fetch` `query` option
- [x] **crouton-admin** — `useAdminUsers.ts` — ~~identical boilerplate~~ → extracted `withLoading()` helper, replaced `URLSearchParams` with `$fetch` `query` option
- [ ] **crouton-auth** — `useAuthCache.ts` (184 lines reimplementing Nuxt caching)
- [ ] **crouton-core** — `useCollectionItem.ts`
- [x] **crouton-triage** — `useTriageConnectedAccounts.ts` — ~~manual $fetch + ref boilerplate~~ → `useFetch` for data fetching, mutations kept as `$fetch`
- [x] **crouton-triage** — `useTriageSlackUsers.ts` — ~~manual $fetch + ref boilerplate~~ → `useAsyncData` with `immediate: false`, error mapping preserved
- [x] **crouton-triage** — `useTriageNotionUsers.ts` — ~~manual $fetch + ref boilerplate~~ → `useAsyncData` with `immediate: false`, utility functions preserved
- [x] **crouton-triage** — `useTriageNotionSchema.ts` — ~~manual $fetch + ref boilerplate~~ → `useAsyncData` with `immediate: false`, replaced `useState` with Nuxt-managed state

**Fix**: Replace with `useFetch(url, { query })` or `useAsyncData`. Gets SSR support, dedup, and error/loading states for free.

### 6. Code Duplication (DRY Violations)

#### crouton-assets (worst offender — 4 sets of duplication)
- [x] `isImage/isVideo/isAudio/getFileIcon` — ~~duplicated in `Card.vue`, `AssetTile.vue`, `Picker.vue`~~ → extracted to `app/utils/asset.ts`
- [x] `formatFileSize`/`formatBytes` — ~~duplicated in `Card.vue`, `Uploader.vue`, `FormUpdate.vue`~~ → extracted to `app/utils/asset.ts`
- [x] `fileToBase64` — ~~duplicated in `Uploader.vue`, `FormUpdate.vue`~~ → extracted to `app/utils/asset.ts` (also `urlToBase64` for URL variant)
- [ ] `generateAltText` — duplicated in `Uploader.vue`, `FormUpdate.vue` (skipped — requires async composable refactor)
- **Fix**: ~~Create `utils/asset-helpers.ts` and `composables/useAltTextGenerator.ts`~~ Created `app/utils/asset.ts`, updated all 5 components

#### crouton-ai (already out of sync)
- [x] `detectProviderFromModel` — ~~3 separate implementations~~ → single source of truth in `shared/utils/ai-providers.ts` (also fixed missing `o3` prefix in client)
- [x] `localeNames` — ~~duplicated in `generate-email-template.post.ts`~~ → uses shared `getLanguageName()` from `shared/utils/language-names.ts`
- [x] `getLanguageName` cross-boundary imports — ~~server endpoints imported from `app/types/`~~ → now auto-imported from `shared/utils/`
- [ ] Provider/model registry — client vs server have different model lists (different type shapes — `AIModel` vs `AIModelInfo` — deferred)
- **Fix**: ~~Single source of truth in `shared/` directory~~ Created `shared/utils/ai-providers.ts` and `shared/utils/language-names.ts`

#### crouton-triage
- [ ] `calculateSimilarity` — 3 separate implementations (2 prefix-based, 1 Levenshtein)
- [ ] Field-mapping logic — nearly identical in client composable and server util
- [ ] `parseEmail`/`parseEmailAsync` — share 90% of code
- **Fix**: Shared utils, single function with async option flag

#### crouton-events
- [x] `EventChange`/`CroutonEvent` interfaces — ~~defined in 5+ files~~ → centralized in `app/types/events.ts`
- [x] `exportToCSV`/`exportToJSON` — ~~90% identical~~ → merged into single `exportEvents(format)` in `useCroutonEventsExport.ts`
- [x] Filter-building logic — ~~duplicated in `index.get.ts` and `export.get.ts`~~ → extracted to `server/utils/event-filters.ts`
- [x] `parseValue`/`formatValue` — ~~duplicated in 2 components~~ → extracted to `app/utils/event-display.ts`
- **Fix**: ~~Shared types file, single `exportEvents(format)` function, shared filter builder~~ All done

#### crouton-bookings
- [x] Availability logic — ~~duplicated between `useBookingAvailability` and `useBookingCart`~~ → useBookingCart now composes useBookingAvailability
- [x] JSON slot parsing — ~~repeated in 4 places~~ → shared `parseLocationSlots()` exported from `useBookingSlots.ts`
- [ ] `buildEmailVariables` — 2 near-identical implementations
- **Fix**: ~~Shared `parseSlots()` util, shared availability core~~ Done. Remaining: single email variables builder

#### crouton-editor
- [ ] Toolbar configs — defined in `Simple.vue`, `Blocks.vue`, `WithPreview.vue`
- [ ] Image upload logic — repeated 3 times in `Simple.vue`
- [ ] `useEditorVariables` composable exists but `Preview.vue` reimplements inline
- **Fix**: Extract `toolbarDefaults.ts`, `uploadAndInsertImage()` helper, use the composable

#### crouton-core
- [x] `slugify` — ~~duplicated in `app/utils/slugify.ts` and `server/utils/slug.ts`~~ → canonical in `shared/utils/slugify.ts`, removed re-exports from both (fixed "Duplicated imports" warning)
- [x] `generateCorrelationId` — ~~duplicated in `useTreeMutation.ts` and `useCollectionMutation.ts`~~ → extracted to `app/utils/correlationId.ts`
- [ ] Search filtering logic — duplicated within `useTableData.ts`
- **Fix**: Move to shared utils

#### crouton-collab
- [ ] `getInitials`/`getTextColor` — duplicated in `CollabPresence.vue` and `CollabEditingBadge.vue`
- [ ] Type definitions — duplicated in `types/collab.ts` and individual composables
- **Fix**: Extract to shared utils and import types from one location

#### crouton-flow
- [ ] `generateUserColor` — duplicated in `useFlowSync.ts` and `useFlowPresence.ts`
- [ ] Yjs types — re-declared instead of imported from crouton-collab
- **Fix**: Extract to shared util, import types from collab

#### crouton-maps
- [ ] `STYLE_URLS` — duplicated in `MapBlockRender.vue` and `useMapboxStyles.ts`
- [ ] `MapboxFeature`/`MapboxGeocodeResponse` — duplicated in composable and server API
- **Fix**: Import from single source

#### crouton-charts
- [x] `ChartBlockAttrs` — ~~duplicated in `ChartBlockView.vue` and `ChartBlockRender.vue`~~ → extracted to `app/utils/chart-constants.ts`
- [x] `ChartPresetItem` — ~~duplicated vs existing `ChartPreset` type~~ → replaced with canonical `ChartPreset` from registry
- [x] `DONUT_COLORS`/`COLOR_PALETTE` — ~~duplicated in `Widget.vue` and `useCollectionChart.ts`~~ → unified as `CHART_COLOR_PALETTE` in `app/utils/chart-constants.ts`
- **Fix**: ~~Shared types and constants~~ All done

#### crouton-cli
- [ ] `getAllCollectionsInLayer`/`getAllLayers` — duplicated in `rollback-interactive.ts` and `rollback-bulk.ts`
- [ ] `findPackagesDir` — duplicated in `manifest-merge.ts` and `manifest-loader.ts`
- **Fix**: Extract to shared utility

#### crouton-designer / crouton-atelier
- [x] Entire scaffold infrastructure duplicated between packages — ~~server 7-step pipeline + client types/utils~~ → extracted to `crouton-core/server/utils/scaffold-pipeline.ts` + `crouton-core/shared/types/scaffold.ts` + `crouton-core/shared/utils/scaffold.ts`
- [ ] `ModuleEntry`/`ModuleAIContext` — defined 3 times in designer (internal, not cross-package)
- [x] `CATEGORY_ICONS` — ~~duplicated between packages~~ → `SCAFFOLD_CATEGORY_ICONS` in `crouton-core/shared/utils/scaffold.ts`
- [ ] `buildCollectionsContext` — 3 near-identical implementations (internal to designer, not cross-package)
- **Fix**: ~~Extract shared scaffold utility to crouton-core~~ Scaffold pipeline, types, and client utils extracted; both endpoints now thin wrappers

#### crouton-email
- [ ] 6 sender functions with identical pattern (render template, call send)
- [ ] Options vs Props interfaces share ~90% fields
- **Fix**: Single `sendTemplatedEmail()` helper, use `Pick<>`/`Omit<>` for type dedup

### 7. Composables That Aren't Composables (No Reactive State)

These have `use` prefix but contain zero reactive state — should be plain utility functions:

- [ ] **crouton-core** — `useCollectionProxy.ts` — pure transform functions
- [ ] **crouton-pages** — `usePageBlocks.ts` — 203 lines of passthrough to utils
- [ ] **crouton-i18n** — `useTranslationsUi.ts` — static config objects
- [ ] **crouton-maps** — `useMapboxStyles.ts` — wraps a constant
- [ ] **crouton-triage** — `useTriageFieldMapping.ts` — pure functions with alias
- [ ] **crouton-designer** — `useReviewPrompt.ts`, `useSeedDataPrompt.ts` — prompt template builders
- [ ] **crouton-charts** — `useBlockRegistry.ts` — static data wrapped in `computed()`
- [ ] **crouton-atelier** — `useAtelierSync.ts` — trivial passthrough to `useCollabSync`

**Fix**: Convert to plain function exports or constants. Remove `use` prefix.

### 8. Deprecated Nitro Error Format

Uses `statusCode`/`statusMessage` instead of `status`/`statusText` (Nitro v3):

- [ ] **crouton-admin** — `super-admin.ts` middleware (6+ occurrences)
- [ ] **crouton-admin** — `team-admin.ts` middleware (6+ occurrences)

---

## Moderate Issues

### 9. Non-Vue/Non-Nuxt Patterns

- [ ] **crouton-i18n** — `DevModeToggle.vue:139-160` — `document.querySelectorAll('*')` DOM scan for missing translations
- [ ] **crouton-maps** — `MapBlockView.vue:65-69` — `document.dispatchEvent(CustomEvent)` instead of emit/inject
- [ ] **crouton-maps** — `useMarkerColor.ts` — creates temp DOM element to read CSS variable (use VueUse `useCssVar`)
- [ ] **crouton-flow** — `Flow.vue:787-806` — `resolveComponent()` usage (banned by project CLAUDE.md)
- [ ] **crouton-core** — `component-warmup.client.ts` — `vueApp._context.components` (also banned)
- [ ] **crouton-collab** — Mix of `typeof window === 'undefined'` and `import.meta.server` (inconsistent)
- [ ] **crouton-admin** — `setTimeout(resolve, 100)` polling in both middleware files (fragile)
- [ ] **crouton-triage** — `process.client` instead of `import.meta.client` (not tree-shakeable)
- [ ] **crouton-ai** — `translation-ai.ts` — raw `fetch()` instead of `$fetch`
- [ ] **crouton-themes** — `useThemeSwitcher.ts` — direct `document.body.classList` manipulation (use `useHead()`)
- [ ] **crouton-editor** — `Simple.vue:143-173` — `document.createElement('input')` for file selection
- [ ] **crouton-flow** — `Node.vue:104-150` — inline SVG icons instead of `UIcon`
- [ ] **crouton-maps** — `Picker.vue:22-24` — `useRoute().params.team` instead of `useTeamContext()`
- [ ] **crouton-sales** — `useHelperAuth.ts:109` — side effects inside computed property
- [ ] **crouton-themes** — `Knob.vue:42-64` — event listeners on `window` without cleanup (use `useEventListener`)

### 10. Reinventing the Wheel

- [ ] **crouton-triage** — 353-line custom logger (`server/utils/logger.ts`) — use `consola`
- [ ] **crouton-triage** — 318-line custom rate limiter (`server/utils/rateLimit.ts`) — use `rate-limiter-flexible` or h3
- [ ] **crouton-triage** — 307-line custom metrics collector (`server/utils/metrics.ts`) — use OpenTelemetry
- [ ] **crouton-triage** — 213-line `securityCheck.ts` — move to CI or startup plugin
- [ ] **crouton-cli** — `pascal()`, `toSnakeCase()`, `toKebabCase()` in `helpers.ts` — use `scule`
- [ ] **crouton-core** — hand-rolled English singularization in `useFormatCollections.ts` — use `pluralize` npm package
- [ ] **crouton-events** — hand-rolled `relativeTime` in `CroutonEventDetail.vue` — use VueUse's `useTimeAgo()`
- [ ] **crouton-admin** — `formatDate()` duplicated in `UserList.vue` and `TeamList.vue`

### 11. Dead Code

- [ ] **crouton-core** — empty `tree-styles.client.ts` plugin (comment says "moved to CSS")
- [ ] **crouton-auth** — `useAuthLoading.ts` (146 lines, appears unused by `useAuth`)
- [ ] **crouton-maps** — `useMap.ts` composable (never called — `nuxt-mapbox` used instead)
- [ ] **crouton-collab** — `badgeColor` computed in `CollabStatus.vue` (never used in template)
- [ ] **crouton-ai** — `formattedContent` in `Message.vue` (returns input unchanged)
- [ ] **crouton-events** — `enrichedData` computed in `useCroutonEvents.ts` (TODO, does nothing)
- [ ] **crouton-triage** — `validateConfig` in `slack.ts` checks fields that no longer exist in types
- [ ] **crouton-pages** — `switchToLocale` in `useLocalizedSlug.ts` (identical to `getLocalizedUrl`)
- [ ] **crouton-core** — `side` computed in `useExpandableSlideover.ts` (always returns `'right'`)
- [ ] **crouton-cli** — `parseArgs()`/`main()` in rollback files (never executed as entry points)
- [ ] **crouton-ai** — hardcoded `confidence: 0.9` in `translate.post.ts`
- [ ] **crouton-i18n** — commented-out fallback logic in `Display.vue`

### 12. Overengineered Infrastructure

- [ ] **crouton-devtools** — `client.ts` — 34,000+ token inline HTML string with Vue+Tailwind from CDN
- [ ] **crouton-devtools** — `eventsHealth.ts` — loads ALL events into memory for stats (use SQL aggregates)
- [ ] **crouton-devtools** — `OperationStore`/`SystemOperationStore` classes — should be plain module-scoped closures
- [ ] **crouton-cli** — `manifest-bridge.ts` — 97-line pure passthrough file
- [ ] **crouton-mcp** — 8 identical tool registration wrappers in `index.ts`
- [ ] **crouton-core** — `useCroutonMutate.ts` — thin proxy, use `useCollectionMutation` directly
- [ ] **crouton-core** — `useCrouton.ts` — mixed concerns (modal state + pagination state)
- [ ] **crouton-auth** — `useAuthConfig.ts` — redundant `RuntimeAuthConfig` type and deprecated helpers
- [ ] **crouton-admin** — `useAdminDb()` — null check wrapper for auto-imported `db`
- [ ] **crouton-ai** — `AITranslateButton.vue` — 16 props covering two unrelated modes
- [ ] **crouton-ai** — `useAIProvider.ts` — 7+ trivial one-liner functions as composable returns
- [ ] **crouton-mcp** — `inferLayerFromName()` — hardcoded name-to-layer dictionary

---

## Minor Issues

### 13. Explicit Vue Imports in Nuxt (auto-imported)

- [ ] **crouton-charts** — `useCollectionChart.ts` and `Widget.vue`
- [ ] **crouton-themes** — `Knob.vue`

### 14. Excessive `any` Types

- [ ] **crouton-maps** — `Map.vue` — `mapInstance` as `ref<any>`
- [ ] **crouton-designer** — multiple composables cast `appConfig.crouton` to `any`
- [ ] **crouton-bookings** — `email-service.ts` — 5+ `(schema as any)` casts
- [ ] **crouton-mcp-toolkit** — `mcp-collections.ts` — `(appConfig as Record<string, any>)`
- [ ] **crouton-assets** — `Record<string, any>` for asset items (should have `Asset` interface)

### 15. Console.log in Production Code

- [ ] **crouton-triage** — `useTriageOAuth.ts:121-123` — debug log statements

### 16. Miscellaneous

- [x] **crouton-admin** — ~~`useAdminTeams.ts` and `useAdminUsers.ts` — manual URLSearchParams~~ → replaced with `$fetch`'s `query` option
- [ ] **crouton-pages** — `reservedPrefixes` duplicated in middleware and composable
- [ ] **crouton-sales** — `calculateItemPrice` duplicated between composable and Cart component
- [ ] **crouton-sales** — ESC/POS buffer fix logic duplicated in `formatReceipt` and `formatTestReceipt`
- [ ] **crouton-i18n** — hardcoded locale imports (`en`, `nl`, `fr`) in `serverTranslations.ts`
- [ ] **crouton-i18n** — `getAvailableLocales()` takes a `key` param that is never used
- [ ] **crouton-i18n** — duplicate watcher logic in `useT.ts` for team slug and locale changes
- [ ] **crouton-flow** — `JSON.stringify()` comparison for row data change detection
- [ ] **crouton-flow** — `flushPositions` uses individual updates instead of batch `updatePositions()`
- [ ] **crouton-collab** — awareness callbacks array never cleans up stale references
- [ ] **crouton-collab** — `isPolling` computed wraps a ref for no benefit
- [ ] **crouton-email** — "expires after 10 minutes" hardcoded vs configurable expiry
- [ ] **crouton-bookings** — unused `result` variable in `useBookingEmail.ts:38`
- [ ] **crouton-sales** — non-shared cart state via `ref` instead of `useState`

---

## What's Done Well

These patterns are correct across the entire codebase:

- **Composition API** — `<script setup lang="ts">` everywhere, zero Options API
- **No Pinia** — `useState()` for state management throughout
- **No Axios** — `$fetch`/`useFetch` used consistently
- **Nuxt UI v4** — correct component names (`USeparator`, `USwitch`, `UDropdownMenu`)
- **VueUse adoption** — `useDebounceFn`, `useClipboard`, `useOnline`, `onClickOutside`, etc.
- **Server auth** — consistent `resolveTeamAndCheckMembership` pattern
- **Layer architecture** — proper domain isolation with Nuxt layers
- **Drizzle ORM** — clean, idiomatic usage throughout server code
- **Auto-imports** — leveraged correctly in most packages
- **Well-layered composable hierarchies** — especially in crouton-collab and crouton-flow
- **Proper error handling** — `createError` with Zod validation on server endpoints

### Package-Specific Highlights

| Package | What's Done Right |
|---------|-------------------|
| crouton-core | `useCollectionQuery` (proper `useFetch`), `useNotify` (clean toast wrapper), `useImageCrop` (Cropperjs v2) |
| crouton-auth | `useSession` (SSR-safe with `useState`), `useAuthError.withError()` (good pattern, just underused) |
| crouton-collab | Composable layering: connection -> sync -> editor (genuine abstraction hierarchy) |
| crouton-flow | `useFlowLayout` (well-documented dagre with `needsLayout` heuristics) |
| crouton-i18n | Input.vue composable decomposition (textbook Composition API) |
| crouton-pages | `useReorderMode` (clean snapshot/diff pattern) |
| crouton-mcp-toolkit | Cleanest package — generic tools + collection registry, zero config per collection |
| crouton-email | Auth hook architecture (auth fires, email subscribes, decoupled) |
| crouton-maps | Token security (private server key for geocoding, public restricted for tiles) |

---

## Top 10 Highest-ROI Fixes

| # | Fix | Packages | Lines Saved | Effort |
|---|-----|----------|-------------|--------|
| 1 | Split `useAuth` + use `withError()` | auth | ~500 | Medium |
| 2 | Extract shared asset utils | assets | ~200 | Low |
| 3 | Replace manual fetch with `useFetch`/`useAsyncData` | admin, auth, triage, core | ~400 | Medium |
| 4 | Fix SSR-unsafe `ref()` -> `useState()` | auth, admin, core, triage | ~20 (but fixes bugs) | Low |
| 5 | Unify AI provider/model registry | ai | ~150 | Medium |
| 6 | Delete dead code | core, auth, maps, collab, events | ~500 | Low |
| 7 | ~~Extract shared scaffold infrastructure~~ ✅ | atelier, designer | ~300 | Medium |
| 8 | Replace `new Function()` with `jiti` | crouton, i18n | ~30 (but fixes security) | Low |
| 9 | Consolidate triage duplications | triage | ~400 | Medium |
| 10 | Replace custom logger/rate-limiter/metrics | triage | ~980 | Medium |

---

## Recommended Execution Order

### Phase 1: Quick Wins (Low effort, high impact)
1. Delete dead code (empty plugins, unused composables)
2. Fix SSR-unsafe `ref()` -> `useState()`
3. Replace `new Function()` config loading
4. Fix deprecated Nitro error format
5. Remove console.log from production code

### Phase 2: DRY Cleanup (Medium effort) — COMPLETED
6. ~~Extract shared asset utilities~~ ✅ `app/utils/asset.ts` (crouton-assets)
7. ~~Consolidate event types and export functions~~ ✅ types + utils + filters (crouton-events)
8. ~~Extract shared chart constants and types~~ ✅ `app/utils/chart-constants.ts` (crouton-charts)
9. ~~Unify AI provider/model registry~~ ✅ `shared/utils/ai-providers.ts` + `language-names.ts` (crouton-ai)
10. ~~Consolidate core utils (slugify, correlationId)~~ ✅ done in Phase 2a

### Phase 3: Architecture Improvements (Higher effort)
11. ~~Split `useAuth` god composable~~ ✅ split into `usePasskeys`, `useTwoFactor`, `usePasswordReset`
12. ~~Replace manual fetch boilerplate with `useFetch`~~ ✅ (easy targets: 4 triage composables → `useFetch`/`useAsyncData`; remaining: `useAdminStats`, `useCollectionItem`)
13. ~~Extract shared scaffold infrastructure~~ ✅ pipeline + types + utils to crouton-core
14. Refactor triage duplications (14a ✅ similarity/field-mapping deduplicated into `shared/utils/field-mapping.ts`)
15. Split `useBookingCart` and `Flow.vue` (15a ✅ useBookingCart deduped + composed via useBookingAvailability)

#### Phase 3 Readiness Assessment (2026-03-03)

| # | Item | Files | Complexity | Single Session? | Notes |
|---|------|-------|-----------|----------------|-------|
| 11 | Split `useAuth` | 1 → 3-4 new | Medium | Yes | 924 lines, 27 exports. Clear split: passkeys (~250L), 2FA (~260L), password reset (~45L). Post-split: ~200L. `withError()` exists but unused. |
| 12 | Replace manual fetch | 5-6 files / 3 pkgs | Variable | Partial | 3 triage composables easy. `useAdminStats` moderate (interval refresh). `useCollectionItem` difficult (SSR + dynamic URL). `useAuthCache` out of scope (not a fetch wrapper). |
| 13 | ~~Extract scaffold infra~~ ✅ | ~4 files / 2 pkgs | Medium-High | Yes (tight) | Done — extracted pipeline + types + utils to crouton-core. Both endpoints now thin wrappers. |
| 14 | Triage duplications | 4 files | Medium | Split | **14a ✅**: `calculateSimilarity` + field-mapping deduplicated into `shared/utils/field-mapping.ts`. **14b**: Email parser (1,011L, 3 functions sharing 60%) = separate session. |
| 15 | Split BookingCart + Flow | 2 large files | High | No — 1 each | **15a ✅**: BookingCart 669→600L, composed via useBookingAvailability, deduped slot parsing + types. **15b**: Flow.vue: 1,046L (812 script). |

**Recommended order**: ~~11~~ → ~~14a (similarity/field-mapping)~~ → ~~12 (easy targets)~~ → ~~13~~ → ~~15a (booking)~~ → 15b (flow) → 14b (email parser) → 12 (useCollectionItem)

### Phase 4: Infrastructure (When time permits)
16. Replace custom triage infrastructure (logger, rate limiter, metrics)
17. Convert non-composables to plain utils
18. Refactor devtools inline HTML
19. Remove CLI manifest bridge