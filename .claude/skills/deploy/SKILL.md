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
4. **Package scripts** — verify `cf:deploy` script exists in `package.json`
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
  "cf:deploy": "NITRO_PRESET=cloudflare-pages nuxt build && npx wrangler pages deploy dist",
  "cf:preview": "NITRO_PRESET=cloudflare-pages CLOUDFLARE_ENV=preview nuxt build && npx wrangler pages deploy dist --branch preview",
  "db:migrate:prod": "npx wrangler d1 migrations apply {app-name}-db --remote"
}
```

#### Missing GitHub Actions Workflow

Generate `.github/workflows/deploy-{app-name}.yml` based on the standard template.

Key variables:
- **paths**: `apps/{app-name}/**` + all extended packages from `nuxt.config.ts`
- **layer builds**: match the `extends` in `nuxt.config.ts`
- **BETTER_AUTH_URL**: app-specific production/staging URLs
- **Strip env step**: include if app has `[[kv_namespaces]]` in wrangler.toml

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
