# pocs/library-catalog

A crouton POC for a library catalog app. Scaffolded empty (#431, epic #428) — app
workstreams build content collections (books, authors, genres, borrowings) + admin
surfaces + catalog browsing UI on top of this baseline.

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
- **Deploy**: `wrangler.jsonc` is an id-less auto-provisioning Workers config
  with an `env.staging` block on `library-catalog.pmcp.dev`. CI deploys staging via
  a thin caller of the reusable `deploy-app.yml` — to be wired in the deploy sub-issue.
  `scripts/sync-wrangler-ids.mjs` + `inject-wrangler-env.mjs` are the standard Workers
  deploy helpers (copied from `pocs/blog`).

## Commands

```bash
pnpm --filter pocs-library-catalog dev          # local dev (port 3015)
pnpm -r --filter './apps/*' typecheck           # repo-wide typecheck (this app is filtered in too)
pnpm --filter pocs-library-catalog cf:staging   # deploy a staging preview (see /poc-deploy)
```

## Adding collections

Use the `crouton` CLI (schema JSON → `crouton config`), then register the generated
config in `app/app.config.ts` under `croutonCollections`. See the root `crouton` skill.
