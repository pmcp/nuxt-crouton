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

- [x] ✅ **crouton-auth** — ~~`useAuth.ts` (925 lines)~~
  - ~~Handles: login, registration, OAuth, passkeys, 2FA, password management~~
  - **Done**: Split into `usePasskeys()` (219L), `useTwoFactor()` (222L), `usePasswordReset()` (68L). Core `useAuth.ts` reduced from 925→396L.

- [x] ✅ **crouton-bookings** — ~~`useBookingCart.ts` (670 lines, 40+ exports)~~
  - ~~Handles: form state, availability, slot computation, cart CRUD, schedule rules, monthly limits, calendar helpers~~
  - ~~Duplicates ~40% of `useBookingAvailability` logic~~
  - **Done**: Exported `parseLocationSlots()` standalone from `useBookingSlots.ts`, moved `AvailabilityData`/`ALL_DAY_SLOT` to `types/booking.ts`, refactored `useBookingCart` to compose `useBookingAvailability` (eliminating base availability duplication), deduped slot parsing in `useScheduleRules`. Cart: 669→600L. Public API unchanged.

- [x] ✅ **crouton-flow** — ~~`Flow.vue` (812 lines in `<script setup>`)~~
  - ~~Handles: standalone + sync modes, Yjs seeding, layout, drag/drop, ghost nodes, custom node resolution, presence~~
  - **Done**: Extracted `useFlowDragDrop()` (202L) and `useFlowSyncBridge()` (231L) composables. Flow.vue script: 812→393L (52% reduction). Also deduplicated position parsing via shared `parsePosition()` helper in sync bridge. Public API and template bindings unchanged.

### 2. SSR-Unsafe Module-Level `ref()` (State Bleed Between Requests)

These use `ref()` at module scope instead of `useState()`, causing state to persist across SSR requests:

- [x] **crouton-auth** — ~~`useAccountSettingsModal.ts`~~ — already uses `useState()` (was fixed earlier)
- [x] **crouton-admin** — ~~`useImpersonation.ts`~~ — `loading`/`error` refs → `useState()` for shared state across callers
- [x] **crouton-core** — ~~`useTreeDrag.ts`~~ — `moveBlocked`/`autoExpandedIds` → `useState()`; `expandTimeouts` kept module-level (non-serializable timeout handles, client-only)
- [x] **crouton-triage** — `useTriageNotionSchema.ts` — ~~`fetchingSchema`, `schemaFetchError`, `fetchedSchema`~~ → replaced with `useAsyncData` (SSR-safe)

**Fix for all**: Replace `ref()` with `useState('key', () => defaultValue)`.

### 3. Direct `localStorage` Without SSR Safety

- [x] ✅ **crouton-auth** — ~~`useScopedAccess.ts` — raw `localStorage.getItem/setItem`~~ → replaced with `useCookie()` for SSR+client persistence; session now available during SSR
- [x] ✅ **crouton-themes** — ~~`useThemeSwitcher.ts` — manual localStorage with `import.meta.client` guards~~ → replaced with VueUse's `useLocalStorage()` for SSR-safe persistence

### 4. Unsafe Config Loading (`new Function` / eval)

- [x] ✅ **crouton** (main module) — ~~`module.ts:137-163` — `new Function()` to parse config~~ → replaced with `jiti` (synchronous `createJiti` + require-like call)
- [x] ✅ **crouton-i18n** — ~~`config-utils.ts:64` — `new Function()` to parse config~~ → replaced with `jiti` (same pattern)

**Fix**: ~~Use `jiti` (already a Nuxt dependency) or `c12`'s `loadConfig`~~ Done — both use `createJiti(import.meta.url)` for safe, synchronous config loading. Also handles complex configs with imports/variables that the regex approach couldn't.

---

## Major Issues

### 5. Manual Fetch Boilerplate (Should Use `useFetch`/`useAsyncData`)

All of these manually manage `loading`, `error`, `data` refs around `$fetch` calls:

- [ ] **crouton-admin** — `useAdminStats.ts` (only auto-refresh via `useIntervalFn` is added value)
- [x] **crouton-admin** — `useAdminTeams.ts` — ~~identical boilerplate~~ → extracted `withLoading()` helper, replaced `URLSearchParams` with `$fetch` `query` option
- [x] **crouton-admin** — `useAdminUsers.ts` — ~~identical boilerplate~~ → extracted `withLoading()` helper, replaced `URLSearchParams` with `$fetch` `query` option
- [ ] **crouton-auth** — `useAuthCache.ts` (184 lines reimplementing Nuxt caching)
- [x] **crouton-core** — `useCollectionItem.ts` — ~~manual $fetch + ref + onMounted retry~~ → `useAsyncData` with `server: false` for SSR-safe deferred fetch, `watch` for reactive ID
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
- [x] ✅ `getInitials`/`getTextColor` — ~~duplicated in `CollabPresence.vue` and `CollabEditingBadge.vue`~~ → extracted to `app/utils/avatar.ts`
- [x] ✅ Type definitions — ~~stale `UseCollabPresenceOptions` in `types/collab.ts`~~ → removed stale interface (composable has canonical definition)
- **Fix**: ~~Extract to shared utils and import types from one location~~ Done

#### crouton-flow
- [x] ✅ `generateUserColor` — ~~duplicated in `useFlowSync.ts` and `useFlowPresence.ts`~~ → removed local copies, now uses auto-imported `generateUserColor` from crouton-collab
- [x] ✅ Yjs types — ~~re-declared instead of imported from crouton-collab~~ → removed local `CollabUser`/`CollabAwarenessState`/`CollabConnectionState` from `types/yjs.ts`, now auto-imported from crouton-collab
- **Fix**: ~~Extract to shared util, import types from collab~~ Done

#### crouton-maps
- [x] ✅ `STYLE_URLS` — ~~duplicated in `MapBlockRender.vue` and `CollectionMapBlockRender.vue`~~ → replaced with `getMapboxStyle()` from `useMapboxStyles.ts`
- [x] ✅ `MapboxFeature`/`MapboxGeocodeResponse` — ~~duplicated in composable and server API~~ → extracted to `shared/types/geocode.ts`
- **Fix**: ~~Import from single source~~ Done

#### crouton-charts
- [x] `ChartBlockAttrs` — ~~duplicated in `ChartBlockView.vue` and `ChartBlockRender.vue`~~ → extracted to `app/utils/chart-constants.ts`
- [x] `ChartPresetItem` — ~~duplicated vs existing `ChartPreset` type~~ → replaced with canonical `ChartPreset` from registry
- [x] `DONUT_COLORS`/`COLOR_PALETTE` — ~~duplicated in `Widget.vue` and `useCollectionChart.ts`~~ → unified as `CHART_COLOR_PALETTE` in `app/utils/chart-constants.ts`
- **Fix**: ~~Shared types and constants~~ All done

#### crouton-cli
- [x] ✅ `getAllCollectionsInLayer`/`getAllLayers` — ~~duplicated in `rollback-interactive.ts`, `rollback-bulk.ts`, and `collection-types-registry.ts`~~ → extracted to `lib/utils/layer-discovery.ts`
- [x] ✅ `findPackagesDir` — ~~duplicated in `manifest-merge.ts` and `manifest-loader.ts`~~ → canonical in `manifest-loader.ts` (exported), `manifest-merge.ts` now imports it
- **Fix**: ~~Extract to shared utility~~ Done

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

- [x] ✅ **crouton-core** — ~~`useCollectionProxy.ts` — pure transform functions~~ → exported `applyProxyTransform()` and `getProxiedEndpoint()` as standalone functions
- [x] ✅ **crouton-pages** — ~~`usePageBlocks.ts` — 203 lines of passthrough to utils~~ → deleted (zero code consumers, underlying utils already exist)
- [x] ✅ **crouton-i18n** — ~~`useTranslationsUi.ts` — static config objects~~ → removed composable wrapper, constants already exported at module level
- [x] ✅ **crouton-maps** — ~~`useMapboxStyles.ts` — wraps a constant~~ → exported `getMapboxStyle()` as standalone function, removed wrapper
- [x] ✅ **crouton-triage** — ~~`useTriageFieldMapping.ts` — pure functions with alias~~ → removed composable wrapper, re-exported shared functions
- [x] ✅ **crouton-designer** — ~~`useReviewPrompt.ts`, `useSeedDataPrompt.ts` — prompt template builders~~ → exported `buildReviewSystemPrompt()` and `buildSeedDataSystemPrompt()` directly
- [x] ✅ **crouton-atelier** — ~~`useBlockRegistry.ts` — static data wrapped in `computed()`~~ → exported `allBlocks`, `blocksByCategory`, `blockCategories`, `getBlock()` as plain constants/functions
- [ ] **crouton-atelier** — `useAtelierSync.ts` — trivial passthrough to `useCollabSync` (skipped — genuinely wraps a reactive composable)

**Fix**: ~~Convert to plain function exports or constants. Remove `use` prefix.~~ Done (7/8). `useAtelierSync` left as-is because it wraps `useCollabSync` and returns reactive state.

### 8. Deprecated Nitro Error Format

Uses `statusCode`/`statusMessage` instead of `status`/`statusText` (Nitro v3):

- [x] ✅ **crouton-admin** — ~~`super-admin.ts` middleware~~ — already uses correct `status`/`statusText` format
- [x] ✅ **crouton-admin** — ~~`team-admin.ts` middleware~~ — already uses correct `status`/`statusText` format
- [x] ✅ **crouton-triage** — ~~`oauth/slack/install.get.ts`~~ — `statusCode`/`statusMessage` → `status`/`statusText`

---

## Moderate Issues

### 9. Non-Vue/Non-Nuxt Patterns

- [x] **crouton-i18n** — `DevModeToggle.vue:139-160` — `document.querySelectorAll('*')` DOM scan — acceptable for dev-only tool (scans DOM for `[missing.key]` patterns)
- [ ] **crouton-maps** — `MapBlockView.vue:65-69` — `document.dispatchEvent(CustomEvent)` instead of emit/inject
- [x] ✅ **crouton-maps** — ~~`useMarkerColor.ts` — creates temp DOM element to read CSS variable~~ — cleaned up DOM probe code. Note: temp element still required because `useCssVar` returns raw OKLCH strings; the probe forces browser resolution to RGB for Mapbox hex colors
- [ ] **crouton-flow** — `Flow.vue:380-383` — `resolveComponent()` usage — genuinely needed for dynamic custom node component resolution (not optional-package detection)
- [ ] **crouton-core** — `component-warmup.client.ts` — `vueApp._context.components` — architectural, needs separate design work
- [x] ✅ **crouton-collab** — ~~Mix of `typeof window === 'undefined'` and `import.meta.server`~~ — already resolved (no mixed patterns found)
- [x] ✅ **crouton-admin** — ~~`setTimeout(resolve, 100)` polling in both middleware files~~ — replaced with Vue `watch`-based await in super-admin.ts and team-admin.ts
- [x] ✅ **crouton-triage** — ~~`process.client` instead of `import.meta.client`~~ — replaced 3 occurrences in `inbox.vue` (tree-shakeable)
- [x] ✅ **crouton-ai** — ~~`translation-ai.ts` — raw `fetch()` instead of `$fetch`~~ — replaced with `$fetch` (auto error handling, no manual JSON parse)
- [x] ✅ **crouton-themes** — ~~`useThemeSwitcher.ts` — direct `document.body.classList` manipulation~~ — replaced with `useHead({ bodyAttrs: { class } })` for SSR-compatible body class management
- [x] **crouton-editor** — `Simple.vue:143-173` — `document.createElement('input')` for file selection — standard pattern for programmatic file picker (no better Vue alternative)
- [x] **crouton-flow** — `Node.vue:104-150` — inline SVG icons — small custom icons specific to flow nodes, not suitable for UIcon
- [x] ✅ **crouton-maps** — ~~`Picker.vue:22-24` — `useRoute().params.team` instead of `useTeamContext()`~~ — component no longer exists
- [x] ✅ **crouton-sales** — ~~`useHelperAuth.ts:109` — side effects inside computed property~~ — removed `loadSession()` and `clearSession()` calls from computed; now pure selector
- [x] **crouton-themes** — `Knob.vue:42-64` — event listeners on `window` — properly cleaned up via `removeEventListener` in mouseUp handler

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

- [x] ✅ **crouton-core** — ~~empty `tree-styles.client.ts` plugin~~ — already removed
- [x] ✅ **crouton-auth** — ~~`useAuthLoading.ts`~~ — already removed
- [x] ✅ **crouton-maps** — ~~`useMap.ts` composable~~ — deleted (never called, nuxt-mapbox used instead)
- [x] ✅ **crouton-collab** — ~~`badgeColor` computed in `CollabStatus.vue`~~ — already removed
- [x] ✅ **crouton-ai** — ~~`formattedContent` in `Message.vue`~~ — already removed
- [x] ✅ **crouton-events** — ~~`enrichedData` computed in `useCroutonEvents.ts`~~ — removed no-op computed, return `data` directly
- [x] ✅ **crouton-triage** — ~~`validateConfig` in `slack.ts`~~ — removed checks for non-existent `notionToken`/`notionDatabaseId`/`settings`, uses `sourceMetadata` instead
- [x] ✅ **crouton-pages** — ~~`switchToLocale` in `useLocalizedSlug.ts`~~ — removed (identical wrapper around `getLocalizedUrl`)
- [x] ✅ **crouton-core** — ~~`side` computed in `useExpandableSlideover.ts`~~ — removed (always 'right', component hardcodes it)
- [x] ✅ **crouton-cli** — ~~`parseArgs()`/`main()` in rollback files~~ — removed from all 3 rollback files (dead entry points)
- [x] ✅ **crouton-ai** — ~~hardcoded `confidence: 0.9` in `translate.post.ts`~~ — removed meaningless hardcoded field from response
- [x] ✅ **crouton-i18n** — ~~commented-out fallback logic in `Display.vue`~~ — removed commented-out code

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

- [x] ✅ **crouton-triage** — ~~`InputManager.vue` (3 debug logs)~~ — removed OAuth success/refetch debug logs
- [x] ✅ **crouton-triage** — ~~`oauth/slack/install.get.ts` (5 debug logs)~~ — removed endpoint hit/config/KV/flow debug logs
- [x] ✅ **crouton-triage** — `useTriageOAuth.ts` — already clean (only legitimate `console.warn`/`console.error`)

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
| 8 | ~~Replace `new Function()` with `jiti`~~ ✅ | crouton, i18n | ~30 (but fixes security) | Low |
| 9 | Consolidate triage duplications | triage | ~400 | Medium |
| 10 | Replace custom logger/rate-limiter/metrics | triage | ~980 | Medium |

---

## Recommended Execution Order

### Phase 1: Quick Wins (Low effort, high impact)
1. Delete dead code (empty plugins, unused composables)
2. Fix SSR-unsafe `ref()` -> `useState()`
3. ~~Replace `new Function()` config loading~~ ✅
4. ~~Fix deprecated Nitro error format~~ ✅
5. ~~Remove console.log from production code~~ ✅

### Phase 2: DRY Cleanup (Medium effort) — COMPLETED
6. ~~Extract shared asset utilities~~ ✅ `app/utils/asset.ts` (crouton-assets)
7. ~~Consolidate event types and export functions~~ ✅ types + utils + filters (crouton-events)
8. ~~Extract shared chart constants and types~~ ✅ `app/utils/chart-constants.ts` (crouton-charts)
9. ~~Unify AI provider/model registry~~ ✅ `shared/utils/ai-providers.ts` + `language-names.ts` (crouton-ai)
10. ~~Consolidate core utils (slugify, correlationId)~~ ✅ done in Phase 2a

### Phase 3: Architecture Improvements (Higher effort)
11. ~~Split `useAuth` god composable~~ ✅ split into `usePasskeys`, `useTwoFactor`, `usePasswordReset`
12. ~~Replace manual fetch boilerplate with `useFetch`~~ ✅ (easy targets: 4 triage composables → `useFetch`/`useAsyncData`; `useCollectionItem` → `useAsyncData` with SSR-safe `server:false` pattern; remaining: `useAdminStats`)
13. ~~Extract shared scaffold infrastructure~~ ✅ pipeline + types + utils to crouton-core
14. ~~Refactor triage duplications~~ ✅ (14a ✅ similarity/field-mapping deduplicated into `shared/utils/field-mapping.ts`; 14b ✅ email parser deduplicated — extracted `prepareEmailContext`, `extractFileKey`, `buildParsedEmail` shared helpers, `parseEmail`/`parseEmailAsync` now thin wrappers. 1,012→892L, 71 tests pass.)
15. ~~Split `useBookingCart` and `Flow.vue`~~ ✅ (15a ✅ useBookingCart deduped + composed via useBookingAvailability; 15b ✅ Flow.vue split into useFlowDragDrop + useFlowSyncBridge, script 812→393L)

#### Phase 3 Readiness Assessment (2026-03-03)

| # | Item | Files | Complexity | Single Session? | Notes |
|---|------|-------|-----------|----------------|-------|
| 11 | Split `useAuth` | 1 → 3-4 new | Medium | Yes | 924 lines, 27 exports. Clear split: passkeys (~250L), 2FA (~260L), password reset (~45L). Post-split: ~200L. `withError()` exists but unused. |
| 12 | Replace manual fetch | 5-6 files / 3 pkgs | Variable | Partial | 4 triage composables ✅. `useCollectionItem` ✅ (useAsyncData + server:false). `useAdminStats` remaining (interval refresh). `useAuthCache` out of scope (not a fetch wrapper). |
| 13 | ~~Extract scaffold infra~~ ✅ | ~4 files / 2 pkgs | Medium-High | Yes (tight) | Done — extracted pipeline + types + utils to crouton-core. Both endpoints now thin wrappers. |
| 14 | ~~Triage duplications~~ ✅ | 4 files | Medium | Split | **14a ✅**: `calculateSimilarity` + field-mapping deduplicated into `shared/utils/field-mapping.ts`. **14b ✅**: Email parser deduplicated — extracted shared helpers (`prepareEmailContext`, `extractFileKey`, `buildParsedEmail`), `parseEmail`/`parseEmailAsync` now thin wrappers. 1,012→892L. |
| 15 | ~~Split BookingCart + Flow~~ ✅ | 2 large files | High | No — 1 each | **15a ✅**: BookingCart 669→600L, composed via useBookingAvailability, deduped slot parsing + types. **15b ✅**: Flow.vue script 812→393L, extracted useFlowDragDrop (202L) + useFlowSyncBridge (231L). |

**Recommended order**: ~~11~~ → ~~14a (similarity/field-mapping)~~ → ~~12 (easy targets)~~ → ~~13~~ → ~~15a (booking)~~ → ~~15b (flow)~~ → ~~14b (email parser)~~ → ~~12 (useCollectionItem)~~ — **Phase 3 complete!**

### Phase 4: Infrastructure (When time permits)
16. Replace custom triage infrastructure (logger, rate limiter, metrics)
17. ~~Convert non-composables to plain utils~~ ✅ (7/8 converted: useCollectionProxy, usePageBlocks, useTranslationsUi, useMapboxStyles, useTriageFieldMapping, useReviewPrompt/useSeedDataPrompt, useBlockRegistry. Skipped useAtelierSync — genuine composable.)
18. Refactor devtools inline HTML
19. Remove CLI manifest bridge