# Rakim Deployment

> For the complete deployment guide, see the [General Deployment Documentation](/docs/guides/deployment).

This document covers Rakim-specific deployment details.

## Overview

Rakim deploys to **Cloudflare Pages** with:
- **Database:** Cloudflare D1 (`rakim-db`)
- **Cache:** Cloudflare KV
- **Auth:** Better Auth with email/password and OAuth

## Quick Start

```bash
cd apps/rakim

# First time: Create resources
wrangler d1 create rakim-db
wrangler kv:namespace create KV

# Set secrets
npx wrangler pages secret put BETTER_AUTH_SECRET
npx wrangler pages secret put BETTER_AUTH_URL

# Deploy
pnpm run db:migrate:prod
pnpm run cf:deploy
```

## Rakim-Specific Configuration

### wrangler.toml

```toml
name = "rakim"
compatibility_date = "2024-09-02"
compatibility_flags = ["nodejs_compat"]
pages_build_output_dir = "dist"

[[d1_databases]]
binding = "DB"
database_name = "rakim-db"
database_id = "your-database-id"

[[kv_namespaces]]
binding = "KV"
id = "your-kv-id"
```

### Environment Variables

#### Required

| Variable | Description |
|----------|-------------|
| `BETTER_AUTH_SECRET` | Session encryption (32+ chars) |
| `BETTER_AUTH_URL` | `https://rakim.pages.dev` |

#### Optional (OAuth & Integrations)

| Variable | Description |
|----------|-------------|
| `GOOGLE_CLIENT_ID` | Google OAuth |
| `GOOGLE_CLIENT_SECRET` | Google OAuth |
| `GITHUB_CLIENT_ID` | GitHub OAuth |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth |
| `SLACK_CLIENT_ID` | Slack integration |
| `SLACK_CLIENT_SECRET` | Slack integration |
| `NUXT_ANTHROPIC_API_KEY` | AI features |

## Architecture

```
apps/rakim/
├── nuxt.config.ts        # Nuxt + Cloudflare config
├── wrangler.toml         # D1 + KV bindings
├── server/
│   ├── db/schema.ts      # Drizzle schema
│   └── plugins/auth-init.ts
├── layers/rakim/         # Generated collections
└── .env                  # Local only
```

### Extends Chain

```
rakim
├── @fyit/crouton
├── @fyit/crouton-ai
└── ./layers/rakim
```

## Commands Reference

```bash
# Development
pnpm dev

# Database
pnpm run db:generate        # Generate migrations
pnpm run db:migrate         # Apply locally
pnpm run db:migrate:prod    # Apply to production

# Deployment
pnpm run cf:deploy          # Production
pnpm run cf:preview         # Preview branch
```

## Checklist

### First Deploy
- [ ] `wrangler login`
- [ ] `wrangler d1 create rakim-db`
- [ ] `wrangler kv:namespace create KV`
- [ ] Update `wrangler.toml` with IDs
- [ ] Set `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL`
- [ ] `pnpm run db:migrate:prod`
- [ ] `pnpm run cf:deploy`

### Updates
- [ ] If schema changed: `db:generate` then `db:migrate:prod`
- [ ] `pnpm run cf:deploy`
