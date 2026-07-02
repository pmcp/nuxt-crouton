---
name: crouton-build-and-env
layer: stack
description: Recreate the nuxt-crouton dev environment from scratch and survive its install/build traps — the pnpm toolchain, the cold-start sequence (why packages must build before apps prepare), the version catalog and workaround pins, the per-app typecheck rule, required env vars, and the known environment traps. Use when setting up a fresh clone/worktree, when "pnpm install" or "nuxt prepare" fails, when an app won't boot after install, when typecheck output looks insane, or when a tool "isn't available". Trigger phrases: "set up the repo from scratch", "why does typecheck show thousands of errors", "playwright install fails", "what pnpm/node version". (Exact error strings — "Could not load '@fyit/crouton'", "Cannot find module '@vue/compiler-sfc'" — route via crouton-diagnostics-index first; it points back here for depth.)
---

# crouton-build-and-env

Recreate this monorepo's dev environment from zero, and don't lose an hour to any of its known install/build traps.

## When to use / when NOT to use

| You want | Go to |
|---|---|
| Fresh clone → working env; install/build/typecheck failures; env-var setup; "tool missing" claims | **this skill** |
| Boot an app with auth working, seed a DB, inspect data, observe deployed apps | sibling `crouton-run-and-operate` |
| Symptom → root-cause lookup across the whole stack | sibling `crouton-diagnostics-index` |
| Bump/update dependencies | `dependency-sweep` skill (this skill only explains *why* the pins exist) |
| Deploy, CI workflow anatomy, secrets | sibling `crouton-ci-and-deploy-map` + `/deploy` skill |
| Run the Playwright fixture smoke | `e2e-smoke` skill |
| What crouton *is* (layers, registries, invariants) | sibling `crouton-architecture-contract` |

## 1. Toolchain

| Tool | Version | Source of truth |
|---|---|---|
| pnpm | **10.15.1** (exact, sha512-pinned) | `packageManager` in root `package.json` — ALWAYS use pnpm, never npm/yarn |
| Node | **No repo-wide pin.** No `.nvmrc`, no root `engines`. CI uses `node-version: '20'` (`.github/workflows/ci.yml`); the Claude sandbox runs v22. Eight `packages/*` declare `engines: node >=18.0.0` (crouton-admin, -atelier, -auth, -cli, -designer, -email, -mcp-toolkit, -mcp) — the loosest bound | practice: anything ≥20 works |
| Native builds | pnpm builds ONLY `better-sqlite3` (`onlyBuiltDependencies`); `@prisma/client, es5-ext, esbuild, sharp, unrs-resolver, vue-demi` are deliberately in `ignoredBuiltDependencies` (they ship prebuilt binaries) | root `package.json` `pnpm` block |
| `.npmrc` | 2 lines: `shamefully-hoist=true`, `public-hoist-pattern[]=unstorage` | repo root |

Workspace globs (`pnpm-workspace.yaml`): `packages/*` (31 packages), `apps/*` (fanfare, triage, velo), `docs`, `pocs/*`, `workers/*`, `fixtures/*`, `sandboxes/*` — plus a **stale `examples/*` glob (directory doesn't exist; harmless)**.

## 2. Cold start (fresh clone → apps can boot)

```bash
pnpm install            # workspace-wide
pnpm build:packages     # = pnpm -r --filter './packages/*' build — MANDATORY before any app boots
pnpm typecheck          # verify: = pnpm -r --filter './apps/*' typecheck
```

This is exactly what the SessionStart hook (`.claude/hooks/session-start.sh`) does on Claude-web sessions (`CLAUDE_CODE_REMOTE=true`); local sessions must run it themselves.

**Why `build:packages` is mandatory — the dist-consumption model.** Of the 31 `packages/*`, most are consumed as *source* Nuxt layers (no build), but **13 have build scripts** and some of their exports only resolve into `dist/`:

- `@fyit/crouton` (`packages/crouton`) is **fully dist-consumed**: `"main": "./dist/module.mjs"`, exports only `./dist/module.{mjs,d.ts}`. No dist → the module is unresolvable.
- `@fyit/crouton-core` is **mixed**: `"main": "./nuxt.config.ts"` (source layer), but its `./app/composables/*` and `./server/database/schema/*` subpath exports resolve into `./dist/` — apps error on a missing `crouton-core/dist`.
- The full build-script set: unbuild — `crouton, crouton-core, crouton-auth, crouton-ai, crouton-bookings, crouton-devtools, crouton-feedback, crouton-mcp-toolkit, crouton-printing, crouton-sales, crouton-triage`; `nuxt build` — `crouton-flow`; `tsc` — `crouton-mcp`.

**The guarded-postinstall trap** is owned by root CLAUDE.md ("New App `postinstall` Must Be Guarded") — read it there. Delta facts verified here: every app/poc/fixture uses `"postinstall": "nuxt prepare 2>/dev/null || true"` (copy from `apps/velo/package.json`); the failure it prevents is exactly the fresh-install ordering above (unbuilt dist → bare `nuxt prepare` → `Could not load '@fyit/crouton'` → whole install aborts).

**CI's alternative to the guard** (`.github/workflows/ci.yml`): `pnpm install --frozen-lockfile --ignore-scripts`, then build only the app's transitive workspace deps with `pnpm --filter "fanfare^..." build` (the `^...` suffix selects dependencies, excluding the app itself), then an explicit `npx nuxt prepare` inside the app. Use this pattern when you need a minimal, deterministic bootstrap of one app.

**Build-scope gotcha:** root `pnpm build` = `pnpm -r --filter '!./pocs/**' build` — it builds fixtures/sandboxes/workers/docs too. `pnpm build:packages` is the safe minimal bootstrap.

## 3. The version catalog and the pins

Shared versions live in the `catalog:` block of `pnpm-workspace.yaml` (single source of truth, #142) — packages reference them as `"dep": "catalog:"`. Cataloged today: `nuxt ^4.4.8, vue ^3.5.38, vue-router ^5.1.0, typescript ^5.7.0, wrangler ^4.101.0, @libsql/client ^0.17.4, drizzle-orm ^0.45.2, drizzle-kit ^0.31.10, @nuxt/ui ^4.9.0`. Per the in-file comment: `vitest`/`@vitest/coverage-v8`/`happy-dom` and `@nuxt/kit|schema` are **intentionally NOT cataloged** (version spreads need a real migration, #141).

Root `package.json` `pnpm.overrides` — do NOT loosen these outside the `dependency-sweep` flow:

| Override | Pin | Why |
|---|---|---|
| `vue`, `nuxt`, `@nuxt/schema`, `@nuxt/ui`, `@nuxt/devtools(-kit)` | caret ranges | force one framework version across the workspace |
| `@tiptap/core`, `@tiptap/pm`, `@tiptap/vue-3` | **3.27.0 exact** | must match the tiptap version `@nuxt/ui` bundles, or the editor gets two tiptap instances — see #140/#141; #235 shows the pin being re-floored on a `@nuxt/ui` bump |
| `unimport` | **4.1.1 exact** | workaround pin — rationale not recoverable from the shallow clone (unverified); treat as deliberate |
| `youch` | **4.1.0-beta.13 exact** | same: workaround pin, rationale unverified |
| `zod` | **4.2.1 exact** | same: workaround pin, rationale unverified |

## 4. The typecheck story

```bash
pnpm typecheck              # = pnpm -r --filter './apps/*' typecheck  (each app runs its own `nuxt typecheck`)
pnpm typecheck:fixtures     # same for fixtures/*
```

**Why per-app and never from root:** each app's `tsconfig.json` is just `{"extends": "./.nuxt/tsconfig.json"}` — the config Nuxt *generates* into `.nuxt/` with that app's aliases and auto-imports. `npx nuxt typecheck` from the repo root has no app context, so every auto-import and `#`-alias is unresolved → **thousands of false positives** (missing `defineNuxtConfig`, unresolvable `#imports`, etc.). The rule itself is root CLAUDE.md's; the mechanics above are the why.

Known deltas (verified 2026-07-02):

- Root script `typecheck:mcp` matches nothing (stale package name) — use `pnpm --filter @fyit/crouton-mcp typecheck` instead. The why + the full inventory of these stale-name silent no-ops (incl. the `.claude/settings.json` MCP path) is owned by sibling `crouton-config-registry` § "Silent no-ops".
- CLAUDE.md says "EVERY change requires `pnpm typecheck`", but CI does **not** run the full app sweep — it typechecks only `@fyit/crouton-mcp` and build-smokes fanfare, whose typecheck is *intentionally ungated* ("known pre-existing baseline of type errors", comment in `ci.yml`). So the full-sweep rule is enforced by agent discipline, not CI. Trust order: AGENTS.md > root CLAUDE.md > CI reality; run the sweep yourself.

## 5. Env vars

| Var | Needed for | Notes |
|---|---|---|
| `BETTER_AUTH_SECRET` | any app using `crouton-auth` (velo, fanfare, fixtures…) | ≥32 chars. On Claude-web the SessionStart hook generates one (`openssl rand -hex 32`), caches at `~/.crouton-dev-auth-secret`, exports via `CLAUDE_ENV_FILE`. Locally: set it yourself or copy `.env.example` |
| `BETTER_AUTH_URL` | cookie-correct auth | `.env.example` hardcodes `http://localhost:3000`, but apps run on fixed ports (velo `devServer.port: 3006`, triage 3005, fanfare 3007) — set it to the app's real port. Boot details: sibling `crouton-run-and-operate` |
| `E2E_FIXTURE`, `BETTER_AUTH_SECRET=dev`, `BETTER_AUTH_URL=http://localhost:3000` | `pnpm test:e2e` | fixtures all run on :3000; mechanics in the `e2e-smoke` skill |
| `CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_API_TOKEN` | anything touching remote D1/Workers | not present in the chat sandbox — remote CF ops run in CI (see `remove-app`, `db-clone` skills) |
| `HTTPS_PROXY` (+ CA `/root/.ccr/ca-bundle.crt`) | sandbox egress | preconfigured; never disable TLS or unset it |

Fixtures commit a dummy `.env` on purpose (`BETTER_AUTH_SECRET=dev-fixture-secret-...`) so they boot with zero setup.

## 6. Known env traps (checklist before you debug)

| Symptom | Reality | Fix |
|---|---|---|
| `Could not load '@fyit/crouton'` during install/prepare | dist packages not built yet (§2) | `pnpm build:packages`, then retry |
| `npx playwright install` fails → "no browser" | only the *download host* is egress-blocked; chromium IS pre-installed under `/opt/pw-browsers/` | use `node scripts/app-shots.mjs` (auto-globs the build) or `PLAYWRIGHT_CHROMIUM_PATH`/`PW_EXECUTABLE_PATH`; never hardcode a build number. Doctrine + the #629 incident: sibling `crouton-harness-observability` §5 |
| `Cannot find module '@vue/compiler-sfc'` from typecheck after a dep bump | stale/unhoisted node_modules, NOT a real error (the #424 "rule out non-code causes" class) | `rm -rf node_modules && pnpm install` — mechanics owned by the `dependency-sweep` skill |
| Thousands of typecheck errors | you ran `nuxt typecheck` outside an app dir (§4) | `pnpm typecheck` from root |
| Native dep misbehaving after install | its build script was skipped by policy (§1) | check `onlyBuiltDependencies` / `ignoredBuiltDependencies` before debugging the dep |
| "Cannot resolve entry module .nuxt/hub/db/schema.entry.ts" | app used `hub: { database: true }` | must be `hub: { db: 'sqlite' }` (root CLAUDE.md gotcha) |
| `git log -S` / `blame` hits a wall at one boundary commit | **the sandbox clone is shallow** (`git rev-parse --is-shallow-repository` → true); pickaxe attributes everything to the boundary merge | for real archaeology use GitHub (MCP `search_commits` / `list_commits`) or note the limit — don't cite the boundary commit as the origin |
| A prior session claims tool X is unavailable | claimed limitations are hypotheses (root CLAUDE.md "verify capabilities") | 5-second probe (e.g. `ls /opt/pw-browsers`) before designing around it |

## Known drift in this area (verified 2026-07-02)

- Root CLAUDE.md's "Development Commands" lists `pnpm dev` — **no root `dev` script exists**; use `pnpm --filter <app> dev`.
- `pnpm-workspace.yaml` `examples/*` glob: no such directory.
- `typecheck:mcp` filter + `.claude/settings.json` MCP path: stale `nuxt-crouton-mcp-server` name (§4).
- `scripts/deploy-app.sh` still says Cloudflare *Pages* + `wrangler.toml` — superseded; use the `/deploy` skill (sibling `crouton-ci-and-deploy-map`).

Where docs disagree, trust order: see `crouton-docs-trust-map` §1.

## Provenance and maintenance

Facts verified 2026-07-02 against the working tree at commit `c81bdb0`: root `package.json` (scripts, overrides, packageManager), `pnpm-workspace.yaml`, `.npmrc`, `.github/workflows/ci.yml`, `.claude/hooks/session-start.sh`, `apps/velo/package.json` + `.env.example` + `nuxt.config.ts`, `packages/crouton/package.json`, `packages/crouton-core/package.json`, all 31 `packages/*/package.json` build scripts, `scripts/app-shots.mjs`, `/opt/pw-browsers` listing, `pnpm --version` (10.15.1), `node --version` (v22.22.2), `git rev-parse --is-shallow-repository` (true). Tiptap pin rationale: issues #140/#141/#235 (issue text, trusted with citation). `unimport`/`youch`/`zod` exact-pin rationale: **unverified** (shallow clone blocked archaeology).

Re-verify when drift is suspected:

```bash
node -e "const j=require('./package.json'); console.log(j.packageManager, JSON.stringify(j.pnpm.overrides,null,1))"
grep -A12 '^catalog:' pnpm-workspace.yaml
grep -n 'node-version' .github/workflows/ci.yml | head -3
grep '"postinstall"' apps/*/package.json
for p in packages/*/package.json; do node -e "const j=require('./$p'); if(j.scripts?.build) console.log(j.name, j.scripts.build)"; done
ls /opt/pw-browsers/
```
