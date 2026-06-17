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
- **Deploy stub**: `wrangler.jsonc` is an id-less auto-provisioning placeholder
  with an `env.staging` block on `blog.pmcp.dev`. The `/poc-deploy` skill generates
  the canonical version; `scripts/sync-wrangler-ids.mjs` + `inject-wrangler-env.mjs`
  are the standard Workers deploy helpers (copied from `apps/velo`).

## Commands

```bash
pnpm --filter pocs-blog dev          # local dev (port 3014)
pnpm -r --filter './apps/*' typecheck # repo-wide typecheck (this app is filtered in too)
pnpm --filter pocs-blog cf:staging   # deploy a staging preview (see /poc-deploy)
```

## Adding collections

Use the `crouton` CLI (schema JSON → `crouton config`), then register the generated
config in `app/app.config.ts` under `croutonCollections`. See the root `crouton` skill.
