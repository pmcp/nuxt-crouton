# Apps Directory - AI Context

This directory contains applications built with nuxt-crouton. Each app is a Nuxt application that extends the crouton packages.

## Apps Overview

| App | Description | Deployment Target |
|-----|-------------|-------------------|
| `docs` | Public documentation site | Cloudflare Pages |
| `rakim` | Reference implementation app | Cloudflare Pages + D1 |
| `playground` | Development playground | Local only |
| `test-bookings` | Test app for bookings domain | Local only |
| `test-sales` | Test app for sales domain | Local only |
| `ko-ui` | KO theme demonstration | Local only |
| `schema-designer` | Schema design tool | Local only |
| `theme-playground` | Theme testing | Local only |

## Common App Structure

All nuxt-crouton apps follow this structure:

```
apps/{app-name}/
├── nuxt.config.ts        # Nuxt configuration
├── app.config.ts         # App-level configuration
├── package.json          # App dependencies
├── wrangler.toml         # Cloudflare config (if deployed)
├── app/                  # Application code (Nuxt 4 structure)
│   ├── pages/
│   ├── components/
│   └── composables/
├── server/               # Server routes and API
│   ├── api/
│   ├── db/
│   │   └── schema.ts     # Drizzle schema
│   └── plugins/
├── layers/{app-name}/    # Generated crouton collections
│   └── collections/
└── docs/                 # App-specific documentation
```

## Standard Commands

All apps support these commands:

```bash
# Development
pnpm dev                    # Start dev server

# Database (if using D1/SQLite)
pnpm run db:generate        # Generate migrations
pnpm run db:migrate         # Apply locally
pnpm run db:migrate:prod    # Apply to production

# Deployment (Cloudflare apps)
pnpm run cf:deploy          # Deploy to production
pnpm run cf:preview         # Deploy preview branch

# Quality
npx nuxt typecheck          # TypeScript check (MANDATORY)
pnpm lint                   # Lint code
```

## Nuxt Configuration Pattern

All apps extend the crouton packages:

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  extends: [
    '@fyit/crouton',
    // Optional feature packages:
    '@fyit/crouton-auth',
    '@fyit/crouton-ai',
    '@fyit/crouton-collab',
    '@fyit/crouton-editor',
    // Local generated layer:
    './layers/{app-name}'
  ],

  // NuxtHub configuration (Cloudflare)
  hub: {
    db: 'sqlite',  // CRITICAL: NOT database: true
    kv: true
  },

  // Crouton configuration
  crouton: {
    // Collection-specific settings
  }
})
```

## Deployment

See the [Deployment Guide](/docs/guides/deployment) for detailed instructions on deploying to:
- Cloudflare Pages (recommended)
- Vercel
- Netlify
- Self-hosted

### Quick Cloudflare Deployment

1. **Prerequisites**
   ```bash
   npm install -g wrangler
   wrangler login
   ```

2. **Create Resources**
   ```bash
   wrangler d1 create {app-name}-db
   wrangler kv:namespace create KV
   ```

3. **Configure wrangler.toml**
   ```toml
   name = "{app-name}"
   compatibility_date = "2024-09-02"
   compatibility_flags = ["nodejs_compat"]
   pages_build_output_dir = "dist"

   [[d1_databases]]
   binding = "DB"
   database_name = "{app-name}-db"
   database_id = "your-database-id"

   [[kv_namespaces]]
   binding = "KV"
   id = "your-kv-id"
   ```

4. **Set Secrets**
   ```bash
   npx wrangler pages secret put BETTER_AUTH_SECRET
   ```

5. **Deploy**
   ```bash
   pnpm run db:migrate:prod
   pnpm run cf:deploy
   ```

## Cloudflare Limitations

When deploying to Cloudflare Workers:

| Feature | Status | Workaround |
|---------|--------|------------|
| Passkeys/WebAuthn | Disabled | Use email/password or OAuth |
| OG Image Generation | Optional | Use static OG images |
| Long-running tasks | Limited | Use Queues or Durable Objects |

Configure in `nuxt.config.ts`:
```typescript
croutonAuth: {
  methods: {
    passkeys: false  // Disabled for Cloudflare
  }
}
```

## Creating a New App

1. **Copy from template**
   ```bash
   cp -r apps/playground apps/my-app
   ```

2. **Update package.json**
   ```json
   {
     "name": "my-app",
     "private": true
   }
   ```

3. **Generate collections**
   ```bash
   cd apps/my-app
   pnpm crouton generate
   ```

4. **Start development**
   ```bash
   pnpm dev
   ```

## Environment Variables

### Required (Production)

| Variable | Description |
|----------|-------------|
| `BETTER_AUTH_SECRET` | Session encryption (32+ chars) |
| `BETTER_AUTH_URL` | Production URL |

### Optional

| Variable | Description |
|----------|-------------|
| `GOOGLE_CLIENT_ID` | Google OAuth |
| `GOOGLE_CLIENT_SECRET` | Google OAuth |
| `GITHUB_CLIENT_ID` | GitHub OAuth |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth |
| `NUXT_ANTHROPIC_API_KEY` | AI features |

### Local Development

Create `.env` in the app directory:
```bash
BETTER_AUTH_SECRET=local-dev-secret-32-chars-minimum
BETTER_AUTH_URL=http://localhost:3000
```

## App-Specific Documentation

Each app may have its own `CLAUDE.md` and `docs/` folder for app-specific context. Check:
- `apps/{app-name}/CLAUDE.md` - AI context
- `apps/{app-name}/docs/` - App documentation
- `apps/{app-name}/README.md` - Quick start

## Development Workflow

1. **Before starting**: Read the app's `CLAUDE.md` if it exists
2. **Make changes**: Follow Nuxt UI 4 patterns
3. **Type check**: `npx nuxt typecheck` (MANDATORY)
4. **Test locally**: `pnpm dev`
5. **Deploy**: Follow deployment checklist

## Key Reminders

- Always use `hub: { db: 'sqlite' }` not `hub: { database: true }`
- Run `npx nuxt typecheck` after every change
- Use Composition API with `<script setup lang="ts">`
- Check the main `CLAUDE.md` at repo root for full conventions
