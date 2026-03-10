# Documentation Verification Report

Date: 2026-03-10
Pages verified: 73 (excluding index pages)
Scope: All sections

## Summary

| Status | Count |
|--------|-------|
| Verified claims | ~350+ |
| Broken claims | ~95 |
| Suspicious | ~40 |
| Missing from docs | ~80+ |

## Systemic Issues (appear across 5+ pages)

These recurring problems affect many pages and should be fixed globally:

### 1. Generated File Structure is Wrong (8+ pages)
**Affected**: usage.md, collections.md, architecture.md, generated-code.md, cli-reference.md, cli-commands.md, customization/index.md, conventions.md

Docs consistently show:
```
layers/shop/
  components/products/List.vue, Form.vue, Table.vue
  composables/useProducts.ts
  types/products.ts
```

Actual generated structure:
```
layers/shop/collections/products/
  app/components/List.vue, _Form.vue     # No Table.vue, Form has underscore
  app/composables/useShopProducts.ts     # Includes layer prefix
  server/api/teams/[id]/shop-products/...
  server/database/schema.ts, queries.ts
  types.ts                               # At collection root
  nuxt.config.ts
```

Key differences:
- Missing `collections/` and `app/` directory levels
- Form is `_Form.vue` (underscore prefix), not `Form.vue`
- No `Table.vue` is generated
- Composable includes layer prefix (e.g., `useShopProducts`, not `useProducts`)
- Types at collection root as `types.ts`, not `types/products.ts`
- Server-side files not shown

### 2. `CroutonButton` Does Not Exist (6+ pages)
**Affected**: usage.md, forms-modals.md, architecture.md, packages.md, generated-code.md, best-practices.md, troubleshooting.md, migration.md

Docs reference `<CroutonButton :action="action" :loading="loading" />` but this component does not exist. The actual component is `CroutonFormActionButton` (at `packages/crouton-core/app/components/FormActionButton.vue`).

### 3. `CroutonList` Does Not Exist (5+ pages)
**Affected**: packages.md, generated-code.md, querying.md, bulk-operations.md, best-practices.md

The actual list/display component is `CroutonCollection` (supports table, list, grid, tree, kanban, workspace layouts).

### 4. Non-existent Modal Composables (3+ pages)
**Affected**: architecture.md, packages.md

`useCroutonModal()`, `useCroutonSlideover()`, `useCroutonDrawer()` DO NOT EXIST. Only `useCrouton()` exists, which handles all container types via a `containerType` parameter.

### 5. `useCroutonToast()` Does Not Exist (2+ pages)
**Affected**: architecture.md, packages.md

Actual notification composable is `useNotify()`.

### 6. `PUT` vs `PATCH` for Updates (3+ pages)
**Affected**: conventions.md, glossary.md, generated-code.md

Docs show `PUT /api/[collection]/[id]` for updates. Actual endpoints use `PATCH` (e.g., `[articleId].patch.ts`).

### 7. Column Format Inconsistency (4+ pages)
**Affected**: tables.md, custom-columns.md, modal-components.md, table-components.md

Some pages use old `{ key, label }` format, others use TanStack-style `{ accessorKey, header }`. Source uses TanStack format.

### 8. `hideDefaultColumns` Missing Fields (4+ pages)
**Affected**: types.md, layout-components.md, table-components.md, modal-components.md

Docs omit `select` and `presence` fields that exist in source. Some pages use snake_case (`created_at`) instead of camelCase (`createdAt`).

### 9. Schema Format YAML vs JSON (2+ pages)
**Affected**: conventions.md, glossary.md

Docs reference YAML schema format but actual schemas are JSON files.

### 10. `statusCode` vs `status` (3+ pages)
**Affected**: troubleshooting.md, best-practices.md

Docs use Nitro v2 `statusCode: 400` pattern but Nuxt 4.3+ uses `status: 400`.

---

## Pages by Health

### Needs Rewrite (>50% broken claims or entirely fictional)

| Page | Issues |
|------|--------|
| `10.guides/7.rollback.md` | **ENTIRELY FICTIONAL** - `crouton-rollback`, `crouton-rollback-bulk`, `crouton-rollback-interactive` commands do not exist anywhere in the codebase |
| `9.reference/1.conventions.md` | Wrong file structure, wrong endpoint methods, fake field types (`reference`, `longtext`), YAML vs JSON, wrong component names |
| `9.reference/3.glossary.md` | Non-existent composables (`useCollectionForm`, `useCollectionTable`), wrong methods (PUT vs PATCH), YAML vs JSON, fake field types |
| `9.reference/2.faq.md` | Non-existent composable (`useCollectionForm`), wrong props (`:data` vs `:rows`), wrong env vars (`DATABASE_URL`, `NUXT_SESSION_SECRET`) |
| `2.fundamentals/2.architecture.md` | Non-existent composables (useCroutonModal/Slideover/Drawer/Toast), wrong file structure, wrong CLI syntax |

### Needs Significant Fixes (5+ broken claims)

| Page | Broken | Key Issues |
|------|--------|------------|
| `2.fundamentals/7.packages.md` | 6 | Non-existent components/composables, wrong package name |
| `2.fundamentals/generated-code.md` | 5 | Wrong file structure, non-existent components |
| `6.features/7.assets.md` | 9 | Wrong component count (2 vs 7), wrong paths, missing props |
| `6.features/14.admin.md` | 5 | Missing component, wrong route paths |
| `6.features/12.flow.md` | 5 | Missing props/return values on composables |
| `3.generation/4.cli-reference.md` | 7 | `init` command completely changed, missing 7+ commands, `_Form.vue` naming |
| `3.generation/cli-commands.md` | 3 | Wrong file tree, wrong composable naming |
| `10.guides/1.troubleshooting.md` | 4 | Non-existent CroutonButton, statusCode pattern |
| `10.guides/3.best-practices.md` | 4 | Non-existent CroutonList/CroutonButton, statusCode |
| `10.guides/5.asset-management.md` | 4 | Wrong component name, wrong return type, wrong structure |
| `8.api-reference/3.types.md` | 5 | Wrong LayoutType, required vs optional props |
| `8.api-reference/5.internal-api.md` | 2 | Wrong hook payload field names |

### Needs Minor Fixes (1-4 broken claims)

| Page | Broken | Key Issues |
|------|--------|------------|
| `1.getting-started/3.usage.md` | 2 | Wrong file structure, CroutonButton |
| `2.fundamentals/1.collections.md` | 1 | Wrong layer structure |
| `2.fundamentals/3.forms-modals.md` | 4 | Wrong loading type, missing action/container types |
| `2.fundamentals/querying.md` | 1 | CroutonList reference |
| `3.generation/2.schema-format.md` | 3 | Missing field types (image, file), missing meta properties |
| `3.generation/3.multi-collection.md` | 2 | MySQL not supported, wrong dialect value ('postgres' vs 'pg') |
| `4.patterns/1.relations.md` | 1 | Component name missing prefix |
| `4.patterns/3.tables.md` | 1 | Non-existent `list-item-actions` slot |
| `4.patterns/5.list-layouts.md` | 1 | Non-existent `list-item-actions` slot |
| `5.customization/5.layouts.md` | 2 | Wrong component name (CroutonMiniButtons), missing layout type |
| `6.features/1.internationalization.md` | 2 | Missing many CroutonI18nInput props |
| `6.features/6.rich-text.md` | 1 | Content prop type incomplete |
| `6.features/9.events.md` | 3 | Wrong type fields (teamId, timestamp, metadata) |
| `6.features/10.maps.md` | 1 | Marker animateTransitions default |
| `6.features/11.devtools.md` | 3 | Incomplete module structure, wrong hook/config |
| `6.features/13.ai.md` | 4 | Wrong composable/component counts, import path |
| `6.features/17.email.md` | 1 | Custom template import path |
| `6.features/18.pages.md` | 3 | Missing block types, misleading Form component, API slug path |
| `6.features/19.bookings.md` | 1 | Component prefix inconsistency |
| `6.features/20.sales.md` | 1 | calculateItemPrice import path |
| `7.advanced/2.team-based-auth.md` | 2 | Package name inconsistency, import path |
| `7.advanced/4.bulk-operations.md` | 3 | Non-existent CroutonList, wrong method name (remove vs deleteItems) |
| `7.advanced/6.rate-limiting.md` | 1 | Auth is a layer not a module |
| `8.api-reference/4.server.md` | 1 | Returns `membership` not `member` |
| `8.api-reference/components/form-components.md` | 2 | FormActionButton type prop, missing hasValidationErrors |
| `8.api-reference/components/modal-components.md` | 2 | Column format, snake_case vs camelCase |
| `8.api-reference/composables/mutation-composables.md` | 2 | Hook payload field names |
| `8.api-reference/composables/table-composables.md` | 1 | Actions column ordering |
| `8.api-reference/composables/utility-composables.md` | 1 | useCollectionProxy is not a composable |
| `10.guides/2.migration.md` | 1 | CroutonButton reference |
| `10.guides/4.pagination.md` | 1 | refresh-fn prop unverified |
| `10.guides/8.custom-cardmini.md` | 1 | CroutonMiniButtons wrong name |
| `10.guides/9.deployment.md` | 1 | Wrong croutonAuth config structure |

### Healthy (0 broken claims)

| Page | Notes |
|------|-------|
| `1.getting-started/1.index.md` | Overview page, accurate |
| `1.getting-started/2.installation.md` | Accurate |
| `1.getting-started/4.adding-modules.md` | Accurate (missing some packages) |
| `2.fundamentals/4.data-operations.md` | Accurate |
| `2.fundamentals/6.caching.md` | Accurate |
| `4.patterns/2.forms.md` | Mostly accurate |
| `4.patterns/drizzle.md` | Standard Drizzle patterns |
| `5.customization/1.index.md` | Minor Form.vue naming |
| `5.customization/3.custom-components.md` | Accurate |
| `5.customization/4.custom-columns.md` | Mostly accurate |
| `6.features/15.export.md` | Clean |
| `6.features/16.collaboration.md` | Clean |
| `7.advanced/3.conditional-fields.md` | Accurate |
| `7.advanced/5.optimistic-updates.md` | Pattern guide, accurate |
| `10.guides/6.future-roadmap.md` | Future proposals, N/A |
| `8.api-reference/6.use-collection-item.md` | Accurate |
| `8.api-reference/components/content-components.md` | Accurate |
| `8.api-reference/composables/data-composables.md` | Accurate |
| `8.api-reference/composables/form-composables.md` | Accurate |
| `8.api-reference/composables/query-composables.md` | Accurate |

---

## Recommended Actions

### Delete / Rewrite Completely
- `10.guides/7.rollback.md` -- The rollback commands exist as subcommands of `crouton-generate`, not as separate binaries. Rewrite to document `crouton-generate rollback`, `rollback-bulk`, `rollback-interactive`.
- `9.reference/1.conventions.md` -- Nearly every section has errors
- `9.reference/3.glossary.md` -- Multiple non-existent composables, wrong types
- `9.reference/2.faq.md` -- Multiple non-existent APIs, wrong env vars
- `2.fundamentals/2.architecture.md` -- Non-existent composables throughout

### Global Find-Replace
1. `CroutonButton` -> `CroutonFormActionButton` (all pages)
2. `CroutonList` -> `CroutonCollection` (all pages)
3. `useCroutonModal()` -> `useCrouton()` (all pages)
4. `useCroutonSlideover()` -> `useCrouton()` (all pages)
5. `useCroutonDrawer()` -> `useCrouton()` (all pages)
6. `useCroutonToast()` -> `useNotify()` (all pages)
7. `CroutonMiniButtons` -> `CroutonItemButtonsMini` (all pages)
8. `Form.vue` -> `_Form.vue` in generated file trees (all pages)
9. `[id].put.ts` -> `[collectionId].patch.ts` (all pages)
10. `statusCode:` -> `status:` in API error examples (all pages)
11. `{ key:` -> `{ accessorKey:` and `label:` -> `header:` in column defs (all pages)
12. Update all generated file structure diagrams to include `collections/` and `app/` levels

### Fix (specific claims to update)
- `3.generation/3.multi-collection.md`: Remove `'mysql'` dialect, change `'postgres'` to `'pg'`
- `3.generation/4.cli-reference.md`: Rewrite `init` command docs, add 7 missing commands
- `3.generation/2.schema-format.md`: Add `image` and `file` field types, `meta.nullable`, `meta.group`
- `6.features/7.assets.md`: Update component count to 7, fix source paths, add missing props
- `6.features/12.flow.md`: Add missing composable return values
- `6.features/13.ai.md`: Fix component/composable counts
- `6.features/14.admin.md`: Fix route paths (add `/team/` segment)
- `8.api-reference/3.types.md`: Fix LayoutType (`workspace` not `cards`), make props optional
- `8.api-reference/4.server.md`: `member` -> `membership`
- `8.api-reference/5.internal-api.md`: Fix hook payload field names
- All `hideDefaultColumns` references: Add `select` and `presence` fields

### Leave (healthy or cosmetic issues only)
- `1.getting-started/1.index.md`
- `1.getting-started/2.installation.md`
- `2.fundamentals/4.data-operations.md`
- `2.fundamentals/6.caching.md`
- `4.patterns/drizzle.md`
- `5.customization/3.custom-components.md`
- `6.features/15.export.md`
- `6.features/16.collaboration.md`
- `7.advanced/3.conditional-fields.md`
- `7.advanced/5.optimistic-updates.md`
- `10.guides/6.future-roadmap.md`
- `8.api-reference/6.use-collection-item.md`
- `8.api-reference/components/content-components.md`
- `8.api-reference/composables/data-composables.md`
- `8.api-reference/composables/form-composables.md`
- `8.api-reference/composables/query-composables.md`
