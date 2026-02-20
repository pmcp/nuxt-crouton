# Progress Tracker

## Current Project: Dead Code Cleanup — All Packages

**Started:** 2026-02-20
**Source:** [Dead Code Report](reports/dead-code-report-20260220.md)
**Strategy:** [Dead Code Plan](plans/dead-code-cleanup-plan.md)

---

## Quick Stats

| Metric | Value |
|--------|-------|
| Total tasks | 25 |
| Completed | 3 |
| In progress | 0 |
| Remaining | 22 |
| Phase | Tier 1 — Bugs |

---

## Tier 1 — Bugs (fix first, these are broken features)

| # | Task | Status |
|---|------|--------|
| T1-1 | Fix `crouton-devtools` API route mismatch (`/execute` vs `/execute-request`) | [x] ✅ |
| T1-2 | Resolve `crouton-maps` `useMarker` — implement the composable or remove from manifest + docs | [x] ✅ |
| T1-3 | Resolve `crouton-flow` `CroutonFlowCanvas` — implement the component or remove from manifest | [x] ✅ |

---

## Tier 2 — Safe deletes (orphaned internal files, no importers)

| # | Task | Status |
|---|------|--------|
| T2-1 | Delete 4 orphaned devtools Vue files (`CollectionCard.vue`, `CollectionDetailModal.vue`, `index.vue`, `useCroutonCollections.ts`) | [ ] |
| T2-2 | Delete `crouton-core/app/utils/functional.ts` (all 13 exports dead — verify no external apps import it first) | [ ] |

---

## Tier 3 — In-file cleanup (unused imports / vars / props within a file)

Safe because TypeScript will immediately catch any remaining importers.

| # | Package | What to remove | Status |
|---|---------|---------------|--------|
| T3-1 | `crouton` | `resolvePath` unused import + `resolver` unused var in `module.ts` (also `category` on `ManifestMeta`) | [ ] |
| T3-2 | `crouton-charts` | Fix incorrect import path in `Widget.vue` (l.17) | [ ] |
| T3-3 | `crouton-events` | Remove unused `_result` assignment in `cleanup.ts`; remove exported `useCroutonEventsHealth` (only in docs, not imported) | [ ] |
| T3-4 | `crouton-flow` | Remove unused `applyLayoutToNew` destructure in `Flow.vue` | [ ] |
| T3-5 | `crouton-mcp` | Remove unused `readJsonFile()` export + unused `zod` import in `cli-help.ts` | [ ] |
| T3-6 | `crouton-mcp-toolkit` | Remove unused `zod` import in `collection-schema.ts`; remove unused `schema?` on `McpCollectionConfig`; extract shared collection-mapping logic to remove duplication | [ ] |
| T3-7 | `crouton-assets` | Remove 2 unused props (`items?`, `loading?`) from `Form.vue` | [ ] |

---

## Tier 4 — Public API exports (judgment call per function)

> Rule: if undocumented in CLAUDE.md/README and not in `crouton.manifest.ts` provides → remove. If documented as public API but unused in monorepo → add `@deprecated` comment or keep.

| # | Package | What to remove | Status |
|---|---------|---------------|--------|
| T4-1 | `crouton-admin` | Delete `useAdmin.ts` barrel (zero usage); remove `AdminActivityEntry` + 2 base-only types from `types/admin.ts`; fix 2 manifest mismatches | [ ] |
| T4-2 | `crouton-ai` | Delete `translate-blocks.post.ts` endpoint (zero callers); remove unused `copy` emit from `Message.vue` | [ ] |
| T4-3 | `crouton-auth` | Audit `security.ts` — 6 utilities unused in monorepo; decide: document as public API or remove; mark `updatePasskey()` with `// TODO: not yet supported by Better Auth` | [ ] |
| T4-4 | `crouton-bookings` | Remove 6 unused exports: `getSlotLabels`, `getSlot` (useBookingSlots); `getVariablesByCategory`, `getCategories`, `getSampleValues`, `formatVariable` (useBookingEmailVariables) | [ ] |
| T4-5 | `crouton-cli` | Remove 3 unused exports from `manifest-bridge.ts`: `getCanonicalFieldTypes`, `loadGeneratorContributions`, `matchesDetector` | [ ] |
| T4-6 | `crouton-designer` | Remove unused types (`SchemaField`, `DesignerPhase`, `ChatMessage`); remove `parseExtensionCollectionName` + `getPackageSchemasAsJson`; remove exported `_collections`/`_fields` refs | [ ] |
| T4-7 | `crouton-editor` | Remove 5 unused functions from `useEditorVariables.ts` (`groupedToMentionItems`, `groupByCategory`, `formatCategoryLabel`, `findUnusedVariables`, `highlightVariables`); remove 4 unused types from `editor.ts` | [ ] |
| T4-8 | `crouton-flow` | Remove `FlowConnectionStatus.vue` + `FlowPresence.vue` (auto-registered, never used); remove 7 unused type exports | [ ] |
| T4-9 | `crouton-i18n` | Remove `isLocaleSupported` + `interpolateTranslation` from `serverTranslations.ts` (fully dead); review 3 test-only composable functions (keep if needed for tests) | [ ] |
| T4-10 | `crouton-pages` | Remove 10 unused type guards from `blocks.ts`; remove `getContentForRenderer` + `isPageBlockContent` from `content-detector.ts`; remove 5 unused `usePageTypes()` return values | [ ] |
| T4-11 | `crouton-sales` | Remove 7 unused type exports from `app/types/index.ts` (`OrderStatus`, `EventStatus`, `PrintStatus`, `SalesEvent`, `SalesCategory`, `SalesOrderItem`, `SalesLocation`) | [ ] |
| T4-12 | `crouton-themes` | Remove unused `themeItems` computed; remove `BaseVariant` export; remove or wire up the orphaned `crouton:themePreferenceItems` plugin state | [ ] |
| T4-13 | `crouton-triage` | Delete 8 legacy Zod schemas from `validation.ts`; remove `retryWithFixedDelay`, `logSecurityChecks`, `sanitizeObject`, `sanitizeString`; remove/document `startCleanup` placeholder | [ ] |

---

## Tier 5 — Leave alone (intentional or needs more context)

These were flagged but should NOT be touched without further discussion:

| Package | Item | Reason |
|---------|------|--------|
| `crouton-collab` | 4 internal helpers in `useCollabLocalizedContent.ts` | Probably intentional encapsulation, used within the file |
| `crouton-flow` | `FlowRoom.ts` + WebSocket route (deprecated) | Explicitly kept for backward compatibility |
| `crouton-auth` | `updatePasskey()` stub | Placeholder for future Better Auth support — add TODO comment only |
| `crouton-themes` | `cycleTheme()` | Used by `ThemeSwitcher.vue` — limited but real usage |
| `crouton-i18n` | `getTranslationMeta`, `getAvailableLocales`, `tInfo` | Used in tests — keep unless tests are reworked |

---

## Daily Log

### 2026-02-20
- Ran dead code analysis across all 25 packages (parallel agents)
- Created this plan and progress tracker
- Identified 1 HIGH-severity bug (devtools route mismatch) and 2 missing implementations (maps/flow manifests)
- T1-1 ✅ Fixed devtools API route: client was calling `/execute-request`, server registered `/execute` — aligned client to server
- T1-3 ✅ Removed phantom `CroutonFlowCanvas` from crouton-flow manifest — `Flow.vue` (CroutonFlow) already IS the canvas; replaced with accurate `CroutonFlow` entry describing real props
- T1-2 ✅ Removed `useMarker` from crouton-maps — `Marker.vue` fully encapsulates all marker logic; composable was declared but never implemented or called anywhere; also removed unused `MarkerInstance` + `UseMarkerOptions` types from `types/index.ts`

---

## Rules for Working This List

1. **One package per commit** — use `/commit` skill, never `git add .`
2. **TypeScript check after every change** — `npx nuxt typecheck`; errors = something still imports it
3. **Tier order matters** — complete T1 before T2 before T3 before T4
4. **When in doubt, don't delete** — add a `// DEAD: unused, safe to remove` comment and move on
5. **External apps** — before deleting anything, `grep -r "from.*<filename>"` across the whole repo including `apps/`
