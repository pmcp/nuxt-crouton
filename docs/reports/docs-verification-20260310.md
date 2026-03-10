# Documentation Verification Report

**Date:** 2026-03-10 (fifth pass — full re-verification)
**Pages verified:** 73
**Scope:** All documentation sections
**Agents:** 6 parallel verification agents

## Summary

| Status | Count |
|--------|-------|
| ✅ Verified claims | ~700+ |
| ❌ Broken claims | 16 |
| ⚠️ Suspicious | 12 |
| 📝 Missing from docs | 40+ |

### Progress from Fourth Pass

**Fixed since last audit (5 of 5 previous broken claims):**
- ✅ `CroutonFlowFlow` → `CroutonFlow` in 12.flow.md (P0)
- ✅ Events endpoint GET→POST mismatch in 9.events.md (P1)
- ✅ CollectionCard/DetailModal marked as internal in 11.devtools.md (P1)
- ✅ Self-referential text in layout-components.md (P2)
- ✅ `@update:english` event now exists on CroutonI18nInput
- ✅ `useCroutonShortcuts` now documented in utility-composables.md

**Still unfixed from previous audit:**
- ⏳ `isConfigured` return on `useMapConfig()` still not documented (10.maps.md)
- ⏳ Missing composables in API Reference: `useCollectionExport`, `useCollectionImport`, `useImageCrop`, `useDisplayConfig`
- ⏳ Missing components in API Reference: `CroutonDetail`, `CroutonDefaultCard`

**New broken claims found: 16** (see below)

---

## Pages by Health

### 🔴 Needs Fixes (broken claims)

| Page | Broken | Category |
|------|--------|----------|
| `6.features/13.ai.md` | 3 | Stale types, missing returns |
| `6.features/14.admin.md` | 2 | Wrong route paths |
| `6.features/18.pages.md` | 1 | Editor/renderer confusion |
| `8.api-reference/composables/form-composables.md` | 1 | Truncated signature |
| `8.api-reference/composables/table-composables.md` | 1 | Missing options |
| `8.api-reference/composables/data-composables.md` | 1 | Wrong heading name |
| `8.api-reference/4.server.md` | 2 | Broken links |
| `3.generation/2.schema-format.md` | 1 | Wrong component name |
| `3.generation/4.cli-reference.md` | 1 | schemaPath directory claim |
| `4.patterns/2.forms.md` | 1 | Wrong file path |
| `5.customization/1.index.md` | 1 | Missing layer prefix |
| `5.customization/4.custom-columns.md` | 1 | Missing `props.` prefix |
| `5.customization/5.layouts.md` | 1 | Duplicate text |
| `10.guides/1.troubleshooting.md` | 1 | Wrong component path |
| `10.guides/3.best-practices.md` | 1 | Wrong generated file names |
| `10.guides/5.asset-management.md` | 1 | Non-existent component |
| `9.reference/2.faq.md` | 1 | Contradicts auto-inclusion |
| `7.advanced/2.team-based-auth.md` | 1 | Misleading installation |

### 🟢 Healthy (no broken claims)

- `6.features/1.internationalization.md` ✅
- `6.features/6.rich-text.md` ✅
- `6.features/7.assets.md` ✅
- `6.features/9.events.md` ✅ (previously broken, now fixed)
- `6.features/10.maps.md` ✅ (1 missing prop, no broken claims)
- `6.features/11.devtools.md` ✅ (previously broken, now fixed)
- `6.features/12.flow.md` ✅ (previously broken, now fixed)
- `6.features/15.export.md` ✅
- `6.features/16.collaboration.md` ✅
- `6.features/17.email.md` ✅
- `6.features/19.bookings.md` ✅
- `6.features/20.sales.md` ✅
- All other API Reference pages ✅
- All Getting Started / Fundamentals pages ✅ (except minor path issues in guides)

---

## Detailed Findings

### `6.features/13.ai.md`

**Broken ❌**
1. **Lines 228-244 (useChat returns)**: Docs show `status: Ref<'idle' | 'streaming' | 'submitted'>` but omit `data`, `setData`, `id`, `rawMessages`, and `toolCalls` from returns. The actual composable returns significantly more fields.
2. **Lines 145-146 (AIChatboxProps type)**: Exported `AIChatboxProps` type is stale — missing `provider`, `model`, `initialMessages` props that exist on the actual `Chatbox.vue` component.
3. **Lines 169-178 (AIInputProps type)**: Missing `maxRows?: number` prop (default `6`) that exists on `Input.vue`.

**Missing from docs**
- `maxSteps` option on `useChat()` — enables multi-step tool calling
- `onToolCall` option on `useChat()` — client-side tool handling
- `toolCalls`, `rawMessages`, `data`, `setData`, `id` returns from `useChat()`
- `handleSubmit`, `data` returns from `useCompletion()`
- `useTranslationSuggestion` composable has no detailed API section (only listed in overview)
- `o3-mini` model referenced in docs but not in `AI_MODELS` record

---

### `6.features/14.admin.md`

**Broken ❌**
1. **Line 95**: Route `/admin/[team]/collections` — actual route is `/admin/[team]/crouton/[collection]` (provided by crouton-core, not crouton-admin)
2. **Line 99**: Route `/admin/[team]/settings/translations` — actual route is `/admin/[team]/translations/`

**Missing from docs**
- Admin pages: `/admin/[team]/team/domains.vue`, `/admin/[team]/team/look-and-feel.vue`
- Components: `AdminTeamList`, `TeamColorSwatchPicker`, `TeamThemeSettings`, `TeamFaviconSettings`, `TeamRadiusPicker`, `TeamDomainSettings`

---

### `6.features/18.pages.md`

**Broken ❌**
1. **Line 118**: Shows `<CroutonPagesBlockContent v-model="content">` with editor props (`v-model`, `placeholder`) — but `BlockContent.vue` is a renderer/display component. The actual editor is `CroutonPagesEditorBlockEditor`.

**Missing from docs**
- `CroutonPagesEditorBlockEditor`, `CroutonPagesEditorBlockEditorWithPreview`, `CroutonPagesEditorBlockPropertyPanel`
- `CroutonPagesNav`, `CroutonPagesCard`, `CroutonPagesList`
- Composables: `useGhostPage`, `useReorderMode`, `useLocalizedSlug`
- Block types: `contactBlock`, `mailingBlock`

---

### `8.api-reference/composables/form-composables.md`

**Broken ❌**
1. **Lines 18-28**: Truncated/duplicate `useCrouton` signature block that abruptly ends before the full definition at line 30

---

### `8.api-reference/composables/table-composables.md`

**Broken ❌**
1. **UseTableColumnsOptions**: Missing `sortable` and `showCollabPresence` properties that exist in source (lines 16-18)

---

### `8.api-reference/composables/data-composables.md`

**Broken ❌**
1. **Line 772**: Section heading says `useExternalCollection` but the actual exported function is `defineExternalCollection`

---

### `8.api-reference/4.server.md`

**Broken ❌**
1. **Line 893**: Broken link with typo `#crroutonreferenceselect` (extra 'r' in "crrouton")
2. **Line 892**: Link `#usecollectionproxy` points to non-existent anchor (actual utilities are `applyProxyTransform`/`getProxiedEndpoint` documented in data-composables.md)

---

### `3.generation/2.schema-format.md`

**Broken ❌**
1. **Line 342**: Says `CroutonRepeater` — actual component is `CroutonFormRepeater` (file: `FormRepeater.vue`)

---

### `3.generation/4.cli-reference.md`

**Broken ❌**
1. **Lines 613-630**: Claims `schemaPath` can be a directory (`Directory: './schemas/'`). The actual `loadFields()` in `lib/utils/load-fields.ts` only calls `fsp.readFile()` — it cannot handle directories. Contradicts `3.multi-collection.md` which correctly says it must be a file.

---

### `4.patterns/2.forms.md`

**Broken ❌**
1. **Line 29**: Path `layers/shop/components/products/_Form.vue` — actual path is `layers/shop/collections/products/app/components/_Form.vue` (missing `collections/` and `app/` segments)

---

### `5.customization/1.index.md`

**Broken ❌**
1. **Line 20**: Shows `use[Collection].ts` — should be `use[Layer][Collection].ts` (e.g., `useShopProducts.ts`)

---

### `5.customization/4.custom-columns.md`

**Broken ❌**
1. **Lines 187-201**: `ProductStatus.vue` component uses `row.status` — should be `props.row.status` (would cause runtime error)

---

### `5.customization/5.layouts.md`

**Broken ❌**
1. **Lines 131-132**: Duplicate text "CroutonCollection or CroutonCollection" — should probably say "CroutonCollection or CroutonTable"

---

### `10.guides/1.troubleshooting.md`

**Broken ❌**
1. **Line 234**: Component path `layers/shop/components/products/Form.vue` — actual is `layers/shop/collections/products/app/components/_Form.vue`

---

### `10.guides/3.best-practices.md`

**Broken ❌**
1. **Lines 57-58**: Claims `Form.vue`, `Table.vue`, `Card.vue` are generated files — actual generated files are `_Form.vue` and `List.vue`. No `Table.vue` or `Card.vue` is generated per collection.

---

### `10.guides/5.asset-management.md`

**Broken ❌**
1. **Lines 400-417**: References `<CroutonList>` component which does not exist — should be `<CroutonCollection>` or `<CroutonTable>`

---

### `9.reference/2.faq.md`

**Broken ❌**
1. **Lines 341-349**: Shows i18n needing separate `extends: ['@fyit/crouton-i18n']` — contradicts other pages that document i18n as auto-included with `@fyit/crouton`

---

### `7.advanced/2.team-based-auth.md`

**Broken ❌**
1. **Lines 37-49**: Implies `@fyit/crouton-auth` needs separate installation via `extends` — but auth is auto-included with `@fyit/crouton`

---

## Suspicious Claims (not confirmed broken)

| Page | Line | Issue |
|------|------|-------|
| `10.maps.md` | 23 | `animationEasing` typed as `string \| function` but source has specific string literals |
| `11.devtools.md` | 601 | Architecture diagram missing several RPC endpoints (events, system-operations, generation-history) |
| `13.ai.md` | 804 | Import path `@fyit/crouton-ai/types` may not match actual package exports |
| `14.admin.md` | 219 | Icon comment says "Heroicon name" but codebase uses Lucide icons |
| `3.generation/3.multi-collection.md` | 94 | Default `dialect` differs between config file (`'pg'`) and CLI arg (`'sqlite'`) |
| `4.patterns/3.tables.md` | 37 | `UDashboardPanel` is Nuxt UI Pro, not standard Nuxt UI 4 |
| `1.getting-started/2.installation.md` | 53 | `vite.server.watch` config only relevant for monorepo dev, could mislead |
| `8.api-reference/5.internal-api.md` | — | Table composables documented as both "internal" and "public API" |
| `7.advanced/2.team-based-auth.md` | 59 | `useTeamContext()` return shape needs verification |
| `4.patterns/1.relations.md` | 87 | TanStack Table slot naming `#authorId-cell` unverified |
| `8.api-reference/3.types.md` | 1389 | Recommends `npx nuxt typecheck` — CLAUDE.md says `pnpm typecheck` |
| `10.guides/9.deployment.md` | 101 | `croutonAuth: { passkeys: false }` config key needs verification |

---

## Missing from Docs (not broken, but gaps)

### API Reference — Missing composables
- `useCollectionExport` (exists in crouton-core)
- `useCollectionImport` (exists in crouton-core)
- `useImageCrop` (exists in crouton-core)
- `useDisplayConfig` (exists in crouton-core)
- `useCroutonError` (exists in crouton-core)
- `useExpandableSlideover` (exists in crouton-core, partially in internal-api.md)

### API Reference — Missing components
- `CroutonDetail` (exists as Detail.vue)
- `CroutonDefaultCard` (exists as DefaultCard.vue)
- `CroutonExportButton`, `CroutonImportButton`, `CroutonImportPreviewModal`
- `CroutonConfirmButton`, `CroutonImageCropper`, `CroutonImageUpload`
- `CroutonShortcutHint`, `CroutonAdminStatusBar`

### Feature pages — Missing items
- `10.maps.md`: `isConfigured` return on `useMapConfig()`, `active` prop on Marker
- `11.devtools.md`: Events, system-operations, generation-history RPC endpoints; data browser page
- `12.flow.md`: `allowDrop`, `allowedCollections`, `autoCreateOnDrop` props; `selectionChange`, `nodeDrop` events; `useFlowDragDrop`, `useFlowSyncBridge` composables
- `16.collaboration.md`: `useCollabConnection`, `useCollabLocalizedContent`, `useFormCollabPresence`, `useCollectionSyncSignal`
- `17.email.md`: `VerificationLink.vue` template, `sendVerificationLink()` sender
- `2.fundamentals/7.packages.md`: `crouton-triage`, `crouton-charts`, `crouton-atelier`, `crouton-mcp-toolkit` packages

---

## Recommended Actions

### Fix (broken claims to update)

| Priority | Page | Action |
|----------|------|--------|
| **P1** | `6.features/13.ai.md` | Update `useChat()` returns, fix stale `AIChatboxProps`/`AIInputProps` types |
| **P1** | `6.features/14.admin.md` | Fix 2 route paths: `collections` → `crouton/[collection]`, `settings/translations` → `translations/` |
| **P1** | `6.features/18.pages.md` | Fix `CroutonPagesBlockContent` with v-model → `CroutonPagesEditorBlockEditor` |
| **P1** | `8.api-reference/4.server.md` | Fix broken links: typo `#crroutonreferenceselect`, dead anchor `#usecollectionproxy` |
| **P2** | `8.api-reference/composables/form-composables.md` | Remove truncated duplicate signature block (lines 18-28) |
| **P2** | `8.api-reference/composables/table-composables.md` | Add `sortable`, `showCollabPresence` to UseTableColumnsOptions |
| **P2** | `8.api-reference/composables/data-composables.md` | Fix heading `useExternalCollection` → `defineExternalCollection` |
| **P2** | `3.generation/2.schema-format.md` | Fix `CroutonRepeater` → `CroutonFormRepeater` |
| **P2** | `3.generation/4.cli-reference.md` | Remove claim that `schemaPath` can be a directory |
| **P2** | `4.patterns/2.forms.md` | Fix path: add `collections/` and `app/` segments |
| **P2** | `5.customization/1.index.md` | Fix `use[Collection].ts` → `use[Layer][Collection].ts` |
| **P2** | `5.customization/4.custom-columns.md` | Fix `row.status` → `props.row.status` |
| **P2** | `5.customization/5.layouts.md` | Fix duplicate "CroutonCollection or CroutonCollection" |
| **P3** | `10.guides/1.troubleshooting.md` | Fix component path to include `collections/app/` |
| **P3** | `10.guides/3.best-practices.md` | Fix generated file names: `_Form.vue`, `List.vue` (not `Table.vue`, `Card.vue`) |
| **P3** | `10.guides/5.asset-management.md` | Fix `<CroutonList>` → `<CroutonCollection>` |
| **P3** | `9.reference/2.faq.md` | Remove separate `extends` for i18n (auto-included) |
| **P3** | `7.advanced/2.team-based-auth.md` | Clarify auth is auto-included, separate install not needed |

### Add (missing documentation)

| Priority | Action |
|----------|--------|
| **P2** | Add missing composables/components to API reference (~14 items) |
| **P2** | Document `isConfigured` on `useMapConfig()` in maps.md |
| **P3** | Document drag-and-drop props/events in flow.md |
| **P3** | Document undocumented RPC endpoints in devtools.md |
| **P3** | Add `crouton-triage`, `crouton-charts`, `crouton-atelier` to packages.md |

### Leave (healthy)

All other 50+ pages are accurate and require no changes.

---

## Comparison with Fourth Pass

| Metric | Fourth Pass | Fifth Pass |
|--------|------------|------------|
| Broken claims | 5 | 16 |
| Previously broken, now fixed | — | 5/5 (100%) |
| New broken found | — | 16 |
| Suspicious | 8 | 12 |
| Missing from docs | 10 | 40+ |

The increase in broken/missing counts reflects deeper verification this pass, not regression. All 5 previously broken claims were successfully fixed. The 16 new broken claims are mostly minor (wrong paths, stale types, typos) with no critical/P0 issues.

---

*Report generated by 6 parallel verification agents scanning 73 documentation pages against source code.*
