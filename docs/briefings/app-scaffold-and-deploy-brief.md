# Briefing: App Scaffold CLI + Deploy Automation

**Date**: 2026-02-16
**Updated**: 2026-02-16 (post-analysis of existing CLI capabilities)
**Context**: First production app (bike-sheds) was manually scaffolded and deployed to CF Pages. Process took ~15min with several pain points. Goal: automate this for future apps.

## Problem

Creating a new crouton app requires manually creating ~12 files, copying CF stubs, wiring dependencies, and running a multi-step deploy process. Every launch hits the same issues.

## Pain Points from bike-sheds Launch

| Issue | Root Cause | Fix Needed | Status |
|-------|-----------|------------|--------|
| Missing `@fyit/crouton-i18n` dep | Translatable fields need i18n, not auto-added | Pre-flight dep check or auto-add | `module-detector.mjs` already does 4-level checks — may need tuning, not a new system |
| `npx nuxt db migrate` fails locally | D1 driver URI error with local SQLite | Document: dev server auto-applies | Docs fix only |
| Duplicate `croutonCollections` key | Generator appends without checking existing keys | Fix generator dedup check | Still open — confirmed in `generate-collection.mjs` |
| Missing i18n locale files | Generator adds i18n config but not locale files | Generator should create empty locales | Still open — confirmed missing |
| `papaparse` breaks Rollup on CF | CJS-only package in server bundle | Add to nitro alias stubs | CF stub needed in scaffold template |
| KV namespace collision | Generic "KV" shared across apps | Use app-specific names | Scaffold should template `{name}-kv` |
| Wrangler v4 CLI syntax changed | `kv:namespace` → `kv namespace` (spaces) | Update docs and scripts | Docs fix only |
| Wrong `BETTER_AUTH_URL` for previews | Preview URLs have hash prefix | Wildcard trusted origins | Already fixed |

## What Exists Today

### CLI Commands (9 total)
| Command | Purpose |
|---------|---------|
| `crouton generate` | Generate collections from config |
| `crouton config` | Generate from config file |
| `crouton init` | Create example **schema** file only |
| `crouton add` | Add crouton modules (installs, updates extends, runs migrations) |
| `crouton install` | Install required modules |
| `crouton rollback` | Remove collection |
| `crouton rollback-bulk` | Bulk removal |
| `crouton rollback-interactive` | Interactive removal |
| `crouton seed-translations` | Seed i18n data |

**Gap**: No `scaffold-app` or `init-app` command.

### Existing Infrastructure the Scaffold Can Reuse

The CLI already has significant infrastructure that the briefing originally underestimated:

| File | What It Does | Reusable? |
|------|-------------|-----------|
| `lib/module-registry.mjs` | Maps 13+ module aliases to package names, schema exports, tables, dependency chains, and bundled status | **Yes** — source of truth for feature→package mapping |
| `lib/utils/framework-packages.mjs` | Resolves `features` flags into nuxt.config `extends` array entries | **Yes** — directly generates the extends array |
| `lib/utils/module-detector.mjs` | 4-level dependency validation (package.json, extends, deps, collections) | **Yes** — pre-flight checks already exist |
| `lib/utils/manifest-merge.mjs` | Auto-discovers package collections when features enabled (e.g., bookings schemas) | **Yes** — used by `crouton generate` |
| `lib/add-module.mjs` | Installs packages, updates config, runs migrations | **Partially** — scaffold doesn't run migrations but uses the same resolution |

#### Module Registry (13+ modules)

```javascript
// lib/module-registry.mjs — already defines:
MODULES = {
  auth:      { package: '@fyit/crouton-auth',      bundled: true,  dependencies: [] },
  i18n:      { package: '@fyit/crouton-i18n',      bundled: true,  dependencies: [] },
  admin:     { package: '@fyit/crouton-admin',     bundled: true,  dependencies: [] },
  editor:    { package: '@fyit/crouton-editor',    bundled: false, dependencies: [] },
  bookings:  { package: '@fyit/crouton-bookings',  bundled: false, dependencies: ['auth'] },
  pages:     { package: '@fyit/crouton-pages',     bundled: false, dependencies: [] },
  flow:      { package: '@fyit/crouton-flow',      bundled: false, dependencies: [] },
  assets:    { package: '@fyit/crouton-assets',    bundled: false, dependencies: [] },
  maps:      { package: '@fyit/crouton-maps',      bundled: false, dependencies: [] },
  ai:        { package: '@fyit/crouton-ai',        bundled: false, dependencies: [] },
  email:     { package: '@fyit/crouton-email',     bundled: false, dependencies: [] },
  events:    { package: '@fyit/crouton-events',    bundled: false, dependencies: [] },
  collab:    { package: '@fyit/crouton-collab',    bundled: false, dependencies: [] },
  sales:     { package: '@fyit/crouton-sales',     bundled: false, dependencies: [] },
  devtools:  { package: '@fyit/crouton-devtools',  bundled: false, dependencies: [] },
  themes:    { package: '@fyit/crouton-themes',    bundled: false, dependencies: [] },
  // ...
}
```

**Bundled modules** (auth, i18n, admin) are included in `@fyit/crouton` core — adding them separately to `extends` causes SSR errors.

#### Designer Sync Issue

The designer (`apps/crouton-designer/app/composables/useIntakePrompt.ts`) hardcodes only 5 packages in its Phase 1 prompt instead of consuming `module-registry.mjs`. This will drift. The designer should import from the registry (or a shared JSON export of it) as the single source of truth.

### Files Created Manually (before `crouton generate`)
```
apps/{name}/
├── package.json              # deps, scripts, CF deploy commands
├── nuxt.config.ts            # extends, hub config, CF preset, stubs
├── crouton.config.js         # features, collections, targets
├── wrangler.toml             # D1/KV bindings, migrations_dir
├── app.vue                   # minimal <UApp> shell
├── .env.example              # auth + optional vars
├── .gitignore                # standard Nuxt ignores
├── app/
│   ├── app.config.ts         # placeholder (wired after generate)
│   └── assets/css/main.css   # tailwind + crouton source scanning
├── server/
│   ├── db/
│   │   ├── schema.ts         # placeholder (wired after generate)
│   │   └── translations-ui.ts # UI translations table
│   └── utils/_cf-stubs/
│       ├── index.ts           # passkey/tsyringe/webauthn stubs
│       └── client.ts          # passkey client stub
└── schemas/                   # field definition JSONs
```

## Proposed: Two New CLI Commands

### 1. `crouton scaffold-app <name>`

Creates the full app directory with all boilerplate. Simpler than originally estimated because it reuses existing CLI infrastructure.

**Usage**:
```bash
crouton scaffold-app bike-sheds --features=bookings,pages,editor,maps
```

**What it does**:
1. Validate features against `module-registry.mjs` (already has dependency chains)
2. Resolve extends array via `framework-packages.mjs` (already exists)
3. Create directory structure under `apps/<name>/`
4. Template `package.json` with workspace deps from resolved features
5. Template `nuxt.config.ts` with extends array, hub config, CF preset, stubs
6. Template `crouton.config.js` from feature selection
7. Template `wrangler.toml` with app-specific placeholder names (`{name}-db`, `{name}-kv`)
8. Copy CF stubs (passkey/tsyringe + papaparse)
9. Create `app.vue`, `main.css`, `.env.example`, `.gitignore`
10. Create placeholder `app.config.ts` and `server/db/schema.ts`
11. Create `translations-ui.ts`
12. Run `pnpm install`
13. Print next steps (run `crouton generate`, add schemas, etc.)

**Flags**:
- `--features=<list>` — comma-separated feature names validated against module registry
- `--dialect=<sqlite|pg>` — database dialect (default: sqlite)
- `--no-cf` — skip Cloudflare-specific config (wrangler.toml, CF stubs, CF preset)
- `--dry-run` — preview without writing

**Template approach**: Use a `templates/app/` directory in crouton-cli with simple string interpolation (EJS or template literals). Templates are editable without touching generator logic.

### 2. `crouton deploy <name>` (or deploy script)

Automates Cloudflare setup and deployment.

**Usage**:
```bash
crouton deploy bike-sheds
```

**What it does**:
1. Check wrangler auth (`npx wrangler whoami`)
2. Create CF Pages project (`npx wrangler pages project create <name>`)
3. Create D1 database (`npx wrangler d1 create <name>-db`)
4. Create KV namespace (`npx wrangler kv namespace create <name>-kv`)
5. Update `wrangler.toml` with real IDs
6. Prompt for secrets (BETTER_AUTH_SECRET, BETTER_AUTH_URL)
7. Set secrets via wrangler
8. Run `db:migrate:prod`
9. Run `cf:deploy`
10. Print deployed URL

**Could also be a shell script** at `scripts/deploy-app.sh` if CLI integration is too heavy. Start here, promote to CLI command later if needed.

## Key Reference Files

| File | Why |
|------|-----|
| `apps/bike-sheds/` | Real example of deployed app |
| `apps/rakim/` | Reference CF deployment (simpler) |
| `packages/crouton-cli/bin/crouton-generate.js` | CLI entry point (Commander.js, 587 lines) |
| `packages/crouton-cli/lib/generate-collection.mjs` | Main generator (1,988 lines) |
| `packages/crouton-cli/lib/module-registry.mjs` | Module definitions (13+ modules, 212 lines) |
| `packages/crouton-cli/lib/utils/framework-packages.mjs` | Feature→extends resolution (44 lines) |
| `packages/crouton-cli/lib/utils/module-detector.mjs` | 4-level dep validation (250 lines) |
| `packages/crouton-cli/lib/utils/manifest-merge.mjs` | Auto-merge package collections (186 lines) |
| `packages/crouton-cli/lib/add-module.mjs` | Module installation flow (300+ lines) |
| `apps/crouton-designer/app/composables/useIntakePrompt.ts` | Designer's hardcoded package list (needs sync) |
| `docs/guides/app-launch-guide.md` | Step-by-step guide + launch log |

## Also Fix in Generator

These should be addressed regardless of the scaffold command:

1. **Missing i18n locale files** — when generator adds `i18n` config to layer nuxt.config, also create empty `{layer}/i18n/locales/{en,nl,fr}.json`. Confirmed still missing.
2. **Duplicate config keys** — check for existing `croutonCollections` before appending in `generate-collection.mjs`. Confirmed still present.
3. ~~**Dependency pre-flight**~~ — `module-detector.mjs` already performs 4-level checks. May need tuning for specific edge cases (e.g., translatable fields implying i18n need) but the system exists.

## Future Consideration: `crouton doctor <name>`

Validates an existing app's setup — checks for missing deps, stale wrangler config, placeholder IDs, missing locale files, etc. Useful for both new scaffolds and existing apps like bike-sheds. Low effort (~50 LOC), high diagnostic value.

## Designer Sync Action Item

The designer's `useIntakePrompt.ts` hardcodes 5 packages. It should consume `module-registry.mjs` (or a shared JSON export) so both CLI and designer use the same source of truth. Currently listed in designer:

- crouton-editor, crouton-i18n, crouton-flow, crouton-assets, crouton-bookings

Missing from designer (available in registry):

- crouton-pages, crouton-maps, crouton-ai, crouton-email, crouton-events, crouton-collab, crouton-sales, crouton-devtools, crouton-themes

## Estimated Effort (Revised)

| Task | Size | Notes |
|------|------|-------|
| `scaffold-app` command | **Small-Medium** (~150 LOC) | Simpler than originally estimated — reuses module-registry, framework-packages, module-detector |
| `deploy` script | Small (shell script, ~80 LOC) | Start as `scripts/deploy-app.sh` |
| Generator locale fix | Small (~20 LOC) | In nuxt-config generator |
| Generator duplicate key fix | Small (~10 LOC) | In `generate-collection.mjs` |
| ~~Dep pre-flight improvement~~ | **Already exists** | `module-detector.mjs` — tune if needed |
| Designer registry sync | Small (~30 LOC) | Import from module-registry instead of hardcoding |
| `crouton doctor` (future) | Small (~50 LOC) | Validates existing app setup |

## Priority

| Priority | Task | Why |
|----------|------|-----|
| **P0** | Generator fixes (locale files, duplicate keys) | Quick wins, fix real bugs, ~30 LOC total |
| **P1** | `scaffold-app` command | Biggest time saver, reuses existing infra |
| **P2** | Deploy script (shell first) | Start simple, promote to CLI later |
| **P3** | Designer registry sync | Prevents drift, low effort |
| **P4** | `crouton doctor` | Nice-to-have diagnostic tool |
