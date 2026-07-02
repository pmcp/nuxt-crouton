---
name: crouton-architecture-contract
layer: stack
description: The crouton mental model for someone who has never seen this repo — what "layer" means (two different things), the two-halves rule, the three app.config registries, team-scoped multi-tenancy, manifest-driven field types, the numbered invariants with the incidents behind them, and the known-weak points. Use when orienting in this codebase for the first time, when a question is shaped like "how does crouton work / why is it built this way / where does X live", when deciding whether a change belongs in a package or a generated layer, when confused by an extends chain or by croutonApps/croutonCollections/croutonLayoutBlocks, or before proposing any structural change. Trigger phrases: "what is a crouton layer", "package vs generated layer", "how does multi-tenancy work here", "why is there a stub component", "where do field types come from", "what invariants must hold".
---

# Crouton Architecture Contract

The load-bearing mental model of crouton: definitions, design decisions with their WHY, the invariants that must hold, and the honestly-stated weak points. This is theory + contract; the how-to lives in sibling skills.

## When to use / when NOT to use

| You want | Go to |
|---|---|
| The mental model, invariants, "why is it like this" | **this skill** |
| Generate a collection (workflow, MCP tools, gates) | `crouton` skill (`.claude/skills/crouton.md`) |
| Schema JSON format, field-type tables, artifact list | sibling `crouton-generation-reference` |
| Layout engine theory (LayoutTree, viability, placer) | sibling `crouton-layout-reference`; authoring a block → `block-authoring` skill |
| Symptom → root cause lookup | sibling `crouton-diagnostics-index` |
| Cold-start env setup, dist/install traps | sibling `crouton-build-and-env` |
| Which docs are stale vs canonical (full list) | sibling `crouton-docs-trust-map` |
| Which gate fires on a change | sibling `crouton-change-control` |

Trust order when sources conflict: see sibling `crouton-docs-trust-map` §1 (it owns the ranked chain; code beats prose for runtime behaviour).

## Glossary (repo jargon, first-contact)

| Term | Meaning here |
|---|---|
| **crouton** | Three referents: (1) the whole framework; (2) the CLI (`packages/crouton-cli`, bin `crouton`) that generates collections; (3) `@fyit/crouton`, the umbrella Nuxt *module* |
| **collection** | The unit crouton generates: one entity/table, defined by a schema JSON, generated into a self-contained layer dir. Always team-scoped |
| **layer** | A Nuxt Layer (a Nuxt app consumed via `extends`). Two meanings in this repo — see §1 |
| **fieldsFile** | The per-collection field-definition JSON (`schemas/<name>.json`) referenced by `crouton.config.js` |
| **team** | The multi-tenancy unit = a better-auth *organization*. Every generated API lives under `/api/teams/[id]/…` |
| **fixture** | A throwaway generated app in `fixtures/` booted by the Playwright harness in `e2e/` to smoke boot/auth/CRUD (see `fixtures/CLAUDE.md`) |
| **POC** | A real crouton app in `pocs/` incubating a future package; safe-to-fail, no required gates |
| **graduation** | The deliberate spec-driven rebuild of a proven POC into real package(s) + app (`/graduate` skill, epics #916/#992) |
| **gate** | A hold point where a human signs off before the expensive step (Schema #314 / UI #307 / Test #774 / code review). Resume signal is an `lgtm`/`approve` **comment** only (#572) |
| **stage** | Where code lives in the lifecycle, *declared* in `harness.config.mjs` (`poc`/`app`/`package`/unstaged). Resolve with `node scripts/harness-stages.mjs <path>` |
| **manifest** | A package's `crouton.manifest.ts` — declares its field types, bundled-ness, reserved names, contributions (§5) |

## 1. "Layer" means two different things

**Newcomer trap #1.** Both are Nuxt Layers technically, but they play different roles:

1. **Package layer** — `packages/` holds 31 packages (30 `crouton-*` dirs + the `crouton` meta package). **Most** `crouton-*` packages are publishable Nuxt Layers consumed **as source**: `packages/crouton-core/package.json` has `"main": "./nuxt.config.ts"` (no build step for the layer itself; `dist/` exists only for specific subpath exports — see sibling `crouton-build-and-env` for the install traps this causes). Exceptions (verified in each `package.json`): `crouton` **and `crouton-devtools`** are Nuxt *modules* (`"main": "./dist/module.mjs"`), `crouton-cli` is the bin CLI, `crouton-mcp` is the MCP server (`"main": "dist/index.js"`), and `crouton-themes` has no `main` at all (subpath-export theme layers only).
2. **Generated per-collection layer** — inside a consuming app, `layers/<layer>/collections/<collection>/` is itself a nested Nuxt layer with its own `nuxt.config.ts`. Verified real tree (`fixtures/minimal/layers/main/collections/items/`):

```
layers/main/collections/items/
├── app/components/{_Form.vue, List.vue}
├── app/composables/useMainItems.ts
├── server/api/teams/[id]/main-items/{index.get,index.post,[itemId].patch,[itemId].delete}.ts
├── server/database/{schema.ts, queries.ts}
├── types.ts  nuxt.config.ts  README.md
```
(Newer generations add tests, `seed.json`, and app-root aggregates — the full artifact list is `crouton-generation-reference`'s job.)

**The extends chain, in a real launched app** (`apps/velo/nuxt.config.ts`, verified):

```ts
modules: ['@fyit/crouton'],
extends: [
  '@fyit/crouton-core', '@fyit/crouton-layout', '@fyit/crouton-i18n',
  '@fyit/crouton-assets', '@fyit/crouton-pages', '@fyit/crouton-bookings',
  '@fyit/crouton-email',
  './layers/bookings', './layers/pages',       // ← generated layers
  '@fyit/crouton-maps', './layers/crouton'
]
```

And `@fyit/crouton-core` itself extends further (`packages/crouton-core/nuxt.config.ts`): `['@fyit/crouton-i18n', '@fyit/crouton-auth', '@fyit/crouton-admin']` — comment in file: "Order matters: i18n provides translation system that auth/admin consume". So auth/admin/i18n arrive **through core** ("bundled"). Note velo lists `@fyit/crouton-i18n` explicitly anyway — see invariant 5 for why that pattern is dangerous with auth/admin.

**The `@fyit/crouton` meta-package is a Nuxt MODULE, not a layer** (`"main": "./dist/module.mjs"`, built with unbuild). Verified: 15 nuxt.configs across apps/fixtures/pocs use `modules: ['@fyit/crouton']`. At runtime the module **cannot add layers** — comment in `packages/crouton/src/module.ts`: "Layers must be added via extends in nuxt.config.ts BEFORE modules load" — it only wires runtimeConfig and *warns* about missing layers. Its exported `getCroutonLayers()` extends-builder API has **zero in-repo callers** (verified: grep over all `apps/fixtures/pocs` nuxt.configs = 0 hits); every app hand-lists `extends` and the CLI's `syncFrameworkPackages` maintains those lists. Treat `getCroutonLayers()` as aspirational (see §7).

## 2. The two-halves rule

A crouton feature is delivered in **two halves that need each other** (canonical: `packages/crouton/CLAUDE.md` § "Packages vs Generated Layers (IMPORTANT)"):

| Half | Provides | Example |
|---|---|---|
| **Package** (via `extends`) | UI components, admin pages, navigation (`croutonApps`), composables, i18n | `@fyit/crouton-bookings` |
| **Generated layer** (via the CLI) | Drizzle schema, API endpoints, collection configs, types | `./layers/bookings` |

Package without layer → no tables, no endpoints (routes 404/500). Layer without package → collections exist but dump into a generic "Collections" sidebar with no dedicated UI. When something "is installed but doesn't work", check which half is missing first.

## 3. The three registries (all `app.config`, defu-merged across layers)

| Registry | Who writes it | Who reads it |
|---|---|---|
| `croutonCollections` | The generator upserts one entry per collection into the app's `app/app.config.ts` (verified in `apps/velo/app/app.config.ts:19`) | Core's shared CRUD components (`CroutonCollection`, forms, lists) resolve a collection by its registry key (e.g. `mainItems`) |
| `croutonApps` | Each addon package self-registers in its own `app/app.config.ts` (verified: `packages/crouton-bookings/app/app.config.ts:161`) | Sidebar/nav building via `useCroutonApps()` (dashboardRoutes/adminRoutes/settingsRoutes), and **presence detection** via `hasApp(id)` |
| `croutonLayoutBlocks` | Each package contributes placeable layout blocks (defaults in `packages/crouton-layout/app/app.config.ts`; bookings adds calendar blocks) | The layout engine — see sibling `crouton-layout-reference` |

**Stub-priority pattern** — the mechanics and code example are owned by root `CLAUDE.md` § "Optional Cross-Package Components (Stub Pattern)"; don't re-derive them. What this skill adds is the WHY: optional packages (editor, maps, assets, collab) may or may not be in the extends chain, and Vue has no clean build-time "is this component available?" check — `resolveComponent()` warns unconditionally when absent, and `vueApp._context.components` is private API. So core ships **no-op stubs** (7 verified in `packages/crouton-core/app/components/stubs/`: `CroutonAssetsPicker`, `CroutonEditorSimple`, `CroutonEditorPreview`, `CroutonMapsMap`, `CroutonMapsPreview`, `AuthRouteModal`, `CollabEditingBadge`) registered at `priority: -1` (verified `packages/crouton-core/nuxt.config.ts:164`); the real addon component at default priority silently wins when present. The failure this prevents: console warning spam + broken renders in every app that *doesn't* install an optional addon. Behavior branching uses `useCroutonApps().hasApp('assets')` (reads `app.config.croutonApps`). Addons registering routes use a `parentApp` key (type in `crouton-core/app/types/app.ts`) so defu array-merging doesn't collide nav entries.

## 4. Team-scoped multi-tenancy

- **Model**: better-auth with the organization plugin; **team = organization**. Canonical package: `packages/crouton-auth`.
- **Resolver**: `resolveTeamAndCheckMembership(event)` in `packages/crouton-auth/server/utils/team.ts` (verified, line 73). Mode-aware per its JSDoc — multi-tenant (team from URL param, fallback session `activeOrganizationId`), single-tenant (default team), personal (per-user team). Returns `{ team, user, membership }`; throws 401 (unauthenticated) / 403 (not a member) / 404 (no team).
- **Route shape**: every generated endpoint lives at `/api/teams/[id]/<layer>-<plural>/`. Verified in a real generated handler (`fixtures/minimal/.../server/api/teams/[id]/main-items/index.get.ts`):

```ts
import { resolveTeamAndCheckMembership } from '@fyit/crouton-auth/server/utils/team'
const { team } = await resolveTeamAndCheckMembership(event)
// every query takes team.id
```

- **Client side**: `useTeamContext()` (`packages/crouton-core/app/composables/useTeamContext.ts`) reads the `[team]` route param.
- There is **no opt-out**: the generator hardcodes the auth import and passes `team.id` to every query (invariant 3). Note core also wires a `#crouton/team-auth` nitro alias to the same package as a compat path — generated code uses the direct import, not the alias.

## 5. Manifest-driven field types

Field types are **not hardcoded in the CLI**. Each package declares a `crouton.manifest.ts` built with `defineCroutonManifest` (from `@fyit/crouton-core/shared/manifest`); the CLI's manifest loader merges them into the type mapping. Core's manifest (`packages/crouton-core/crouton.manifest.ts`, verified) declares 12 types (`string, text, number, decimal, boolean, date, json, repeater, array, reference, image, file`), each with `db`/`drizzle`/`zod`/`tsType`/`defaultValue`/`component`, plus **aliases** (`integer`→`number`, `datetime`→`date` — aliases resolve to canonical *before* generators run; the #285 incident is why: `datetime` once leaked through and generated a raw `<UInput>` + a `text` column). The manifest also owns `autoGeneratedFields` (`id, teamId, owner, createdAt, updatedAt, createdBy, updatedBy` — never declare these), `reservedFieldNames` (adds `order, optimisticId, optimisticAction, parentId, path, depth`), and `reservedCollectionNames`. Manifests additionally declare `bundled` (read by the meta module) and `detects` patterns that trigger addon generator contributions. Full field-type tables and schema format: sibling `crouton-generation-reference`. **Adding a field type = a manifest change, not a CLI patch.**

## 6. Invariants (numbered; each with why and, where known, the incident)

1. **Dependency direction `crouton-layout → crouton-core`, never reverse.** "HARD RULE" in `packages/crouton-layout/CLAUDE.md` (verified heading). Shared layout types deliberately live in *core* so feature packages (bookings, pages) contribute blocks via the `croutonLayoutBlocks` registry without depending on the layout package — layout knows nothing about bookings, bookings needs no dep on layout. Breaking this creates a cycle (core can't extend layout — apps extend both directly).
2. **Optional components go through the stub-priority system, never `resolveComponent()`.** Canonical rule + code: root `CLAUDE.md` § Critical Gotchas. Why: §3 above.
3. **Every collection is team-scoped, no flag to turn it off.** Generated endpoints import the crouton-auth resolver and scope every query by `team.id` (verified §4). Why: tenancy leaks are the worst class of bug in a multi-tenant CRUD system; generated API tests exist specifically to go red if a handler drops `teamId` (#791, per `crouton-cli` docs).
4. **`packages/` is edit-guarded (HARD GATE).** Canonical: root `CLAUDE.md` § Packages Boundary; enforced by the PreToolUse hook `.claude/hooks/gate-package-edits.sh`; stage model says `packages/*` = stage `package`, test-first required (`node scripts/harness-stages.mjs packages/crouton-core`). Why: 31 packages ripple into every consuming app/fixture/poc. Approval flow: sibling `crouton-change-control`.
5. **Never re-extend the bundled packages `auth`/`admin` alongside core.** They arrive through core's own extends (§1). Adding them separately "causes duplicate layer loading and SSR errors like `$setup.t is not a function`" (verified quote, `packages/crouton-cli/CLAUDE.md:127`). (velo listing `crouton-i18n` explicitly is in-repo precedent, but the documented trap names auth/i18n/admin — when in doubt, don't re-extend any of them.)
6. **`hub: { db: 'sqlite' }`, never `hub: { database: true }`.** Canonical: root `CLAUDE.md` § Critical Gotchas (breaks `.nuxt/hub/db/schema.entry.ts` resolution + local migrations). NuxtHub is the storage abstraction only (D1/KV/R2), never the deploy tool.
7. **Translatable fields must be `required: false` at the root column.** The real value lives in the `translations.{locale}.field` JSON column; the root column is a cache/fallback, and a `NOT NULL` root column fails inserts that only populate translations (canonical: `packages/crouton-cli/CLAUDE.md` "Why this matters").
8. **Layout is data, not generated `.vue`.** A `LayoutTree` persisted in the team-scoped `layout_configs` table (verified: `packages/crouton-layout/server/database/schema/layoutConfigs.ts` has `teamId` + team index; API under `server/api/teams/[id]/crouton-layouts/`). Why: layouts stay editable at runtime and diffable/serializable for the agent⇄human loop, instead of being frozen into components at generate time.
9. **Field types and package capabilities are manifest-declared** (§5). Why: the CLI, the MCP server, and the meta module all read the same `crouton.manifest.ts` files — one source, three consumers; a hardcoded CLI table would drift per consumer (#285 was exactly that class of bug).
10. **Core's `ensure-hub-blob` module must load before `@nuxthub/core`** (verified comment in `packages/crouton-core/nuxt.config.ts`: "Must be before @nuxthub/core — sets hub.blob = true") so apps declaring only `db: 'sqlite'` still get blob storage. Don't reorder core's `modules` array.

(Install/postinstall/typecheck invariants — guarded `postinstall`, per-app typecheck — belong to sibling `crouton-build-and-env`; deploy invariants — staging-only, Workers-not-Pages — to `crouton-ci-and-deploy-map`.)

## 7. Known-weak points (state of 2026-07-02, plainly)

| Weak point | Evidence | Status |
|---|---|---|
| **Production-SSR 500 on collection pages** — an internal data-fetch loses the auth cookie under `nuxt preview`, so the entire e2e harness runs against `nuxt dev` (source of its huge timeouts) | verified: `e2e/CLAUDE.md` ~line 308; tracked as **#246** per `.claude/skills/e2e-smoke/SKILL.md:124` | **unresolved**, load-bearing |
| **`getCroutonLayers()` has zero in-repo callers** — the meta module itself IS consumed (`modules: ['@fyit/crouton']` in 15 configs, verified) but its headline extends-assembly API is unexercised; apps hand-list `extends` (CLI-synced). Drift risk between documented and real assembly | verified: grep 0 hits across apps/fixtures/pocs | open question — aspirational API or deprecation candidate (owner call) |
| **`packages/crouton-core/CLAUDE.md` is stale** — title claims `@fyit/crouton` (that's the meta package), references dead names (`nuxt-crouton-i18n`, `@crouton/auth` — real import is `@fyit/crouton-auth/server/utils/team`) | verified: lines 1, 16, 161–165 | do not trust its import examples; full stale-doc list → sibling `crouton-docs-trust-map` |
| **ISR routeRules contradiction** — root `CLAUDE.md` recommends a wildcard `/api/teams/*/...` ISR rule that live code comments mark BROKEN (breaks generated collection routes) | full story + evidence: sibling `crouton-diagnostics-index` § "The ISR routeRules contradiction" (the owner) | don't add such wildcard rules |
| **CLI mirrors block sizing contracts by hand** — `packages/crouton-cli/lib/compose-layout.ts:22-25` (verified): "we mirror the real registries here. Keep in sync with `crouton-core/app/app.config.ts` and `crouton-bookings/app/app.config.ts`" (note: the live default registry actually sits in `crouton-layout/app/app.config.ts` — the comment itself has drifted) | verified | silent-drift hazard when a package changes `minWidth`/`defaultSize` |
| **`packages/crouton-layout/CLAUDE.md` self-contradicts** — marks server-side extraction pending while `layout_configs` schema + API exist on disk (verified present) | verified files exist | trust the code |

## Provenance and maintenance

Facts verified 2026-07-02 against the working tree at `/home/user/nuxt-crouton` (files read: `apps/velo/nuxt.config.ts`, `packages/crouton-core/{nuxt.config.ts,crouton.manifest.ts,package.json,CLAUDE.md}`, `packages/crouton/{src/module.ts,package.json,CLAUDE.md}`, `packages/crouton-auth/server/utils/team.ts`, `packages/crouton-layout/{CLAUDE.md,app/app.config.ts,server/database/schema/layoutConfigs.ts}`, `packages/crouton-cli/{CLAUDE.md,lib/compose-layout.ts}`, `fixtures/minimal/layers/main/collections/items/**`, `e2e/CLAUDE.md`, `.claude/skills/e2e-smoke/SKILL.md`). Issue numbers (#285, #246, #791, #314, #572, #709, #751, #916, #992) are cited from discovery-report summaries of GitHub issues — check the issue if load-bearing.

Re-verification one-liners (things that drift):

```bash
grep -n "extends" apps/velo/nuxt.config.ts                                     # extends chain still hand-listed?
grep -rn "getCroutonLayers" apps/*/nuxt.config.ts fixtures/*/nuxt.config.ts pocs/*/nuxt.config.ts  # still 0 callers?
ls packages/crouton-core/app/components/stubs/                                 # still 7 stubs?
grep -n "priority" packages/crouton-core/nuxt.config.ts                        # stubs still -1?
grep -n "500 under production SSR" e2e/CLAUDE.md                               # #246 still unresolved?
node scripts/harness-stages.mjs packages/crouton-core                          # packages still edit-guarded/test-first?
ls packages | wc -l                                                            # still 31 packages?
```
