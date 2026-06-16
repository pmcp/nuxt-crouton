# Adding the `with-relations` E2E Fixture — Process Report

**Date:** 2026-06-16
**Issue:** [#224](https://github.com/pmcp/nuxt-crouton/issues/224)
**Goal:** Add a *relatively complex* new e2e fixture and document what had to be done
manually vs. what the tooling automated — so we can improve the "add a fixture" flow.

---

## What I built and why

Every existing fixture (`minimal`, `with-pages`, `with-bookings`, `with-assets`,
`with-collab`) uses a **single flat `items` collection**. The core generator's
**relationship handling** was therefore completely unsmoked: foreign-key columns
(`refTarget`), multi-table migrations, multiple collections registered in one
layer, and the `CroutonFormReferenceSelect` that loads its options from a parent
collection.

`with-relations` fills that gap with two related collections in one `main` layer:

- **`authors`** — parent (`name`, `bio`)
- **`books`** — child with `authorId` (`refTarget: authors`) plus `title`, `year`, `available`

The FK is deliberately **optional** so the text-field-only CRUD harness can still
create a `books` row; the relation UI is asserted separately via a mount surface
(`/admin/{team}/relation-check`), exactly mirroring the `with-assets`/`with-collab`
precedent.

---

## Manual vs. automated — step by step

| # | Step | Mode | Notes |
|---|------|------|-------|
| 1 | Decide the fixture & design the two schemas | **Manual** | Hand-wrote `authors.json` / `books.json`. The relation is one line: `"authorId": { "type": "uuid", "refTarget": "authors", ... }`. |
| 2 | Scaffold the fixture skeleton | **Manual (copy)** | `cp -r fixtures/minimal fixtures/with-relations`, then clean throwaway dirs + the old generated `items` layer. The documented `crouton init` path exists but pulls in CF/deploy noise; copying `minimal` is the lighter, realistic path. |
| 3 | Write `crouton.config.js` (collections + targets) | **Manual** | Two collections, one layer target. Trivial. |
| 4 | Rename the workspace package | **Manual** | `package.json` → `"name": "e2e-fixture-with-relations"`. |
| 5 | Generate collections (layers, schema, API, composables, types, migration) | **✅ Automated** | `crouton config --force` — generated 22 files across 2 collections + the Drizzle migration + query/type registries, in one shot. This is the heavy lifting and it just worked. |
| 6 | Wire the new collections into managed files | **⚠️ Partly automated** | Query registry + type registry were regenerated cleanly; the schema barrel, `app.config.ts`, and layer `extends` were **append-merged** (see Finding 2). |
| 7 | Write `e2e.manifest.json` | **Manual** | Declares both collections' CRUD + the relation surface + the i18n check. No test code. |
| 8 | Write the relation-check surface page | **Manual** | A ~15-line Vue page mounting `CroutonFormReferenceSelect collection="mainAuthors"`. Copy-adapt of the assets/collab check pages. |
| 9 | Register in workspace + build deps | **✅ Automated** | `pnpm install` (fixture auto-discovered via the `fixtures/*` glob) + `pnpm --filter "…^..." build`. |
| 10 | Typecheck gate (#197) | **✅ Automated** | `pnpm --filter e2e-fixture-with-relations typecheck` → green. |
| 11 | Run the smoke | **✅ Automated** | `E2E_FIXTURE=with-relations pnpm test:e2e` — generic manifest-driven specs, zero new test code. |
| 12 | Add to CI matrix | **Manual (1 word)** | Append `with-relations` to the `e2e.yml` matrix. |

**Headline:** the *generation* and *running* are fully automated; the *manual*
work is authoring intent (schemas, config, manifest) and one small surface page —
plus, this time, **cleaning up after a generator quirk** (Findings 1–2).

---

## What went well

- **`crouton config --force` is the star.** From two schema files it produced a
  complete, type-clean, migratable two-table app — including the relation form
  control (`CroutonFormReferenceSelect`) and the FK migration — with no hand-editing
  of generated code.
- **The harness is genuinely fixture-agnostic.** Adding CRUD coverage for two new
  collections + a package-style surface was *pure JSON* (`e2e.manifest.json`). No
  spec code was written or touched.
- **Workspace discovery is automatic.** Dropping the app under `fixtures/` and
  running `pnpm install` was all it took for `pnpm --filter` to see it.
- **The #197 typecheck gate caught nothing this time — because the inputs were
  clean.** That's the system working: once the name collision (Finding 1) was
  resolved, typecheck + smoke were green first try.

## What went wrong (and the findings worth acting on)

### Finding 1 — `formComponent` auto-detect scans **uninstalled** packages (real bug)
My first attempt named the collections `categories` / `products`. The generated
configs came out with `componentName: 'SalesCategoryForm'` / `'SalesProductForm'`
**even though `@fyit/crouton-sales` is not a dependency of the fixture**, and
`_Form.vue` was *skipped* (the generator skips Form.vue when a `formComponent` is
detected) — leaving a dangling reference to a component that doesn't exist.

Root cause: `packages/crouton-cli/lib/generate-collection.ts:787` iterates
**`allContributions`** (every package manifest in the monorepo) instead of the
already-computed `contributions` (filtered to core + enabled features + detected
packages). `crouton-sales`'s `getFormComponent` claims the names
`product(s)`/`categor(y/ies)`/`printer(s)`/`location(s)` (`crouton-sales/crouton.manifest.ts:178`),
so any app that names a collection `products` silently adopts a Sales component it
never installed.

- **Impact:** a generated app with a `products`/`categories`/etc. collection
  references a missing component → broken at runtime / typecheck, *unless*
  crouton-sales happens to be installed.
- **Fix (follow-up):** filter the auto-detect loop to `contributions`, not
  `allContributions`. One-line change; should add a regression test.
- **Workaround used here:** neutral collection names (`authors`/`books`) that no
  package's manifest claims. **Worth catching generically:** a fixture named after
  these reserved words (a `with-sales-names` smoke) would turn this into a red CI
  run.

### Finding 2 — `crouton config` is inconsistent about pruning removed collections
After removing `items` from `crouton.config.js` (and deleting its layer dir), a
regen left the fixture half-updated:

- **Regenerated wholesale (correct):** `crouton-query-registry.ts`, `types/crouton-collections.d.ts` — `items` was pruned.
- **Append-merged (kept stale `items`):** `server/db/schema.ts` barrel, `app/app.config.ts`, and the layer `nuxt.config.ts` `extends` — all still imported the deleted `items` layer → broken build.

So "remove a collection from the config and regen" does **not** produce a clean
app; you must either use `crouton rollback <collection>` (the intended tool) or
hand-clean three managed files. I hand-reset the three append-merged files to a
no-collection baseline, then regenerated cleanly.

- **Fix (follow-up):** make the three append-merged managed files authoritative
  (regenerate from config like the registries do), or have `--force` reconcile
  removals. At minimum, document that collection *removal* requires `rollback`.

### Finding 3 — ~~`minimal` carries a stale `_Form.vue`~~ (RETRACTED — misdiagnosis)
**Correction:** an earlier draft claimed `minimal`'s `_Form.vue` was stale. It is
**not** — it's byte-for-byte the shape the current generator still emits. The
generator produces `_Form.vue` whenever **no** package `formComponent` is detected
(`generate-collection.ts:896`); when a package *does* supply one, it simply doesn't
generate `_Form.vue` at all. `products`/`categories` lacked a `_Form.vue` earlier
purely because of Finding 1 (the form got wrongly "claimed"), not a version drift.

**Aside — the `_Form.vue` underscore is undocumented.** `.nuxt/components.d.ts`
confirms `_Form.vue` is registered as the live `<MainXForm>` (Nuxt strips the
leading underscore, so the name equals what plain `Form.vue` would yield — the
underscore is functionally inert). It reads as a "generated base form, edit in
place" convention, but no code comment or doc explains *why* the underscore. The
generated header says "Safe to modify" but not what the file *is* or how it's
referenced. **Cheap improvement:** add one line to the generated `_Form.vue` header
— "this is the active form, auto-imported as `<MainXForm>`; a package-provided form
replaces it" — so the convention is self-explaining where people actually read it.

### Finding 4 — environment: Playwright browser revision mismatch (env, not crouton)
The sandbox ships chromium build **1194**; Playwright 1.57 wants **1200**, and the
download is blocked by the network policy. The headless-shell directory layout
also changed between revisions. Resolved locally by symlinking
`/opt/pw-browsers/chromium-1200` → `1194` and rebuilding the
`chromium_headless_shell-1200/chrome-headless-shell-linux64/` layout. Irrelevant to
CI (which caches the matching browser) but worth noting for future web-session smokes.

---

## Recommendations to improve the "add a fixture" flow

1. **Fix the `allContributions` leak (Finding 1)** — highest value; it's a latent
   bug for *any* real app using common collection names, not just fixtures.
2. **Make collection removal clean (Finding 2)** — regenerate the schema barrel /
   app.config / layer-extends authoritatively, or document `rollback` as required.
3. **Add a `scaffold-fixture` helper** — a thin wrapper that does steps 2/4/7
   (copy `minimal`, rename the package, stub `e2e.manifest.json`) so adding a
   fixture is "drop schemas + config, run one command". Today those are manual.
4. **Consider a `with-sales-names` (or reserved-name) smoke** — would have turned
   Finding 1 red automatically instead of relying on me noticing `SalesProductForm`.

---

## Result

- ✅ `crouton config --force` regen: clean (2 collections, FK migration, reference-select form)
- ✅ Typecheck gate (#197): green
- ✅ Playwright smoke (`E2E_FIXTURE=with-relations`): **12 passed (3.0m)** — setup/auth + CRUD on both `authors` & `books` (incl. required-field validation) + the relation surface + the i18n locale switch
- ✅ Added to the `e2e.yml` CI matrix
- ✅ Docs updated (`fixtures/CLAUDE.md`, `e2e/CLAUDE.md`)
