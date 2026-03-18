# ThinkGraph Deployment Guide

## Cloudflare Resources

| Resource | Name | ID |
|----------|------|----|
| D1 Database | `thinkgraph-db` | `a370a513-908a-4402-a559-609a79401475` |
| KV Namespace | `thinkgraph-kv` | `7356f04d4f1f44208130654c4de11c44` |
| Pages Project | `thinkgraph` | — |

## First-time Setup

```bash
cd apps/thinkgraph

# 1. Create Pages project (already done)
npx wrangler pages project create thinkgraph

# 2. Create D1 + KV (already done)
npx wrangler d1 create thinkgraph-db
npx wrangler kv namespace create thinkgraph-kv

# 3. Set secrets
npx wrangler pages secret put BETTER_AUTH_SECRET --project-name thinkgraph
```

## Deploy Commands

```bash
# Production
pnpm run cf:deploy

# Preview/staging
pnpm run cf:preview
```

## CI/CD

GitHub Actions workflow: `.github/workflows/deploy-thinkgraph.yml`
- Triggers on push to `staging` branch (paths: `apps/thinkgraph/**`, shared packages)
- Manual dispatch with environment choice (staging/production)
- Monitored via xbar (same `nuxt-crouton` repo)

## Learnings & Gotchas

### 1. papaparse Rollup Error
**Problem:** `RollupError: Expected ',', got 'undefined'` in `papaparse.js` during Cloudflare build.
**Cause:** `papaparse` is a CommonJS package with patterns Rollup can't parse in the Cloudflare preset.
**Fix:** Stub it via `nitro.alias` in `nuxt.config.ts`, same as all other deployed apps. The stub lives at `server/utils/_cf-stubs/`.

### 2. Durable Objects Not Supported in Pages Directly
**Problem:** `wrangler pages secret put` fails with "Durable Objects bindings should specify a script_name".
**Cause:** Pages requires DOs to be defined in a separate Worker, referenced via `script_name`.
**Fix:** Commented out DO bindings in `wrangler.toml`. CollabRoom needs a separate `thinkgraph-collab` Worker if real-time collab is needed.

### 3. [[migrations]] Not Supported in Pages Config
**Problem:** Wrangler rejects `[[migrations]]` blocks in Pages configuration.
**Fix:** Removed from `wrangler.toml`. D1 migrations are applied separately via `wrangler d1 migrations apply`.

### 4. Always `nuxt prepare` Before Build
Per monorepo-wide learning: always run `nuxt prepare` before `nuxt build` in CI to avoid rolldown tsconfig issues.

### 5. Strip `env` from Generated Wrangler Config
Wrangler 4.64+ rejects `env` blocks in redirected configs. The deploy workflow strips it from `dist/_worker.js/wrangler.json` post-build.
