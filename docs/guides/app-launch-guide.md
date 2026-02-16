# App Launch Guide

Step-by-step guide for creating and deploying a new crouton app in the monorepo.

## Prerequisites

- **Cloudflare account** with Workers Paid plan (for D1 + KV)
- **Wrangler CLI** installed globally: `npm install -g wrangler` + `wrangler login`
- **pnpm** workspace — app must be registered in the root `pnpm-workspace.yaml`
- **crouton CLI** — `@fyit/crouton-cli` as a devDependency

## Step 1: Scaffold the App

Create the directory structure under `apps/`:

```
apps/{app-name}/
├── package.json
├── nuxt.config.ts
├── crouton.config.js
├── wrangler.toml
├── app.vue
├── app/
│   ├── app.config.ts
│   └── assets/css/main.css
├── server/
│   ├── db/
│   │   ├── schema.ts
│   │   └── translations-ui.ts
│   └── utils/
│       └── _cf-stubs/
│           ├── index.ts
│           └── client.ts
├── schemas/
│   └── *.json
├── .env.example
└── .gitignore
```

### package.json

Key points:
- `"type": "module"` and `"private": true`
- Workspace deps: `@fyit/crouton`, `@fyit/crouton-core`, plus any feature packages
- Dev deps: `@fyit/crouton-cli`, `drizzle-kit`, `wrangler`
- Scripts: `dev`, `build`, `cf:deploy`, `cf:preview`, `db:generate`, `db:migrate`, `db:migrate:prod`

### nuxt.config.ts

Key points:
- `modules: ['@fyit/crouton']`
- `extends:` array with crouton-core + feature packages + local layers
- `hub: { db: 'sqlite', kv: true }` (NEVER use `database: true`)
- `ogImage: { enabled: false }` (saves ~4MB on CF)
- `croutonAuth: { methods: { passkeys: false } }` for CF
- `nitro.preset: 'cloudflare-pages'`
- `nitro.alias` for CF stubs (passkeys/tsyringe/webauthn)

### Cloudflare Stubs

Copy `server/utils/_cf-stubs/` from an existing app (e.g., rakim). These stub out passkey-related packages that are incompatible with CF Workers.

## Step 2: Configure Features

Edit `crouton.config.js`:

```js
export default {
  features: {
    editor: true,     // Rich text editing
    bookings: true,   // Booking system
    pages: true,      // CMS pages
    // ai: { defaultModel: 'claude-sonnet-4-20250514' },
  },
  flags: {
    useMaps: true     // If using maps
  },
  collections: [
    { name: 'locations', fieldsFile: './schemas/location.json', sortable: true, translatable: true },
    { name: 'bookings', fieldsFile: './schemas/booking.json' },
    // ...
  ],
  targets: [
    { layer: 'bookings', collections: ['locations', 'bookings', 'settings'] },
    { layer: 'pages', collections: ['pages'] }
  ],
  dialect: 'sqlite'
}
```

## Step 3: Generate Collections

```bash
cd apps/{app-name}
pnpm crouton generate
```

This creates the `layers/` directory with collections, composables, components, and API routes.

After generation, wire up:

1. **`app/app.config.ts`** — import collection configs and register in `croutonCollections`
2. **`server/db/schema.ts`** — re-export all collection schemas + auth schema + translations-ui

## Step 4: Local Development

1. Create `.env` from `.env.example`:
   ```bash
   cp .env.example .env
   # Fill in BETTER_AUTH_SECRET (32+ chars) and BETTER_AUTH_URL
   ```

2. Generate and apply migrations:
   ```bash
   npx nuxt db generate
   ```
   > **Note**: `npx nuxt db migrate` may fail locally with D1 driver URI errors. The dev server auto-applies pending migrations on first startup, so you can skip the explicit migrate step.

3. Start dev server (auto-applies pending migrations):
   ```bash
   pnpm dev
   ```

4. Verify typecheck:
   ```bash
   npx nuxt typecheck
   ```

## Step 5: Cloudflare Setup

1. Create D1 database:
   ```bash
   npx wrangler d1 create {app-name}-db
   ```

2. Create KV namespace:
   ```bash
   npx wrangler kv:namespace create KV
   ```

3. Update `wrangler.toml` with the IDs from the output above.

## Step 6: Deploy

1. Set secrets:
   ```bash
   npx wrangler pages secret put BETTER_AUTH_SECRET
   npx wrangler pages secret put BETTER_AUTH_URL
   # Add any other secrets (OAuth, API keys, email)
   ```

2. Run production migrations:
   ```bash
   pnpm run db:migrate:prod
   ```

3. Deploy:
   ```bash
   pnpm run cf:deploy
   ```

## Step 7: Post-Deploy

1. **Verify** — hit the deployed URL, check auth flow works
2. **Seed data** — create initial team, admin user, settings
3. **Custom domain** — configure in CF dashboard under Pages > Custom domains
4. **Monitoring** — check CF dashboard for errors/logs

## Cloudflare Gotchas

| Issue | Symptom | Fix |
|-------|---------|-----|
| Passkeys crash | `tsyringe` / `reflect-metadata` errors | Disable passkeys + add CF stubs |
| OG Image too large | Bundle exceeds 25MB worker limit | `ogImage: { enabled: false }` |
| `hub: { database: true }` | `Cannot resolve entry module .nuxt/hub/db/schema.entry.ts` | Use `hub: { db: 'sqlite' }` instead |
| D1 not found | `D1_ERROR: no such table` | Run `db:migrate:prod` before first deploy |
| KV not bound | Runtime error accessing KV | Check wrangler.toml KV namespace ID |
| Bundle size | Build fails with size limit | Disable unused modules (ogImage, AI, etc.) |

## Launch Log

Track each app launch to identify patterns and improve tooling.

| Date | App | Launched By | Difficulties | Learnings | Time |
|------|-----|-------------|-------------|-----------|------|
| 2026-02-16 | bike-sheds | Claude | 1. Missing `@fyit/crouton-i18n` dep — CLI caught it but required re-install. 2. `npx nuxt db migrate` fails with D1 driver URI error — dev server auto-applies migrations instead. 3. Generator creates duplicate `croutonCollections` key in app.config.ts when placeholder exists — needs manual cleanup. | Add crouton-i18n to default deps when collections have translatable fields. For local dev, rely on dev server auto-migration rather than `npx nuxt db migrate`. Start with clean app.config.ts placeholder (no pre-existing keys). | ~15min |
