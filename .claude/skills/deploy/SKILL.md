---
name: deploy
description: Deploy a crouton app to Cloudflare Pages. Handles first-time setup (create project, D1, KV, secrets) and subsequent deploys. Use when deploying any app in apps/.
allowed-tools: Bash, Read, Grep, Glob, Agent, AskUserQuestion
---

# Deploy Skill

Deploys a crouton app to Cloudflare Pages. Handles both first-time setup and routine deploys.

## Usage

```
/deploy              # Deploy current app (auto-detected from cwd)
/deploy thinkgraph   # Deploy specific app
/deploy velo prod    # Deploy to production
```

## Rules

1. **NEVER deploy without confirming the target app and environment**
2. **NEVER skip `nuxt prepare` before build** — rolldown tsconfig bug
3. **ALWAYS check `wrangler.toml` for TODO placeholders** before deploying
4. **ALWAYS use `NITRO_PRESET=cloudflare-pages`** for the build
5. **NEVER run `hub: { database: true }`** — always `hub: { db: 'sqlite' }`

## Workflow

### Step 1: Detect App

Determine which app to deploy:
- If arg provided: use `apps/{arg}/`
- If cwd is inside an app: use that app
- Otherwise: ask the user

Verify the app exists and has both `wrangler.toml` and `package.json`.

### Step 2: Pre-flight Checks

Run these checks in parallel:

1. **wrangler.toml** — check for `TODO` placeholders in `database_id` or KV `id`
2. **CF stubs** — check `server/utils/_cf-stubs/` exists (required for all DB apps)
3. **Nitro aliases** — check `nuxt.config.ts` has `nitro.alias` for papaparse and passkey stubs
4. **Package scripts** — verify `cf:deploy` script exists, and that `postinstall` is the guarded `nuxt prepare 2>/dev/null || true` (a bare `nuxt prepare` aborts the whole-monorepo install on Cloudflare and fails every app's deploy — see Step 3)
5. **Pages project** — run `npx wrangler pages project list 2>/dev/null | grep {app-name}` to check if the Pages project exists

### Step 3: First-Time Setup (if needed)

If any pre-flight checks fail, guide the user through setup:

#### Missing Cloudflare Resources

```bash
# Create Pages project
npx wrangler pages project create {app-name}

# Create D1 database (if app uses DB)
npx wrangler d1 create {app-name}-db

# Create KV namespace (if app uses KV)
npx wrangler kv namespace create {app-name}-kv
```

Update `wrangler.toml` with returned IDs.

#### Missing CF Stubs

Copy from any existing app (they're identical):
- `server/utils/_cf-stubs/index.ts`
- `server/utils/_cf-stubs/client.ts`

Add nitro aliases to `nuxt.config.ts`:
```typescript
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const cfStubs = resolve(__dirname, 'server/utils/_cf-stubs')

// Inside defineNuxtConfig:
nitro: {
  alias: {
    '@better-auth/passkey/client': resolve(cfStubs, 'client'),
    '@better-auth/passkey': cfStubs,
    'tsyringe': cfStubs,
    'reflect-metadata': cfStubs,
    '@peculiar/x509': cfStubs,
    '@simplewebauthn/server': cfStubs,
    'papaparse': cfStubs
  }
}
```

#### Missing Secrets

```bash
npx wrangler pages secret put BETTER_AUTH_SECRET --project-name {app-name}
```

#### Missing Package Scripts

Add to `package.json`:
```json
{
  "postinstall": "nuxt prepare 2>/dev/null || true",
  "cf:deploy": "NITRO_PRESET=cloudflare-pages nuxt build && npx wrangler pages deploy dist",
  "cf:preview": "NITRO_PRESET=cloudflare-pages CLOUDFLARE_ENV=preview nuxt build && npx wrangler pages deploy dist --branch preview",
  "db:migrate:prod": "npx wrangler d1 migrations apply {app-name}-db --remote"
}
```

> **The `postinstall` guard is mandatory for every app** (`2>/dev/null || true`, never a bare
> `nuxt prepare`). Cloudflare Pages runs `pnpm install` across the **whole monorepo**, which fires
> every app's `postinstall`. A fresh install hasn't built the dist-consumed `@fyit/*` workspace
> packages yet, so a bare `nuxt prepare` errors (`Could not load '@fyit/crouton'`), exits 1, and
> **aborts the entire install — failing the deploy of every other app too** (this is exactly how a
> new app once broke the docs deploy). The guard always exits 0, so a missing local prepare can't
> take the monorepo down; the real prepare/build still runs in the app's own deploy pipeline.

#### Missing GitHub Actions Workflows

Onboarding an app to Cloudflare scaffolds **two** workflows. Always model them on
the existing `deploy-velo.yml` / `deploy-triage.yml` so every app deploys the same way.

**1. Manual / branch deploy — `.github/workflows/deploy-{app-name}.yml`** (staging + prod):
- **Trigger**: `push` to `staging` (paths-filtered) + `workflow_dispatch` with a
  `staging`/`production` environment input.
- **environment**: `${{ inputs.environment || 'staging' }}` — reads the
  `CLOUDFLARE_*` **Environment** secrets.
- **Steps** (the house pattern): cache + build the module packages that match
  `extends` in `nuxt.config.ts` (always `@fyit/crouton-auth`, `@fyit/crouton-core`,
  `@fyit/crouton`) → run D1 migrations (`apply DB --remote` for prod, `--env preview
  --remote` for staging) → `nuxt prepare` → `nuxt build` (`NITRO_PRESET=cloudflare-pages`,
  `NODE_OPTIONS=--max-old-space-size=8192`, `BETTER_AUTH_URL` per env,
  `BETTER_AUTH_SECRET=prerender-placeholder`, `CLOUDFLARE_ENV=preview` for staging) →
  **strip-env step if the app has `[[kv_namespaces]]`** → `wrangler pages deploy dist/
  --commit-dirty=true [--branch staging]`.

**2. Per-PR preview — `.github/workflows/deploy-{app-name}-preview.yml`** (template:
`deploy-fanfare-preview.yml`). Same build/strip mechanics as above, but:
- **Trigger**: `pull_request` (opened/synchronize/reopened), same paths filter;
  `concurrency` per PR with `cancel-in-progress`; `permissions: pull-requests: write`.
- **Secrets**: reads `CLOUDFLARE_*` as **repo-level** Actions secrets (no `environment:`
  block — see the gotcha in "Per-PR Preview Deploys" below) so it works on PR branches
  without environment protection rules.
- **No migrations**: the preview reuses the production D1/KV (seed data present); never
  run migrations from a PR.
- **Deploy**: `wrangler pages deploy dist/ --project-name {app-name} --branch
  "$GITHUB_HEAD_REF"`, then upsert a comment with the `<branch>.{app-name}.pages.dev`
  URL via `actions/github-script`.

Per-workflow variables to set: **paths** (`apps/{app-name}/**` + the app's extended
packages + lockfile + the workflow file), **layer builds** (match `extends`),
**BETTER_AUTH_URL** (app URLs), and the **strip-env step** when the app has KV.

### Step 4: Determine Environment

- If arg provided (`prod`/`production`/`staging`): use that
- Default: `staging`
- Ask the user if unclear

### Step 5: Run Database Migrations (if applicable)

Check if the app has a `db:migrate:prod` script. If so:

```bash
# Production
npx wrangler d1 migrations apply {db-name} --remote

# Staging
npx wrangler d1 migrations apply {db-name} --env preview --remote
```

Check if there are pending migrations first:
```bash
ls server/db/migrations/sqlite/
```

If no migrations directory or it's empty, skip this step.

### Step 6: Build

```bash
cd apps/{app-name}
npx nuxt prepare
NITRO_PRESET=cloudflare-pages npx nuxt build
```

Set env vars:
- `NODE_OPTIONS='--max-old-space-size=8192'`
- `NITRO_PRESET=cloudflare-pages`
- `BETTER_AUTH_SECRET=prerender-placeholder`
- `BETTER_AUTH_URL={app-url}` (staging or production)
- `CLOUDFLARE_ENV=preview` (staging only)

### Step 7: Post-Build Fixups

**Strip env from generated wrangler config** (Wrangler 4.64+ workaround):
```bash
CONFIG="dist/_worker.js/wrangler.json"
if [ -f "$CONFIG" ] && grep -q '"env"' "$CONFIG"; then
  node -e "
    const fs = require('fs');
    const cfg = JSON.parse(fs.readFileSync('$CONFIG', 'utf8'));
    delete cfg.env;
    fs.writeFileSync('$CONFIG', JSON.stringify(cfg, null, 2));
  "
fi
```

### Step 8: Deploy

```bash
# Production
npx wrangler pages deploy dist/ --commit-dirty=true

# Staging
npx wrangler pages deploy dist/ --commit-dirty=true --branch staging
```

### Step 9: Verify

After deploy completes:
1. Report the deployment URL from wrangler output
2. Remind user to check the app in browser
3. Note any post-deploy steps (e.g., seed data, set additional secrets)

## Per-PR Preview Deploys (test on a phone)

To test an app on a real device straight from a PR — without running it locally —
add a preview workflow that deploys every PR to a Cloudflare Pages **preview URL**
and comments the link on the PR. Reference template:
`.github/workflows/deploy-fanfare-preview.yml`.

How it works:
- Trigger: `pull_request` (opened/synchronize/reopened), paths-filtered to
  `apps/{app}/**` + the `crouton*` packages it consumes + lockfile + the workflow.
  `concurrency` per PR with `cancel-in-progress` (newer push cancels older build).
- Build like a normal deploy (build module packages → `nuxt prepare` → `nuxt build`
  with `NITRO_PRESET=cloudflare-pages`), then deploy with a **branch alias**:
  `wrangler pages deploy dist/ --project-name {app} --branch "$GITHUB_HEAD_REF"`.
  Cloudflare publishes it at a stable `<branch>.{app}.pages.dev` host.
- Preview **reuses the production D1 + KV** (bindings come from `wrangler.toml`), so
  seeded test data is present. **Do NOT run migrations on preview** — never mutate
  the prod DB from a PR; the live schema is already current for additive changes.
- Comment the URL on the PR via `actions/github-script` (upsert one marker comment).
  Needs `permissions: pull-requests: write`.

### CI credentials — the gotcha

The job needs **`CLOUDFLARE_ACCOUNT_ID`** + **`CLOUDFLARE_API_TOKEN`** visible to it:
- The per-app **manual** deploy workflows (`deploy-{app}.yml`) declare
  `environment: staging`/`production`, so they read these as **GitHub *Environment*
  secrets**. A `pull_request`-triggered preview job usually has **no `environment:`**,
  so it sees *empty* values and fails at the credential guard.
- **Solo-simple fix (recommended):** add the two as **repo-level** secrets
  (repo → Settings → Secrets and variables → Actions → New repository secret). The
  preview job then reads them with no `environment:` block. Sibling deploys keep their
  environment-scoped copies; the repo-level copies (same values) feed the PR job.
- **If you need protection rules** (reviewers/branch policy on prod), instead create a
  dedicated `preview` GitHub Environment (no protection) with the two secrets and set
  `environment: preview` on the job — keeps PR previews off the staging/production envs.

### Getting the two values

- **`CLOUDFLARE_ACCOUNT_ID`** — Cloudflare dashboard → Workers & Pages → Account ID in
  the right sidebar (also the hex in the dashboard URL). Not secret (appears in URLs).
- **`CLOUDFLARE_API_TOKEN`** — My Profile → API Tokens → **Create Custom Token**,
  permission **Account · Cloudflare Pages · Edit**, scoped to your account. Cloudflare
  shows a token's value **only once at creation**, and GitHub never reveals a saved
  secret — so you **cannot copy an existing token** from either side. Mint a fresh,
  dedicated token rather than trying to reuse one (don't *roll* an in-use token — that
  breaks whatever currently uses it).

The Pages project must exist first: `npx wrangler pages project create {app} --production-branch main`.

## Troubleshooting

### `papaparse` RollupError
**Fix:** Add CF stubs + nitro aliases (Step 3).

### `Durable Objects bindings should specify script_name`
**Fix:** Pages requires DOs in a separate Worker. Comment out DO bindings or add `script_name`.

### `[[migrations]] not supported`
**Fix:** Remove `[[migrations]]` from wrangler.toml. D1 migrations are applied separately.

### `Configuration file does not support "env"`
**Fix:** The post-build strip step handles this (Step 7).

### `Project does not exist`
**Fix:** Run `npx wrangler pages project create {app-name}` first.

### Build OOM
**Fix:** Ensure `NODE_OPTIONS='--max-old-space-size=8192'` is set.

## Deploy Learnings Location

Each app's deploy gotchas are documented at:
```
docs/projects/{app-name}/{app-name}-deploy.md
```

After encountering and fixing a new issue, append it to the app's deploy doc.
