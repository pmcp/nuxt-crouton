# pocs/blog

A crouton POC for a blog/content app. Scaffolded empty (#275, epic #274) — app
workstreams build content collections + admin surfaces on top of this baseline.

## What's wired

- **Storage**: NuxtHub SQLite — `hub: { db: 'sqlite' }` (maps to Cloudflare D1 at
  runtime). Never `database: true`.
- **UI**: Nuxt UI 4 via the `@fyit/crouton` module.
- **Layers**: extends `@fyit/crouton-core`, `@fyit/crouton-auth`, `@fyit/crouton-i18n`.
  (`crouton-core` itself extends `crouton-auth`; it's listed explicitly so the auth
  layer is a first-class dependency of this POC.)
- **Auth-gated admin**: `/admin/**` requires a logged-in session. The admin pages
  come from `crouton-core` (each uses `middleware: ['auth', ...]`); `app/pages/admin/index.vue`
  adds a bare `/admin` landing that the `auth` middleware gates and that forwards
  authenticated users to `/admin/<team>/translations`.
- **Deploy (#278)**: `wrangler.jsonc` is an id-less auto-provisioning Workers config
  with an `env.staging` block on `blog.pmcp.dev`. CI deploys staging via
  `.github/workflows/deploy-blog.yml` — a thin caller of the reusable `deploy-app.yml`
  (`workspace: pocs`), triggered by a push to `staging` (path-filtered to `pocs/blog/**`)
  or a manual `workflow_dispatch`. The real deploy runs only on a machine with the
  `CLOUDFLARE_ACCOUNT_ID` + `CLOUDFLARE_API_TOKEN` repo secrets; CI posts the
  `https://blog.pmcp.dev` URL. `scripts/sync-wrangler-ids.mjs` + `inject-wrangler-env.mjs`
  are the standard Workers deploy helpers (copied from `apps/velo`).
- **Seed admin**: `scripts/seed.ts` provisions a known admin (`admin@blog.pmcp.dev` /
  `Admin1234!`) so a fresh preview is testable with auth — better-auth `user` +
  credential `account` (scrypt hash via `better-auth/crypto`) + the `blog` `organization`
  + an owner `member`, all idempotent (stable `seed:*` ids). `cf:staging` runs
  `db:seed:staging` after the remote migrate.

## Commands

```bash
pnpm --filter pocs-blog dev          # local dev (port 3014)
pnpm -r --filter './apps/*' typecheck # repo-wide typecheck (this app is filtered in too)
pnpm --filter pocs-blog cf:staging   # deploy a staging preview (see /poc-deploy)
pnpm --filter pocs-blog db:seed      # seed the admin into the local D1
pnpm --filter pocs-blog db:seed:staging # seed the admin into the remote staging D1
```

Admin login (after seed): `admin@blog.pmcp.dev` / `Admin1234!`.

## Adding collections

Use the `crouton` CLI (schema JSON → `crouton config`), then register the generated
config in `app/app.config.ts` under `croutonCollections`. See the root `crouton` skill.
