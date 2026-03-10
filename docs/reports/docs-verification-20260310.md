# Documentation Verification Report
Date: 2026-03-10 (third pass — post-fix verification)
Pages verified: 23 (focused re-verification of previously broken pages)
Scope: All pages flagged as broken in previous audit

## Summary

| Status | Count |
|--------|-------|
| Previously broken, now FIXED | ~60 claims |
| Still broken | ~25 claims |
| New suspicious | ~12 |
| Missing from docs | ~15 |

## Fixes Confirmed from Commit 2bc99457

These issues from the previous audit are now **resolved**:

1. ~~`userId` → `owner` in auto-generated fields~~ → Fixed in troubleshooting.md, conventions.md, faq.md, data-operations.md
2. ~~`@crouton/auth` → `@fyit/crouton-auth`~~ → Fixed in migration.md (all 10+ occurrences)
3. ~~`drawer` container type~~ → Removed from architecture.md, glossary.md
4. ~~`inline` missing from container type lists~~ → Added across 4 API reference pages
5. ~~`useTableSearch` wrong return values~~ → Now correctly shows `search, isSearching, handleSearch, clearSearch`
6. ~~`TeamMember` vs `Member`~~ → Consistently uses `Member` now
7. ~~Non-existent `selectable`/`selected`/`loading` props~~ → Replaced with actual props in modal-components.md
8. ~~`CollectionConfig` missing fields~~ → ~14 fields added to types.md
9. ~~`CroutonMutationPayload` missing `correlationId`/`timestamp`~~ → Added
10. ~~`statusCode` → `status`~~ → Fixed in tables.md
11. ~~Bookings dep classification~~ → `@fyit/crouton-editor` correctly listed as regular dep
12. ~~AI schema extension~~ → Fixed `.ts` → `.json`
13. ~~Rollback CLI command format~~ → Corrected to `crouton rollback`
14. ~~Packages CLI command format~~ → Corrected to `crouton <subcommand>`
15. ~~Auto-generated fields lists~~ → Corrected across conventions.md, faq.md, glossary.md

---

## Remaining Issues

### CRITICAL: Column Format Inconsistency (3 pages)

**Affects:** `4.patterns/3.tables.md`, `4.patterns/5.list-layouts.md`, `5.customization/4.custom-columns.md`

The `TableColumn` interface uses TanStack Table format (`accessorKey`/`header`/`cell`), but large portions of these pages still use the old `key`/`label`/`render` format:

- **`render` property does not exist** on `TableColumn` — should be `cell`
- **`component` property does not exist** on `TableColumn`
- **`align` property does not exist** on `TableColumn`
- **`key`/`label`** should be **`accessorKey`/`header`** throughout

These three pages need a systematic find-and-replace of the column API.

### NEEDS REWRITE: list-layouts.md

Despite a deprecation callout, ~370 lines still use the non-existent `#list-item-actions` slot. The "Current Pattern" section is only 17 lines. All real-world examples (User Management, E-commerce, Contact List) use the deprecated pattern. The troubleshooting section tells users to verify the non-existent slot name. `CroutonList` component reference is invalid.

---

## Pages by Health (Updated)

### 🔴 Needs Rewrite
- `4.patterns/5.list-layouts.md` — Still dominated by non-existent `list-item-actions` slot examples

### 🟡 Needs Significant Fixes
- `5.customization/4.custom-columns.md` — First example correct, ALL remaining use wrong column format + non-existent `render`/`component`/`align` props
- `4.patterns/3.tables.md` — Mixed: some examples correct (`accessorKey`/`header`), others still use `key`/`label`/`render`

### 🟡 Needs Minor Fixes
- `8.api-reference/5.internal-api.md` — Missing `createdBy`/`updatedBy` in useTableColumns hideDefaultColumns
- `8.api-reference/components/utility-components.md` — CollectionViewer layout table missing `tree`, `kanban`, `workspace`
- `8.api-reference/3.types.md` — `packageForm` not in actual interface; missing `kind` property; missing `tree-default` preset
- `9.reference/2.faq.md` — Line 53: invalid CLI command (`config` subcommand doesn't accept collection name positional)
- `3.generation/4.cli-reference.md` — Missing `db-pull`/`scaffold-app` from overview table; `--no-auto-merge` flag undocumented
- `3.generation/cli-commands.md` — Minor binary name inconsistency (`crouton` vs `crouton-generate`)
- `6.features/20.sales.md` — Import path `@fyit/crouton-auth/server` doesn't exist in exports; server utils auto-import not configured

### 🟢 Now Healthy (fixed since last audit)
- `2.fundamentals/2.architecture.md` — Container types fixed
- `2.fundamentals/4.data-operations.md` — `userId` references removed
- `2.fundamentals/7.packages.md` — CLI format and themes fixed
- `9.reference/1.conventions.md` — Auto-generated fields corrected
- `10.guides/2.migration.md` — Package names corrected
- `10.guides/7.rollback.md` — CLI command format corrected
- `6.features/13.ai.md` — `chat.post.ts` callout added, schema extension fixed
- `6.features/14.admin.md` — Contradiction resolved (separate but included via meta-package)
- `6.features/19.bookings.md` — Dep classification fixed; Calendar/PanelMap/ActivityTimeline exist but intentionally omitted from table

---

## Detailed Findings

### Features

#### `6.features/13.ai.md` — NOW HEALTHY ✅
- All composables (4), components (5), server endpoints (4) verified
- `chat.post.ts` correctly flagged as non-existent via callout
- **Suspicious**: Type export path `@fyit/crouton-ai/types` not in package.json exports

#### `6.features/14.admin.md` — NOW HEALTHY ✅
- All composables (4), components (7+), API endpoints (10+) verified
- Contradiction resolved: separate package included via meta-package
- **Suspicious**: `runtimeConfig.public.crouton.admin` config block may be aspirational

#### `6.features/19.bookings.md` — NOW HEALTHY ✅
- All composables (10), components (15+), API endpoints (10+) verified
- Calendar/PanelMap/ActivityTimeline exist in source, intentionally omitted from docs table

#### `6.features/20.sales.md` — MINOR FIXES NEEDED 🟡
- All composables (2), components (14), server utils verified
- **Still Broken**: Import path `@fyit/crouton-auth/server` doesn't exist in package exports (should be `@fyit/crouton-auth/server/utils/scoped-access`)
- **Still Broken**: Server utils auto-import claim may be wrong — `nuxt.config.ts` lacks `nitro.imports.dirs`
- **Suspicious**: `fr.json` locale file exists but not registered in nuxt.config.ts

### Generation & Patterns

#### `3.generation/cli-commands.md` — MOSTLY FIXED 🟢
- `init` command documentation now accurate
- **Minor**: Binary name inconsistency (`crouton` vs `crouton-generate`) in rollback section

#### `3.generation/4.cli-reference.md` — MINOR FIXES NEEDED 🟡
- Package name, version, binaries, generate/init/config/add/rollback all verified
- **Broken**: Overview table missing `scaffold-app` and `db-pull` commands
- **Broken**: `--no-auto-merge` flag undocumented
- **Suspicious**: `add` command feature list is manifest-driven, may differ per install

#### `4.patterns/3.tables.md` — SIGNIFICANT FIXES NEEDED 🟡
- Basic table, search, pagination, drag-and-drop verified
- `statusCode` → `status` fix confirmed
- **Still Broken**: "Displaying Related Data" section (lines ~213-290) uses `key`/`label`/`render` format
- **Still Broken**: `render` property doesn't exist on `TableColumn` — should be `cell`

#### `4.patterns/5.list-layouts.md` — NEEDS REWRITE 🔴
- `layout="list"`, responsive breakpoints, `card` prop verified
- Deprecation callout for `list-item-actions` present
- **Still Broken**: ~370 lines of examples still use non-existent `#list-item-actions` slot
- **Still Broken**: Troubleshooting section actively misleading
- **Still Broken**: `CroutonList` component reference invalid
- **Still Broken**: Column format uses old `key`/`label` throughout

#### `5.customization/4.custom-columns.md` — SIGNIFICANT FIXES NEEDED 🟡
- First "Basic Column Definition" example correct (TanStack format)
- **Still Broken**: ALL remaining examples (~450 lines) revert to `key`/`label`/`render`
- **Still Broken**: `render`, `component`, `align` properties don't exist on `TableColumn`

### API Reference

#### `8.api-reference/5.internal-api.md` — MINOR FIX NEEDED 🟡
- `useTableData`, `useTableSearch`, `useExpandableSlideover` all verified ✅
- `useTableSearch` return values now correct (fixed in 2bc99457)
- **Broken**: `useTableColumns` `hideDefaultColumns` missing `createdBy`/`updatedBy`

#### `8.api-reference/composables/table-composables.md` — NOW HEALTHY ✅
- All three composables verified with correct signatures and return values
- `TableSort` type shape `{ column, direction }` is correct

#### `8.api-reference/components/utility-components.md` — MINOR FIX NEEDED 🟡
- CroutonLoading, CroutonValidationErrorSummary verified ✅
- **Broken**: CollectionViewer layout table shows 4 layouts, source has 7 (missing `tree`, `kanban`, `workspace`)

#### `8.api-reference/4.server.md` — NOW HEALTHY ✅
- All server utilities verified
- `Member` type name now consistent

#### `8.api-reference/3.types.md` — MINOR FIXES NEEDED 🟡
- 10+ type definitions verified, most fields correct
- **Broken**: `packageForm` listed but not in actual `CollectionConfig` interface
- **Broken**: Missing `kind?: CollectionKind` property (`'data' | 'content' | 'media'`)
- **Broken**: Missing `tree-default` layout preset
- **Broken**: `workspace` layout description missing from layout table

### Fundamentals & Reference

#### `2.fundamentals/2.architecture.md` — NOW HEALTHY ✅
#### `2.fundamentals/4.data-operations.md` — NOW HEALTHY ✅
#### `2.fundamentals/7.packages.md` — NOW HEALTHY ✅
#### `9.reference/1.conventions.md` — NOW HEALTHY ✅
#### `10.guides/2.migration.md` — NOW HEALTHY ✅
#### `10.guides/7.rollback.md` — NOW HEALTHY ✅

#### `9.reference/2.faq.md` — MINOR FIX NEEDED 🟡
- Auto-generated fields fixed ✅
- **Broken**: Line 53 — `npx crouton-generate config crouton.config.js products --force` is invalid (`config` subcommand doesn't accept collection name positional)

---

## Recommended Actions

### Priority 1: Column Format Overhaul (3 pages)
Global replacement needed across these pages:
- `key:` → `accessorKey:` and `label:` → `header:` in column definitions
- `render:` → `cell:` in column definitions
- Remove `component:` and `align:` properties (no equivalent)
- Pages: `tables.md`, `list-layouts.md`, `custom-columns.md`

### Priority 2: Rewrite list-layouts.md
Replace all `#list-item-actions` slot examples with the current `card` prop pattern. Remove misleading troubleshooting section.

### Priority 3: Minor Fixes (one-line changes)
1. `internal-api.md`: Add `createdBy`/`updatedBy` to hideDefaultColumns list
2. `utility-components.md`: Add `tree`, `kanban`, `workspace` to layout options table
3. `types.md`: Remove `packageForm`, add `kind`, add `tree-default` preset
4. `faq.md`: Fix CLI command on line 53
5. `cli-reference.md`: Add `scaffold-app`/`db-pull` to overview table
6. `sales.md`: Fix import path, verify auto-import config

### Leave (healthy or cosmetic issues only)
All pages listed under "Now Healthy" above, plus ~30 pages that were already healthy in the previous audit.
