# Dead Code Report — All Packages

**Date:** 2026-02-20
**Scope:** 25 packages in `/packages/*`
**Method:** One dedicated Explore agent per package, run in parallel
**Plan:** [dead-code-cleanup-plan.md](../plans/dead-code-cleanup-plan.md)
**Tracker:** [PROGRESS_TRACKER.md](../PROGRESS_TRACKER.md)

---

## Summary by Severity

### HIGH — Broken features / missing implementations

| Package | Finding |
|---------|---------|
| `crouton-devtools` | API route mismatch: server registers `/api/execute`, client calls `/api/execute-request` — API Explorer feature is broken |
| `crouton-maps` | `useMarker` declared in manifest + README + CLAUDE.md but the file does not exist |
| `crouton-flow` | `CroutonFlowCanvas` declared in manifest but component file does not exist |

### MEDIUM — Entire files or substantial blocks with no callers

| Package | File(s) | Details |
|---------|---------|---------|
| `crouton-core` | `app/utils/functional.ts` | All 13 exported functions dead: `pipe`, `compose`, `identity`, `createApiCall`, `apiGet`, `apiPost`, `apiPatch`, `apiDelete`, `addToCollection`, `removeFromCollection`, `updateInCollection`, `findInCollection`, `findIndexInCollection` |
| `crouton-devtools` | `client/components/CollectionCard.vue`, `CollectionDetailModal.vue`, `client/pages/index.vue`, `client/composables/useCroutonCollections.ts` | Entire Vue component tree orphaned — UI was rebuilt as an embedded HTML string, these 4 files have zero importers |
| `crouton-ai` | `server/api/ai/translate-blocks.post.ts` | Full endpoint implemented (260 lines), zero callers anywhere in monorepo |
| `crouton-triage` | `server/utils/validation.ts` | 8 Zod schemas likely from v1 architecture: `slackEventSchema`, `slackUrlVerificationSchema`, `mailgunPayloadSchema`, `sourceConfigSchema`, `testConnectionSchema`, `notionUsersRequestSchema`, `discussionStatusSchema`, `jobStatusSchema` |
| `crouton-pages` | `app/types/blocks.ts` | All 10 type guard functions unused: `isHeroBlock`, `isSectionBlock`, `isCTABlock`, `isCardGridBlock`, `isSeparatorBlock`, `isRichTextBlock`, `isCollectionBlock`, `isFaqBlock`, `isTwoColumnBlock`, `isChartBlock` |
| `crouton-admin` | `app/composables/useAdmin.ts` | Barrel composable with zero usage — everyone imports individual composables directly |

### LOW — Unused exports, stubs, minor issues

#### crouton (`packages/crouton`)
- `module.ts` L1: unused `resolvePath` import
- `module.ts` L16: `category` property on `ManifestMeta` extracted but never read
- `module.ts` L249: unused `resolver` variable

#### crouton-admin
- `types/admin.ts`: `AdminActivityEntry` unused; `BaseUser` + `BaseOrganization` used only as base types (never imported directly)
- `crouton.manifest.ts`: declares only 2 of 4 public composables; declares `CroutonAdminDashboard` but actual component registers as `AdminDashboard`

#### crouton-ai
- `app/components/Message.vue` L12: `copy` emit fires but no parent component listens for it
- `app/composables/useCroutonEvents.ts` L89: `enrichUserData` option accepted but implementation is a stub returning raw data unchanged

#### crouton-assets
- `app/components/Form.vue` L7: `items?` prop unused
- `app/components/Form.vue` L9: `loading?` prop unused
- Note: `formatFileSize`, `isImage`, `isVideo`, `isAudio`, `isDocument`, `getFileIcon`, `getFileExtension` duplicated across 4 components — not dead but worth extracting

#### crouton-auth
- `app/utils/security.ts`: `sanitizeEmail`, `isValidSlug`, `generateSlug`, `isValidTeamName`, `sanitizeRedirectUrl`, `isSecureContext` — exported, unused in monorepo (may be intentional public API)
- `app/composables/useAuthError.ts` L170: `createErrorLogger` only used in tests
- `app/composables/useAuth.ts` L559: `updatePasskey()` throws "not yet supported" — stub

#### crouton-bookings
- `app/composables/useBookingSlots.ts`: `getSlotLabels()` L50, `getSlot()` L57 — unused exports
- `app/composables/useBookingEmailVariables.ts`: `getVariablesByCategory()`, `getCategories()`, `getSampleValues()`, `formatVariable()` — all unused exports

#### crouton-charts
- `app/components/Widget.vue` L17: incorrect relative import path for `ChartCategory` (works via Nuxt auto-import but the explicit import is wrong)

#### crouton-cli
- `lib/utils/manifest-bridge.ts`: `getCanonicalFieldTypes()` L38, `loadGeneratorContributions()` L112, `matchesDetector()` L78 — all exported, none called

#### crouton-collab
- `app/composables/useCollabLocalizedContent.ts` L253-363: `yXmlFragmentToJson`, `yXmlElementToJson`, `jsonToYXmlFragment`, `jsonToYXmlElement` — internal helpers, never exported (likely intentional encapsulation)

#### crouton-designer
- `app/types/schema.ts`: `SchemaField` L50, `DesignerPhase` L104, `ChatMessage` L109 — unused exports
- `app/composables/useCollectionEditor.ts`: `parseExtensionCollectionName()` L13 unused; `_collections`/`_fields` refs L265 exported but no consumers
- `app/composables/useSchemaExport.ts`: `getPackageSchemasAsJson()` L121 unused

#### crouton-editor
- `app/composables/useEditorVariables.ts`: `groupedToMentionItems` L27, `groupByCategory` L37, `formatCategoryLabel` L57, `findUnusedVariables` L138, `highlightVariables` L149 — all exported, none called; logic for `groupByCategory`/`formatCategoryLabel` duplicated inside `Variables.vue`
- `app/types/editor.ts`: `EditorVariablesProps` L39, `EditorWithPreviewProps` L53, `EditorMentionItem` L77, `EditorVariableGroup` L29 — unused exports

#### crouton-events
- `app/composables/useCroutonEventsHealth.ts`: entire composable exported, never imported (only referenced in docs)
- `server/utils/cleanup.ts` L64: `_result` assigned from `await db.delete()` but never used
- `app/composables/useCroutonEvents.ts` L89: `enrichUserData` option stubbed, returns raw data

#### crouton-flow
- `app/components/FlowConnectionStatus.vue`: auto-registered as `CroutonFlowConnectionStatus`, never used
- `app/components/FlowPresence.vue`: auto-registered as `CroutonFlowPresence`, never used
- `app/components/Flow.vue` L398: `applyLayoutToNew` destructured but never used
- `app/types/flow.ts`: `CroutonFlowProps`, `CroutonFlowNodeProps`, `CroutonFlowEmits`, `DropZoneOptions`, `UseFlowDataResult`, `UseFlowLayoutResult`, `UseFlowMutationResult` — all unused exports
- `app/types/yjs.ts`: `FlowSyncState` unused export
- `server/durable-objects/FlowRoom.ts`: `@deprecated`, kept for backward compat
- `server/routes/api/flow/[flowId]/ws.ts`: `@deprecated`, kept for backward compat

#### crouton-i18n
- `app/composables/useT.ts`: `getTranslationMeta` L304, `getAvailableLocales` L284, `tInfo`/`getTranslationInfo` L178 — test-only (used in test files, not production)
- `server/utils/serverTranslations.ts`: `getAvailableLocales` L131, `isLocaleSupported` L139, `interpolateTranslation` L120 — fully unused

#### crouton-maps
- `app/types/index.ts`: `MapInstance` L17, `MarkerInstance` L27, `PopupInstance` L36, `MapFlyToOptions` L93 — exported, never used

#### crouton-mcp
- `src/utils/fs.ts` L162: `readJsonFile()` exported, never called
- `src/tools/cli-help.ts` L1: `import { z } from 'zod'` — unused import

#### crouton-mcp-toolkit
- `server/mcp/resources/collection-schema.ts` L1: `import { z } from 'zod'` — unused import
- `server/utils/mcp-collections.ts`: `McpCollectionConfig.schema?: unknown` — defined, never read
- `server/mcp/tools/list-collections.ts` + `server/mcp/resources/collections-registry.ts`: identical collection-mapping logic (~50% code duplication)
- `module.ts` L15-16: `name` + `version` constants exported but never imported

#### crouton-pages
- `app/utils/content-detector.ts`: `getContentForRenderer()` L136, `isPageBlockContent()` L42 — unused exports
- `app/composables/usePageTypes.ts`: `getAppPageTypes()` L137, `hasPageType()` L144, `getDefaultPageType()` L151, `pageTypesByCategory` L97, `pageTypesByApp` L114 — all in return statement but never accessed externally

#### crouton-sales
- `app/types/index.ts`: `OrderStatus`, `EventStatus`, `PrintStatus`, `SalesEvent`, `SalesCategory`, `SalesOrderItem`, `SalesLocation` — all 7 exported, none imported anywhere

#### crouton-themes
- `themes/composables/useThemeMenuItems.ts` L38: `themeItems` computed — exported, zero consumers (only `themeMenuItem` is used)
- `themes/composables/useThemeSwitcher.ts` L9: `BaseVariant` type — exported, never imported
- `themes/plugins/themeProvider.client.ts` L17: `crouton:themePreferenceItems` useState set but never read anywhere in monorepo
- `themes/configs/themeConfigs.ts`: `input` and `card` properties on `ThemeUIConfig` defined, never populated in any actual theme config

#### crouton-triage
- `server/utils/retry.ts` L162: `retryWithFixedDelay()` unused (only `retryWithBackoff` is called)
- `server/utils/securityCheck.ts` L218: `logSecurityChecks()` unused
- `server/utils/rateLimit.ts` L39: `startCleanup()` empty placeholder
- `server/utils/validation.ts` L267: `sanitizeString()` internal only (called by `sanitizeObject`); L280: `sanitizeObject()` exported but unused externally

---

## Package Summary Table

| Package | Issues | Severity | Notes |
|---------|--------|----------|-------|
| `crouton-devtools` | 5 | HIGH + MEDIUM | API route mismatch + 4 orphaned files |
| `crouton-maps` | 5 | HIGH + LOW | Missing `useMarker` implementation |
| `crouton-flow` | 11 | HIGH + LOW | Missing `FlowCanvas`, 2 unused components, 8 unused types |
| `crouton-core` | 15 | MEDIUM + LOW | Entire `functional.ts` dead (13 fns) |
| `crouton-triage` | 15 | MEDIUM + LOW | 8 legacy schemas, 4 unused functions |
| `crouton-pages` | 17 | MEDIUM + LOW | 10 unused type guards, 5 unused composable returns |
| `crouton-editor` | 9 | LOW | 5 unused functions + 4 unused types |
| `crouton-auth` | 8 | LOW | 6 security utils (may be public API), 1 stub |
| `crouton-admin` | 8 | LOW | Unused barrel composable, type issues, manifest drift |
| `crouton-i18n` | 8 | LOW | 3 test-only, 3 fully dead server utils |
| `crouton-bookings` | 6 | LOW | 6 unused exported functions |
| `crouton-designer` | 6 | LOW | 3 unused types, 2 unused functions |
| `crouton-sales` | 7 | LOW | 7 unused type exports |
| `crouton-themes` | 4 | LOW | Plugin state never read, unused computeds |
| `crouton-mcp-toolkit` | 4 | LOW | Duplication + unused import + unused property |
| `crouton-ai` | 2 | MEDIUM | Entire endpoint unused, unused emit |
| `crouton-events` | 3 | LOW | Exported composable only in docs, stub feature |
| `crouton-cli` | 3 | LOW | 3 unused exports in manifest-bridge |
| `crouton` | 3 | LOW | Unused import, property, variable |
| `crouton-collab` | 4 | LOW | Internal helpers (likely intentional) |
| `crouton-assets` | 2 | LOW | 2 unused props |
| `crouton-mcp` | 2 | LOW | Unused export + unused import |
| `crouton-maps` | 4 | LOW | 4 unused type exports (beyond missing composable) |
| `crouton-charts` | 1 | LOW | Wrong import path (non-breaking) |
| `crouton-email` | 0 | — | Clean |