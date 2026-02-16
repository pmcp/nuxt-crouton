# Briefing: App Scaffold CLI + Deploy Automation

**Date**: 2026-02-16
**Context**: First production app (bike-sheds) was manually scaffolded and deployed to CF Pages. Process took ~15min with several pain points. Goal: automate this for future apps.

## Problem

Creating a new crouton app requires manually creating ~12 files, copying CF stubs, wiring dependencies, and running a multi-step deploy process. Every launch hits the same issues.

## Pain Points from bike-sheds Launch

| Issue | Root Cause | Fix Needed |
|-------|-----------|------------|
| Missing `@fyit/crouton-i18n` dep | Translatable fields need i18n, not auto-added | Pre-flight dep check or auto-add |
| `npx nuxt db migrate` fails locally | D1 driver URI error with local SQLite | Document: dev server auto-applies |
| Duplicate `croutonCollections` key | Generator appends without checking existing keys | Fix generator or use clean placeholder |
| Missing i18n locale files | Generator adds i18n config but not locale files | Generator should create empty locales |
| `papaparse` breaks Rollup on CF | CJS-only package in server bundle | Add to nitro alias stubs |
| KV namespace collision | Generic "KV" shared across apps | Use app-specific names |
| Wrangler v4 CLI syntax changed | `kv:namespace` → `kv namespace` (spaces) | Update docs and scripts |
| Wrong `BETTER_AUTH_URL` for previews | Preview URLs have hash prefix | Wildcard trusted origins (already fixed) |

## What Exists Today

### CLI Commands (9 total)
| Command | Purpose |
|---------|---------|
| `crouton generate` | Generate collections from config |
| `crouton config` | Generate from config file |
| `crouton init` | Create example **schema** file only |
| `crouton add` | Add crouton modules |
| `crouton install` | Install required modules |
| `crouton rollback` | Remove collection |
| `crouton rollback-bulk` | Bulk removal |
| `crouton rollback-interactive` | Interactive removal |
| `crouton seed-translations` | Seed i18n data |

**Gap**: No `scaffold-app` or `init-app` command.

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

Creates the full app directory with all boilerplate.

**Usage**:
```bash
crouton scaffold-app bike-sheds --features=bookings,pages,editor,maps
```

**What it does**:
1. Create directory structure under `apps/<name>/`
2. Generate `package.json` with correct workspace deps based on features
3. Generate `nuxt.config.ts` with extends array, hub config, CF preset, stubs
4. Generate `crouton.config.js` from feature selection
5. Generate `wrangler.toml` with placeholder IDs
6. Copy CF stubs (passkey/tsyringe + papaparse)
7. Create `app.vue`, `main.css`, `.env.example`, `.gitignore`
8. Create placeholder `app.config.ts` and `server/db/schema.ts`
9. Create `translations-ui.ts`
10. Run `pnpm install`
11. Print next steps

**Flags**:
- `--features=<list>` — comma-separated feature packages (bookings, pages, editor, maps, ai, email)
- `--dialect=<sqlite|pg>` — database dialect (default: sqlite)
- `--no-cf` — skip Cloudflare-specific config (for local-only or Vercel)
- `--dry-run` — preview without writing

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

**Could also be a shell script** at `scripts/deploy-app.sh` if CLI integration is too heavy.

## Key Reference Files

| File | Why |
|------|-----|
| `apps/bike-sheds/` | Real example of deployed app |
| `apps/rakim/` | Reference CF deployment (simpler) |
| `packages/crouton-cli/bin/crouton-generate.js` | CLI entry point (Commander.js) |
| `packages/crouton-cli/lib/generate-collection.mjs` | Main generator (~74KB) |
| `docs/guides/app-launch-guide.md` | Step-by-step guide + launch log |

## Also Fix in Generator

These should be addressed regardless of the scaffold command:

1. **Missing i18n locale files** — when generator adds `i18n` config to layer nuxt.config, also create empty `{layer}/i18n/locales/{en,nl,fr}.json`
2. **Duplicate config keys** — check for existing `croutonCollections` before appending
3. **Dependency pre-flight** — warn/auto-install missing deps (e.g., crouton-i18n for translatable fields) before generation starts

## Estimated Effort

| Task | Size |
|------|------|
| `scaffold-app` command | Medium (new generator, ~200 LOC) |
| `deploy` script | Small (shell script, ~80 LOC) |
| Generator locale fix | Small (~20 LOC in nuxt-config.mjs) |
| Generator duplicate key fix | Small (~10 LOC in generate-collection.mjs) |
| Dep pre-flight improvement | Small (~30 LOC, already partially exists) |
