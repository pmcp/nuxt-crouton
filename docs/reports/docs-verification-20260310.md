# Documentation Verification Report

Date: 2026-03-10
Pages verified: 15
Scope: features (`apps/docs/content/6.features/`)

## Summary

| Status | Count |
|--------|-------|
| Verified claims | ~120 |
| Broken claims | ~65 |
| Suspicious | ~25 |
| Missing from docs | ~90 |

## Pages by Health

### Needs Rewrite (>50% broken claims)

- **6.features/6.rich-text.md** -- 2/4 documented components don't exist, most props are wrong, TipTap integration section is fabricated (wraps UEditor, not raw TipTap)
- **6.features/19.bookings.md** -- All 3 composable signatures completely wrong, component prefix wrong (CroutonBooking vs CroutonBookings), test app doesn't exist
- **6.features/20.sales.md** -- usePosOrder signature completely wrong, config pattern wrong, test app doesn't exist, no server API routes exist in package

### Needs Fixes (specific claims to update)

- **6.features/1.internationalization.md** -- Version wrong (1.3.0 vs 0.1.0), phantom component CroutonI18nDevWrapper, useTranslationsUi() not a composable, useT() getAvailableLocales signature wrong, LanguageSwitcher implementation wrong, seed command wrong, default locales wrong
- **6.features/9.events.md** -- Version wrong, useCroutonEventsHealth doesn't exist, CroutonEventsCollectionEventsList doesn't exist (actual components have different names), cleanup import path wrong
- **6.features/10.maps.md** -- Version wrong, popupContent prop doesn't exist (it's popupText), useMap() composable never implemented, useMapboxStyles() is not a composable (it's named exports), MarkerInstance type doesn't exist, Marker #popup slot doesn't exist
- **6.features/11.devtools.md** -- Version wrong, @nuxt/devtools version wrong (1.6.4 vs 3.0.0), CollectionCard/CollectionDetailModal are inline HTML not Vue files, module structure diagram wrong, middleware-based tracking is actually a Nitro plugin, GitHub repo URL wrong
- **6.features/12.flow.md** -- FlowPresence/FlowConnectionStatus components don't exist (use CollabPresence/CollabStatus), FlowRoom Durable Object deprecated (use CollabRoom), yjs_flow_states table deprecated
- **6.features/14.admin.md** -- team-member middleware doesn't exist, useAdminStats return values wrong (getStats/lastUpdated don't exist), requireSuperAdmin import path wrong
- **6.features/17.email.md** -- `crouton: { email: true }` config doesn't exist (it's a layer), VerificationFlow error emit type mismatch (Error vs string), component auto-import names wrong due to pathPrefix:false
- **6.features/18.pages.md** -- usePageTypes() return values mostly wrong (4/6 don't exist), usePageBlocks() composable never implemented, config pattern wrong, URL structure incomplete (missing locale segment), CroutonPagesForm may not exist

### Healthy

- **6.features/15.export.md** -- All claims verified, no broken items
- **6.features/7.assets.md** -- Core API correct, version wrong, component count understated, some props missing
- **6.features/13.ai.md** -- Most claims verified, minor issues (o3-mini not actually supported, deprecated statusCode in example)
- **6.features/16.collaboration.md** -- Most claims verified, minor naming issue in installation

## Common Patterns Across All Pages

### Universal Issues
1. **All versions are wrong** -- every page claims a version like 0.3.0/1.3.0 but all packages are actually at `0.1.0`
2. **`crouton: { feature: true }` config pattern is fabricated** -- appears in bookings, sales, email, pages. These are all Nuxt layers added via `extends:`, not module flags
3. **Component counts are understated** -- most packages have 2-3x more components than documented
4. **Composable return values are often wrong** -- especially for bookings, sales, events, pages, admin
5. **Many composables and components are undocumented** -- ~90 items exist in code but not in docs

### Severity Guide
- **Fabricated** = the documented thing was never built (useMap, usePageBlocks, CroutonEditorToolbar)
- **Wrong signature** = the thing exists but the API is completely different (bookings, sales composables)
- **Renamed** = the thing exists under a different name (FlowPresence -> CollabPresence)
- **Version wrong** = cosmetic, low priority

---

## Detailed Findings

### 6.features/1.internationalization.md

#### Verified
- CroutonI18nInput exists with core props (modelValue, fields, label, error, defaultValues, fieldComponents)
- CroutonI18nDisplay exists with props (translations, languages)
- CroutonI18nInputWithEditor exists with props (modelValue, fields, label, error, useRichText)
- CroutonI18nLanguageSwitcher, LanguageSwitcherIsland, UiForm, UiList, CardsMini, ListCards, DevModeToggle all exist
- useT() exists with correct core returns (t, tString, tContent, tInfo, hasTranslation, etc.)
- useEntityTranslations() exists with correct signature
- Package name @fyit/crouton-i18n correct

#### Broken
- Version: docs say 1.3.0, actual 0.1.0
- CroutonI18nDevWrapper: DOES NOT EXIST
- useTranslationsUi() is NOT a composable -- it exports named constants (translationsUiSchema, TRANSLATIONS_UI_COLUMNS, etc.)
- useT() getAvailableLocales: docs say takes `(key: string)`, actual takes no arguments
- LanguageSwitcher: docs say uses ULocaleSelect with emoji flags -- actual uses USelect, no emoji flags
- Seed command: docs say `pnpm crouton i18n seed --locale --force --dry-run` -- actual is `crouton-generate seed-translations --dry-run --sql --layer`
- Default locales: docs say en/nl/fr, actual locale files are en/es/fr/it/pt

#### Missing from docs
- CroutonI18nAITranslateButton component
- Props: showAiTranslate, fieldType, collab, layout, primaryLocale, secondaryLocale, fieldOptions, fieldGroups
- Composables: useFieldTransforms, useFieldGroups, useAiTranslation, useTranslationFields, useLocaleLayout

---

### 6.features/6.rich-text.md

#### Verified
- CroutonEditorSimple exists with core props (modelValue, placeholder, contentType, editable, autofocus, extensions)
- Events update:modelValue, create, update verified
- CroutonEditorPreview exists with props (content, title, values, variables, mode, expandable, showVariableCount)
- Package name @fyit/crouton-editor correct

#### Broken
- CroutonEditorToolbar: DOES NOT EXIST (docs say "Deprecated in v2.x" but file never existed)
- CroutonEditorCommandsList: DOES NOT EXIST
- Component count: docs say 4, actual is 5 (Simple, Preview, WithPreview, Blocks, Variables) -- 2 documented don't exist, 3 actual aren't documented
- CroutonEditorSimple props: docs list starterKit, markdown, image, mention, handlers, ui -- NONE of these exist. Actual props: modelValue, placeholder, contentType, editable, autofocus, showToolbar, showBubbleToolbar, extensions, enableTranslationAI, translationContext, onTranslationAccept, enableImageUpload
- CroutonEditorSimple events: docs list focus, blur -- actual: update:modelValue, create, update, translationAccept
- CroutonEditorPreview props: docs say content+title only, actual has many more
- TipTap integration section is fabricated: editor wraps Nuxt UI's UEditor, not raw TipTap
- "Adding Custom Extensions" example references nonexistent CroutonEditorToolbar
- Prerequisite version: docs say Nuxt UI v3.4.0, actual peer dep is ^4.3.0

#### Missing from docs
- CroutonEditorWithPreview component
- CroutonEditorBlocks component
- CroutonEditorVariables component
- Props: showToolbar, showBubbleToolbar, enableTranslationAI, translationContext, onTranslationAccept, enableImageUpload
- Event: translationAccept
- Composable: useEditorVariables
- Types: EditorVariable, EditorVariableGroup

---

### 6.features/7.assets.md

#### Verified
- Package name @fyit/crouton-assets correct
- CroutonAssetsPicker exists with collection prop and modelValue
- CroutonAssetsUploader exists with collection prop
- useAssetUpload() exists with correct returns (uploadAsset, uploadAssets, deleteAssetFile, uploading, error, progress)
- uploadAsset/uploadAssets signatures match
- UploadAssetResult interface matches
- assets-schema.json exists

#### Broken
- Version: docs say 0.3.0, actual 0.1.0
- Component count: docs say 2, actual is 7 (Picker, Uploader, Library, Card, AssetTile, Form, FormUpdate)
- CroutonAssetsPicker props: missing crop prop
- CroutonAssetsUploader: missing crop step, i18n alt text, AI alt text features
- AssetMetadata interface: missing translations field for i18n
- Prerequisite @nuxthub/core: not actually a dependency of this package

#### Missing from docs
- CroutonAssetsLibrary, CroutonAssetsCard, CroutonAssetsAssetTile, CroutonAssetsForm, CroutonAssetsFormUpdate
- Admin page app/pages/admin/[team]/media.vue
- CroutonAssetsPicker crop prop and select event

---

### 6.features/9.events.md

#### Verified
- Package name @fyit/crouton-events correct
- useCroutonEventTracker exists with correct track/trackInBackground methods
- TrackEventOptions interface matches
- useCroutonEvents exists with correct returns
- EventChange interface matches
- Smart diff logic confirmed
- Runtime config structure matches
- cleanupOldEvents exists with correct interface
- All API endpoints verified

#### Broken
- Version: docs say 0.3.0, actual 0.1.0
- useCroutonEventsHealth: DOES NOT EXIST as a composable (health tracked internally in plugin)
- CroutonEventsCollectionEventsList: DOES NOT EXIST. Actual components: CroutonActivityLog, CroutonActivityTimeline, CroutonActivityTimelineItem, CroutonActivityFilters, CroutonEventDetail, CroutonEventChangesTable
- CroutonEvent type missing teamId
- Cleanup import path: docs say `#crouton-events/server/utils/cleanup` which may not work
- Error handling mode config not actually checked in plugin

#### Missing from docs
- useCroutonEventsExport composable
- Export API endpoint
- Operations API endpoint
- All 6 actual components (ActivityLog, ActivityTimeline, etc.)
- Operations schema and persistence

---

### 6.features/10.maps.md

#### Verified
- Package name @fyit/crouton-maps correct
- CroutonMapsMap exists with correct props
- CroutonMapsMarker exists with correct core props
- CroutonMapsPopup exists with correct props
- CroutonMapsPreview exists
- useMapConfig composable exists with correct returns
- useGeocode composable exists with correct returns
- MAPBOX_STYLES and getMapboxStyle exist with correct style URLs
- useMarkerColor exists

#### Broken
- Version: docs say 0.3.0, actual 0.1.0
- popupContent prop on Marker: DOES NOT EXIST -- actual is popupText (plain text, not HTML)
- useMap() composable: DOES NOT EXIST (never implemented)
- useMapboxStyles() is NOT a composable -- it's named exports (MAPBOX_STYLES, getMapboxStyle)
- MarkerInstance type: DOES NOT EXIST
- Marker #popup slot: DOES NOT EXIST
- Config example differs from actual (layer auto-sets tokens from env vars)
- TypeScript imports from '@fyit/crouton-maps' likely won't work

#### Missing from docs
- Server-side geocoding proxy at server/api/maps/geocode.get.ts
- MAPBOX_PUBLIC_TOKEN env var (dual token support)
- Dark mode auto-switching
- Block components (MapBlockView, MapBlockRender, etc.)
- Marker active prop

---

### 6.features/11.devtools.md

#### Verified
- Package name @fyit/crouton-devtools correct
- Module type (not layer) confirmed
- Dev-only behavior confirmed
- Tab registration confirmed
- All RPC endpoints verified
- Operation tracking via Nitro plugin confirmed
- operationStore circular buffer (maxSize 500) confirmed
- Operation interface matches
- Stats calculation matches

#### Broken
- Version: docs say 0.3.0, actual 0.1.0
- @nuxt/devtools version: docs say 1.6.4, actual is ^3.0.0
- CollectionCard/CollectionDetailModal: NOT separate Vue files -- it's inline HTML in client.ts
- Module structure diagram completely wrong (files don't exist at documented paths)
- Tracking described as middleware -- actual is Nitro plugin
- GitHub repo URL wrong (friendlyinternet vs pmcp)

#### Missing from docs
- Events integration tab
- System Operations tracking
- Generation history endpoint
- Data Browser page
- API route prefix tracking

---

### 6.features/12.flow.md

#### Verified
- Package name @fyit/crouton-flow correct
- CroutonFlowFlow exists with all documented props verified
- CroutonFlowNode exists with documented props
- useFlowData, useFlowLayout, useFlowMutation, useFlowSync, useFlowPresence all exist with matching signatures
- Dagre auto-layout confirmed
- Dark mode support confirmed

#### Broken
- FlowPresence component: DOES NOT EXIST -- actual is CollabPresence from crouton-collab
- FlowConnectionStatus component: DOES NOT EXIST -- actual is CollabStatus from crouton-collab
- FlowPresence/FlowConnectionStatus props are wrong (different component, different props)
- YjsAwarenessState type: renamed to CollabAwarenessState
- FlowRoom Durable Object: DEPRECATED -- use CollabRoom
- yjs_flow_states table: DEPRECATED -- use yjs_collab_states
- Wrangler config: FLOW_ROOMS binding wrong -- use COLLAB_ROOMS

#### Missing from docs
- CroutonFlowNode collection prop
- CroutonFlowFlow allowDrop, allowedCollections, autoCreateOnDrop props
- CroutonFlowFlow selectionChange and nodeDrop events
- useFlowLayout applyLayoutToNew, nodeWidth, nodeHeight
- useFlowMutation updatePositions (batch)
- useFlowSync connect/disconnect methods
- useFlowPresence getUserColor
- useFlowDragDrop, useFlowSyncBridge composables
- GhostNode component

---

### 6.features/13.ai.md

#### Verified
- Package name @fyit/crouton-ai correct
- All 3 composables (useChat, useCompletion, useAIProvider) exist with mostly correct signatures
- All 3 components (AIChatbox, AIMessage, AIInput) exist with correct props
- createAIProvider server utility exists
- All types match (AIMessage, AIProvider, AIModel)
- Runtime config and env vars match
- Vercel AI SDK dependency confirmed

#### Broken
- o3-mini not actually in supported models list
- useChat status type may have additional states beyond documented
- Rate limiting example uses deprecated statusCode (should be status)
- Troubleshooting says npx nuxt typecheck (should be pnpm typecheck)

#### Missing from docs
- useChat: toolCalls, rawMessages, data, setData, id returns
- useChat: maxSteps, onToolCall options
- AIToolCall type
- useCompletion: handleSubmit, data returns
- AIInput: maxRows prop
- AITranslateButton, AIPageGenerator components
- useTranslationSuggestion composable
- Server endpoints: translate, generate-page, translate-blocks, generate-email-template

---

### 6.features/14.admin.md

#### Verified
- Package @fyit/crouton-admin exists, auto-included
- Three-tier architecture confirmed
- super-admin and team-admin middleware exist
- useAdminUsers exists with correct returns
- useAdminTeams exists with core returns
- useImpersonation exists with correct returns
- All API endpoints verified (12 endpoints)
- All listed components exist
- AdminStats, BanPayload, ImpersonationState types match
- requireSuperAdmin server utility exists
- Ban durations match
- Config options confirmed

#### Broken
- team-member middleware: DOES NOT EXIST
- useAdminStats return: docs say getStats/lastUpdated -- actual is stats/loading/error/refresh
- requireSuperAdmin import path wrong (auto-imported, no import needed)

#### Missing from docs
- useAdminUsers: pageSize, totalPages returns
- useAdminTeams: page, pageSize, totalPages, getTeamMembers
- Components: TeamColorSwatchPicker, TeamThemeSettings, TeamFaviconSettings, TeamRadiusPicker, TeamDomainSettings
- Composables: useTeamTheme, useTeamFavicon
- Team theme plugin

---

### 6.features/15.export.md

#### Verified
- useCollectionExport(collection) exists with correct returns
- ExportOptions interface matches exactly
- ExportField interface matches
- CroutonExportButton exists with correct props, emits, defaults
- CSV handling behavior verified
- Max 10,000 rows confirmed

#### Broken
- None found

#### Missing from docs
- Composable requires team context (useTeamContext) -- dependency not documented

---

### 6.features/16.collaboration.md

#### Verified
- Package name @fyit/crouton-collab correct
- All 4 composables exist with matching signatures and return values
- All 5 components exist with matching props
- All types match source
- API endpoints verified
- D1 migration verified
- CollabRoom Durable Object exists
- Status colors match
- CroutonCollection integration verified

#### Broken
- Installation example uses @fyit/crouton vs @fyit/crouton-core (minor)

#### Missing from docs
- useCollabConnection composable
- useCollabLocalizedContent composable
- useCollectionSyncSignal composable
- collection-sync.client.ts and form-collab.client.ts plugins
- CollabEditingBadge additional props (maxAvatars, variant, showSelf)
- useCollabRoomUsers teamId option
- useCollabSync autoConnect option

---

### 6.features/17.email.md

#### Verified
- Package @fyit/crouton-email exists
- useEmailService() exists with send() method matching docs
- All 5 sender functions exist with matching signatures
- All 4 components exist (VerificationFlow, MagicLinkSent, ResendButton, Input)
- All 6 email templates exist
- Runtime config structure matches
- Environment variables match
- Component props mostly match

#### Broken
- `crouton: { email: true }` config: DOES NOT EXIST -- it's a layer via extends
- VerificationFlow error emit: docs say Error, actual is string
- Component auto-import names likely wrong due to pathPrefix:false

#### Missing from docs
- sendVerificationLink function
- VerificationLink.vue template
- sendBatch method
- Additional props on VerificationFlow (loading, error)
- Additional props on MagicLinkSent (loading, error)
- EmailInput autofocus prop, valid event

---

### 6.features/18.pages.md

#### Verified
- usePageTypes() exists returning pageTypes and getPageType
- useDomainContext() exists with all documented returns
- useNavigation() exists with all documented returns
- CroutonPagesRenderer exists
- Block types verified in block-registry.ts
- Page schema matches source
- Content auto-detection verified
- API endpoints exist
- Custom domain middleware verified

#### Broken
- usePageTypes() return: docs claim pageTypesByApp, pageTypesByCategory, hasPageType, getDefaultPageType -- 4/6 DON'T EXIST
- usePageBlocks() composable: NEVER IMPLEMENTED
- `crouton: { pages: true }` config: DOES NOT EXIST
- URL structure: missing locale segment /[team]/[locale]/[...slug]
- CroutonPagesForm: may not exist
- API endpoint: catch-all [...slug] not single [slug]
- PageBlock type union missing richTextBlock

#### Missing from docs
- Locale-aware page rendering route
- CroutonPagesCollectionPageRenderer component
- useGhostPage, useReorderMode, useLocalizedSlug composables
- Workspace/Editor component
- CollectionBinderRenderer component
- CroutonPagesRenderer locale prop

---

### 6.features/19.bookings.md

#### Verified
- Package name @fyit/crouton-bookings correct
- All 3 composables exist (but signatures wrong)
- API endpoints exist
- Database schemas exist
- Config pattern for email matches

#### Broken
- `crouton: { bookings: true }` config: DOES NOT EXIST
- useBookingAvailability signature: COMPLETELY WRONG (different params and returns)
- useBookingCart signature: COMPLETELY WRONG (different method names, different returns)
- useBookingsSettings: COMPLETELY WRONG (returns config object, not settings/updateSettings/loading)
- Component prefix: docs say CroutonBooking, actual is CroutonBookings (plural)
- apps/test-bookings/ doesn't exist

#### Missing from docs
- 7 additional composables
- ~15 additional components
- Multiple additional API endpoints
- i18n support

---

### 6.features/20.sales.md

#### Verified
- Package name @fyit/crouton-sales correct
- usePosOrder and useHelperAuth composables exist
- All documented components exist
- Database schemas exist
- Helper PIN field verified
- useHelperAuth return values mostly match

#### Broken
- `crouton: { sales: true }` config: DOES NOT EXIST
- usePosOrder signature: COMPLETELY WRONG (different method names, different returns)
- requireScopedAccess import path: doesn't work (auto-imported)
- croutonSales print config: doesn't exist
- apps/test-sales/ doesn't exist
- No server API routes in package (generated by app, not provided)

#### Missing from docs
- SalesClientProductOptionsSelect component
- usePosOrder additional returns (selectedEventId, etc.)
- useHelperAuth additional returns (token, helperSession, etc.)
- i18n support

---

## Recommended Actions

### Rewrite (too many broken claims to patch)

| Page | Reason |
|------|--------|
| `6.rich-text.md` | 2/4 components fabricated, most props wrong, TipTap section fabricated |
| `19.bookings.md` | All 3 composable signatures completely wrong |
| `20.sales.md` | Composable signature wrong, config wrong, missing server context |

### Fix (specific claims to update)

| Page | Key fixes needed |
|------|-----------------|
| `1.internationalization.md` | Remove DevWrapper, fix useTranslationsUi, fix getAvailableLocales sig, fix seed command, fix locales |
| `9.events.md` | Remove useCroutonEventsHealth, replace component names with actual ones, fix cleanup path |
| `10.maps.md` | Remove useMap(), fix popupContent->popupText, fix useMapboxStyles to named exports |
| `11.devtools.md` | Fix module structure diagram, fix middleware->plugin, fix devtools version, fix repo URL |
| `12.flow.md` | Replace FlowPresence/FlowConnectionStatus with Collab equivalents, update DO config |
| `14.admin.md` | Remove team-member middleware, fix useAdminStats returns |
| `17.email.md` | Fix config pattern (layer not module flag), fix error emit type, fix component names |
| `18.pages.md` | Remove usePageBlocks, fix usePageTypes returns, fix config pattern, add locale route |

### Leave (healthy)

| Page | Notes |
|------|-------|
| `15.export.md` | All verified, no issues |
| `7.assets.md` | Core API correct, just needs version fix and additional components |
| `13.ai.md` | Mostly correct, minor fixes (o3-mini, statusCode) |
| `16.collaboration.md` | Mostly correct, minor installation note |

### Global fixes (apply to all pages)

1. Fix all version numbers to `0.1.0`
2. Remove all `crouton: { feature: true }` config patterns -- replace with `extends: ['@fyit/package']`
3. Update component counts to reflect actual codebase
