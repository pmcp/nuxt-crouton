---
name: crouton-run-and-operate
layer: stack
description: Day-to-day operation runbook for nuxt-crouton apps — boot any app/POC locally with auth working, seed and inspect the local database (including the miniflare-vs-.data split that makes seeded data "disappear"), turn on the review overlay / eruda, observe deployed staging (tail, smoke, row counts), and capture screenshots. Use when asked to "run the app", "boot velo/fanfare/a poc locally", "why can't I log in locally", "seed the database", "the seed data doesn't show up", "look at the local db", "check what's on staging", "screenshot the app", or "where do the artifacts land".
---

# crouton-run-and-operate

Operate a running crouton app — locally or on deployed staging — from cold boot to evidence capture. ("crouton" = this monorepo's schema-driven CRUD framework: `@fyit/crouton-*` packages that generated Nuxt apps extend as layers.)

## When to use / when NOT to use

| You want to… | Use |
|---|---|
| Boot, log in, seed, inspect, observe, screenshot a running app | **this skill** |
| Recreate the environment (install/build traps, typecheck story, versions) | `crouton-build-and-env` |
| Deploy to staging / wire CI / first-time Cloudflare setup | `deploy` (apps), `poc-deploy` (pocs); prod only via `deploy-production` |
| Generate/apply Drizzle migrations, `schema.mjs` gotcha, infra tables | `db-migrations` |
| Mirror one D1 env into another (refresh staging from prod) | `db-clone` |
| Run the Playwright fixture smoke (boot+auth+CRUD proof) | `e2e-smoke` |
| Deploy a preview *for UI sign-off* (the gate workflow) | `ui-proposal` |
| Symptom → root-cause lookup | sibling `crouton-diagnostics-index` |
| Measure the harness itself (context budget, traces) | `loop-station` / sibling `crouton-harness-observability` |

## 1. Boot any app locally from cold, with auth working

Prerequisites (one line — full story in `crouton-build-and-env`): `pnpm install && pnpm build:packages`. Apps consume `@fyit/*` packages from `dist/`; skipping `build:packages` = dev-server error on missing `crouton-core/dist`.

```bash
export BETTER_AUTH_SECRET=$(openssl rand -hex 32)   # required (crouton-auth throws if unset); better-auth only WARNS below 32 chars
pnpm --filter velo dev                              # or: cd apps/velo && pnpm dev
```

- **There is no root `dev` script** (verified: root `package.json` scripts). Root CLAUDE.md's "Development Commands" listing `pnpm dev` only works *inside an app dir* — a known doc contradiction; the app `package.json` is ground truth here.
- On Claude-web sessions the SessionStart hook (`.claude/hooks/session-start.sh`) already did install + `build:packages` and exported a cached dev `BETTER_AUTH_SECRET` (from `~/.crouton-dev-auth-secret`) — check `echo $BETTER_AUTH_SECRET` before generating your own.
- Apps ship `.env.example` (copy to `.env`). Trap: it hardcodes `BETTER_AUTH_URL=http://localhost:3000` but apps run on 3005–3007 — set it to the app's real port or cookies misbehave.
- E2e fixtures (`fixtures/*`) commit a dummy `.env` on purpose (`BETTER_AUTH_SECRET=dev-fixture-secret-do-not-use-in-production`) — they boot with zero env setup.
- **No manual DB step**: `hub: { db: 'sqlite' }` in each app's `nuxt.config.ts` (NuxtHub = the storage abstraction mapping to Cloudflare D1/KV/R2; locally it's a sqlite file) auto-applies all layers' migrations at dev boot. Never `hub: { database: true }` (root CLAUDE.md gotcha).

**Fixed dev ports** (verified from each `nuxt.config.ts` `devServer.port`, 2026-07-02):

| App | Port | | POC | Port |
|---|---|---|---|---|
| apps/triage | 3005 | | pocs/alexdeforce | 3001 |
| apps/velo | 3006 | | pocs/sintlukas | 3003 |
| apps/fanfare | 3007 | | pocs/crouton-builder-demo | 3010 |
| e2e fixtures | 3000 | | pocs/crouton-builder **and** pocs/kvr | **3011 — collision**; run one with `--port` |
| | | | pocs/loop-station | 3021 |

Other pocs (`blog`, `thinkgraph*`, `three-demo`, `booking-demo`) set no port → default 3000/auto-bump.

**First login** (auth = better-auth via `@fyit/crouton-auth`; facts from `e2e/CLAUDE.md`):
- Login/register is a **RouteModal overlay**, not a page — `/auth/login` redirects to `/` and opens the modal (`useAuthModal`). Register a fresh account in the modal on a fresh DB.
- **Signup creates no team.** Programmatically, create one via the better-auth org API: `POST /api/auth/organization/create` then `/set-active` — both **require an `Origin` header** (CSRF). See `ensureTeam()` in `e2e/helpers.ts` for the exact calls. Or seed staff accounts instead (§2).
- Generated collections render at `/admin/{teamSlug}/crouton/{collectionKey}`.
- Session check: `GET /api/auth/get-session` returns the authenticated user (what `smoke-deployed.mjs` uses as login proof).

Do NOT verify with `nuxt preview`: crouton collection pages currently 500 under production-preset SSR — an internal data-fetch loses the auth cookie (`e2e/CLAUDE.md`, open problem). Operate against `nuxt dev`.

## 2. Seeding

**Package demo data** — every app has `db:seed` scripts (verified in all 3 apps' `package.json`):

```bash
pnpm --filter velo db:seed          # = crouton-seed --db velo-db --with-staff (local)
pnpm --filter velo db:seed:staging  # = crouton-seed --db velo-staging-db --remote --with-staff
```

`crouton-seed` (bin: `packages/crouton-cli/bin/crouton-seed.mjs`) discovers `SeedProvider`s from every extended `@fyit/crouton-*` package, emits idempotent upsert SQL, and executes it via `npx wrangler d1 execute <db> --local|--remote`. Flags (verified): `--db` (required) `--remote` `--dir` `--team` (default `test1`) `--locale` (default `nl`) `--with-staff` `--dry-run`. It also seeds the app's default layout: `crouton.layout.json` → a `layout_configs` row with id `default` (#709; `lib/seed-app.ts`).

**⚠️ THE seed-visibility trap (code-derived, not reproduced end-to-end):** a local `crouton-seed` writes via `wrangler d1 execute --local` into `<app>/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite` (miniflare = wrangler's local Cloudflare simulator), but `nuxt dev` with `hub: { db: 'sqlite' }` reads `<app>/.data/db/sqlite.db`. `seed-app.ts` has **no copy step** into `.data/` (verified: only `execFileSync('npx', ['wrangler', 'd1', 'execute', …])` at ~line 307). So locally-seeded data may never appear in the dev app. `crouton db-pull` handles the split explicitly — `lib/db-pull.ts` copies the imported DB to `.data/db/sqlite.db` and marks `_hub_migrations` applied (constants at lines 27–28, copy at ~255). If seeded data "doesn't show up", this split is why; workaround is copying the sqlite file into `.data/db/sqlite.db` by hand (stop dev first).

**App-specific content seeds** (`seedData/` convention): velo keeps CSVs/markdown under `apps/velo/seedData/{school-velotek,velosolidaire}/`, consumed by HTTP endpoints `POST /api/seed` and `POST /api/seed/velosolidaire` (`apps/velo/server/api/seed/*.post.ts` — additive, dedupes users by email, hashes passwords properly). This is the "per-collection seeding" the `db-clone` skill contrasts itself with.

**Pull real remote data local**:

```bash
cd apps/velo && npx crouton db-pull --env staging --dry-run   # then drop --dry-run
```

Flags (verified in `bin/crouton-generate.js` `dbPullCmd`): `--env`, `--config`, `--keep-sql`, `--dry-run`. Flow: export remote D1 → wipe local wrangler D1 → import → copy to `.data/db/sqlite.db`.

## 3. Inspecting the local DB

- File: `<app>/.data/db/sqlite.db` — exists only after dev has run once. Inspect with plain `sqlite3`:
  ```bash
  sqlite3 apps/velo/.data/db/sqlite.db '.tables'
  ```
- **No Drizzle Studio wiring exists in the repo** (verified: zero `db:studio`/`drizzle-kit studio` hits) — but none is needed on a normal dev machine: NuxtHub core itself launches Drizzle Studio as the "Database" tab in Nuxt DevTools during `nuxt dev` whenever `hub.db` is set (`@nuxthub/core` `launchDrizzleStudio()` → `startStudioSQLiteServer`, iframe at `local.drizzle.studio`). It needs a browser + egress to that host, so it's unusable in the headless sandbox — there, raw `sqlite3` is the reality.
- Remote row counts (read-only, safest remote check):
  ```bash
  node scripts/db-counts.mjs --app velo --env staging   # or: pnpm db:counts -- --app velo --env staging
  ```
  Discovers the DB name from the app's `wrangler.jsonc`; a real run needs `CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_API_TOKEN`, `--dry-run` needs neither. (These CF creds are typically absent in the interactive sandbox — remote inspection then goes through CI.)
- Ad-hoc remote SQL: `npx wrangler d1 execute <db-name> [--env staging] --remote --command "SELECT …"`.

## 4. Review overlay and eruda

- **Review overlay** — `NUXT_PUBLIC_CROUTON_REVIEW=true` at **build time** (read in `packages/crouton-devtools/src/module.ts:26`) makes `@fyit/crouton-devtools` install `@fyit/crouton-feedback` (epic #960) with the GitHub sink defaulted: a glasses launcher with Console (eruda), Annotate (pin a comment on an element → resolves the source file → lands as a `🎯 Preview feedback` PR comment), and Changelog. Generated `cf:staging` scripts bake the flag in; zero prod footprint. The sign-off *workflow* around it belongs to the `ui-proposal` skill.
- **Eruda mobile devtools layer** — opt-in per app: `extends: ['@fyit/crouton-devtools/eruda']`, active in local dev or when `NUXT_PUBLIC_CROUTON_ERUDA=true` at build (verified in `packages/crouton-devtools/eruda/nuxt.config.ts`; default off, chunk never fetched in prod). Set the flag in `cf:staging` only, never `cf:deploy`.

## 5. Observing deployed staging

Deploy/migrate mechanics live in the `deploy` skill — this is the *watching* side.

| Need | Command | Caveat |
|---|---|---|
| Live Worker logs | `pnpm --filter triage logs` / `--filter fanfare logs` (= `npx wrangler tail triage\|fanfare`) | Only triage + fanfare have a `logs` script, and both tail the **production** worker. No staging tail script exists anywhere (verified); hand-run `npx wrangler tail <app>-staging` (unverified against a live worker — needs CF creds). No log persistence: an error nobody was tailing is gone. |
| Prove a deployed preview works | `node scripts/smoke-deployed.mjs --url https://<app>.pmcp.dev --email <e> --password <pw> [--app <n>] [--manifest <app>/deploy.config.json]` | Login proof via `/api/auth/get-session` → optional CRUD round-trip (from `deploy.config.json` `smoke.crud`) → screenshot `screenshots/<app>-smoke.png`. CI runs it per deploy, report-only unless `smoke.required: true`. |
| Seed a loginable review account on a deploy | `node scripts/seed-review-login.mjs --url <deployedUrl> --email <e> --password <pw>` | Uses the app's own HTTP auth routes (real password hashing); best-effort. |
| What's in the staging DB | `node scripts/db-counts.mjs --app <app> --env staging` | §3. |

No runtime analytics is wired in any deployed app as of 2026-07-02: `packages/crouton-analytics` exists but no app/poc/fixture depends on it (unverified beyond a grep of `package.json`s — from the #1073 discovery sweep; adapters were in-flight, #947).

## 6. Screenshots

```bash
node scripts/app-shots.mjs <baseUrl> <path[:name]> [more paths...] [--out <dir>]
# e.g. node scripts/app-shots.mjs http://localhost:3006 /:home /auth/login:login
```

(Also `pnpm app:shots`.) Writes `screenshots/<name>.png`; exits 1 on any failure. It auto-resolves the **pre-installed** chromium under `/opt/pw-browsers/` (globs the newest build; override with `PLAYWRIGHT_CHROMIUM_PATH`) — a failing `npx playwright install` does NOT mean "no browser"; doctrine: `crouton-harness-observability` §5. All screenshots go in `screenshots/` at repo root (HARD GATE, root CLAUDE.md).

## 7. Where artifacts land

| Artifact | Location | Committed? |
|---|---|---|
| Local dev DB (NuxtHub) | `<app>/.data/db/sqlite.db` (+ applied-migration copies in `.data/db/migrations/sqlite/`) | No (`.data` gitignored — verified `git check-ignore`) |
| Wrangler-local D1 (miniflare) | `<app>/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite` | No |
| Build output | `<app>/.output/` | No |
| Screenshots | `screenshots/<name>.png` | No (`*.png` gitignored) |
| Drizzle migrations (source of truth) | `<app>/server/db/migrations/sqlite/` | **Yes** |
| e2e outputs | `e2e/.auth/`, `playwright-report/`, `test-results/` | No |

## Provenance and maintenance

Facts verified 2026-07-02 against the repo at `/home/user/nuxt-crouton`: root + app `package.json` scripts, `apps/*/nuxt.config.ts` and `pocs/*/nuxt.config.ts` ports, `packages/crouton-cli/{bin/crouton-seed.mjs,bin/crouton-generate.js,lib/seed-app.ts,lib/db-pull.ts}`, `packages/crouton-devtools/{src/module.ts,eruda/nuxt.config.ts}`, `scripts/{app-shots.mjs,smoke-deployed.mjs,db-counts.mjs,seed-review-login.mjs}` headers, `.claude/hooks/session-start.sh`, `e2e/CLAUDE.md`, `fixtures/minimal/.env`, `git check-ignore`. The NuxtHub Drizzle Studio devtools tab: verified in `@nuxthub/core` dist (`launchDrizzleStudio`/`startStudioSQLiteServer` in `module.mjs`), not exercised live. Source map: the #1073 discovery sweep (operate/build-env reports). Labeled items: the miniflare-vs-`.data` seed split is **code-derived, not reproduced end-to-end**; the staging `wrangler tail` incantation and the analytics-unconsumed claim are **unverified against live infra**.

Re-verify what drifts:

```bash
grep -rn devServer apps/*/nuxt.config.ts pocs/*/nuxt.config.ts        # ports
grep -n '"dev"\|"logs"\|db:seed' apps/*/package.json                   # scripts / tail gap
grep -n 'wrangler\|\.data' packages/crouton-cli/lib/seed-app.ts        # seed write target (has a .data copy step appeared?)
head -20 scripts/app-shots.mjs scripts/smoke-deployed.mjs              # usage lines
grep -n CROUTON_REVIEW packages/crouton-devtools/src/module.ts         # review-overlay gate
```
