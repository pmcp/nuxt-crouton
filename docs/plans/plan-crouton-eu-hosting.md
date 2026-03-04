# Crouton EU Hosting & Deploy Plan

## Summary

Ship crouton with deployment templates, CLI commands, and documentation so users can self-host on EU infrastructure. Not replacing Cloudflare — adding VPS as a documented, EU-sovereign alternative. NuxtHub v0.10 handles provider abstraction (confirmed — auto-detects S3/Redis from env vars), crouton provides the deployment scaffolding and CLI tooling.

**Related**: The [email refactor plan](./plan-crouton-email-refactor.md) enables EU email providers (Mailgun EU, Brevo, Scaleway) for VPS deployments.

---

## Codebase Alignment (verified against repo)

### What already works
- **NuxtHub v0.10 multi-vendor**: Confirmed. S3 blob (`aws4fetch`), Redis KV/cache (`ioredis`), libsql SQLite all supported. Auto-detects from env vars — no nuxt.config changes needed between Cloudflare and VPS.
- **Database access**: Codebase already migrated to `hub:db` auto-imports (`useDB()`). Only 2 legacy `hubDatabase()` calls remain in `crouton-auth/server/utils/team.ts` — trivial fix.
- **Schema directories**: No rename needed. Packages use `server/database/schema/`, apps aggregate via `server/db/schema.ts`. Both patterns work with NuxtHub v0.10.
- **Generator templates**: Already emit `useDB()`, not `hubDatabase()`. No changes needed.
- **Package scope**: `@fyit/*` throughout. No migration in progress.

### What needs fixing (small)
- `crouton-auth/server/lib/auth.ts`: `CreateAuthOptions.db` typed as `DrizzleD1Database` — change to generic drizzle type (~1 line)
- `crouton-auth/server/utils/team.ts`: 2x `hubDatabase()` + `drizzle(d1)` calls — replace with `useDB()` (~10 lines)
- `crouton-triage/server/services/userMapping.ts`: 2x `useDrizzle()` calls — dead code, function no longer exists (~2 lines)
- `@nuxthub/core` peer deps: Inconsistent across packages. Should declare `peerDependencies: ">=0.10.0"` in packages that use `hub:db`. Cleanup task, not a blocker.

### VPS Compatibility Matrix

| Package | VPS | Cloudflare | Notes |
|---------|-----|------------|-------|
| crouton-core | Yes | Yes | Foundation — works everywhere |
| crouton-auth | Yes | Yes | Passkeys work natively on VPS (no CF stubs needed) |
| crouton-bookings | Yes | Yes | Email scheduling needs `node-server` preset |
| crouton-email | Yes | Yes | SMTP driver only available on VPS (`node-server`) |
| crouton-i18n | Yes | Yes | |
| crouton-pages | Yes | Yes | |
| crouton-assets | Yes | Yes | Blob via S3 on VPS |
| crouton-ai | Yes | Yes | |
| crouton-maps | Yes | Yes | |
| crouton-collab | No | Yes | Requires Cloudflare Durable Objects |
| crouton-flow | No | Yes | Depends on crouton-collab (uses CollabRoom DO) |
| crouton-triage | Yes | Yes | KV via Redis on VPS |
| crouton-admin | Yes | Yes | Already uses `hub:db` auto-import |

**Collab/Flow on VPS**: Out of scope for this plan. `CollabRoom` is deeply coupled to Durable Objects (`DurableObjectStorage`, `WebSocketPair`, `state.blockConcurrencyWhile()`, D1 persistence). A y-websocket replacement is a separate project. Document as "Cloudflare-only" for now.

---

## Recommended EU Stack

| Layer | Provider | Location | Cost |
|---|---|---|---|
| Compute | Hetzner VPS (CX22: 2 vCPU, 4GB) | Germany | €3.49/mo |
| Database | SQLite on disk (libsql) | On VPS | Free |
| DB Backups | Nitro task → Hetzner Object Storage | Germany | Included |
| Blob Storage | Hetzner Object Storage (S3-compatible) | Germany | €4.99/mo |
| KV + Cache | Redis (on VPS) | On VPS | Free |
| Email | Mailgun EU / Brevo / Scaleway (see [email plan](./plan-crouton-email-refactor.md)) | EU | Varies |
| CDN | Bunny.net (optional) | Slovenia | ~€1/mo |
| AI | Mistral API (optional) | France | Pay-as-you-go |
| Analytics | Plausible (optional) | Estonia | Self-host or €9/mo |
| **Total** | | **All EU** | **~€8.50/mo** |

Multiple crouton projects run on a single VPS. Each gets its own domain, SQLite file, and Caddy route. They share Redis and Object Storage.

---

## Architecture

```
Hetzner VPS
├── Caddy (reverse proxy, auto SSL)
│   ├── app1.example.com → :3001
│   ├── app2.example.com → :3002
│   └── app3.example.com → :3003
├── Nuxt apps (node-server preset)
│   ├── NuxtHub v0.10 (db, blob, kv, cache — auto-configured from env vars)
│   └── Nitro scheduled tasks (email reminders, backups)
├── Redis (shared across apps)
├── SQLite files on disk (per app, at .data/db/sqlite.db)
└── Nitro backup task → Object Storage

Hetzner Object Storage (1TB included)
├── Blob storage (user uploads, per app prefix)
└── SQLite backups (per app prefix)
```

**Primary path: Bare Node + Caddy.** No Docker files exist in the repo. Crouton users are Nuxt devs, not DevOps people. Docker Compose is the documented advanced option.

**Backups: Nitro scheduled task.** Simpler than Litestream, zero extra infrastructure, uses NuxtHub's `blob.put()` to stay provider-agnostic.

---

## NuxtHub v0.10 Configuration

**Key insight**: The nuxt.config.ts doesn't change between Cloudflare and VPS. NuxtHub auto-detects drivers from environment variables. Only the `.env` file differs.

```ts
// nuxt.config.ts — same for Cloudflare AND VPS
export default defineNuxtConfig({
  hub: {
    db: 'sqlite',   // Cloudflare: D1 via wrangler bindings. VPS: libsql at .data/db/sqlite.db
    blob: true,      // Cloudflare: R2 via bindings. VPS: auto-detects S3_* env vars
    kv: true,        // Cloudflare: KV via bindings. VPS: auto-detects REDIS_URL env var
    cache: true,     // Cloudflare: KV via bindings. VPS: auto-detects REDIS_URL, falls back to fs
  },
})
```

```bash
# .env (VPS only — Cloudflare uses wrangler bindings instead)
S3_ACCESS_KEY_ID=xxx
S3_SECRET_ACCESS_KEY=xxx
S3_BUCKET=my-app
S3_REGION=eu-central-1
S3_ENDPOINT=https://fsn1.your-objectstorage.com
REDIS_URL=redis://localhost:6379
BETTER_AUTH_SECRET=xxx
BETTER_AUTH_URL=https://myapp.example.com
```

**Required packages for VPS**: `pnpm add aws4fetch ioredis`

Note: `crouton-core` already configures `hub: { db: 'sqlite' }` and forces `blob: true` via the `ensure-hub-blob` module. Apps only need to add `kv: true` and `cache: true` if they use those features. `crouton-triage` requires KV for Slack OAuth state storage.

---

## Deploy Paths

### Path A: Bare Node + Caddy (primary)

No Docker. Just Node and Caddy on the VPS.

```bash
# On server
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt install -y nodejs caddy

# Deploy
pnpm build
node .output/server/index.mjs
```

Caddyfile:
```
app.example.com {
    reverse_proxy localhost:3000
}
```

Systemd service to keep it running:
```ini
[Unit]
Description=My Crouton App
After=network.target

[Service]
Type=simple
User=deploy
WorkingDirectory=/opt/apps/my-app
ExecStart=/usr/bin/node .output/server/index.mjs
Restart=always
EnvironmentFile=/opt/apps/my-app/.env

[Install]
WantedBy=multi-user.target
```

### Path B: Docker Compose (advanced)

```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - REDIS_URL=redis://redis:6379
      - S3_ENDPOINT=${S3_ENDPOINT}
      - S3_BUCKET=${S3_BUCKET}
      - S3_ACCESS_KEY_ID=${S3_ACCESS_KEY_ID}
      - S3_SECRET_ACCESS_KEY=${S3_SECRET_ACCESS_KEY}
    volumes:
      - app-data:/app/.data
    depends_on:
      - redis
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redis-data:/data
    restart: unless-stopped

  caddy:
    image: caddy:2-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy-data:/data
    restart: unless-stopped

volumes:
  app-data:
  redis-data:
  caddy-data:
```

Dockerfile:
```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/.output .output
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
```

### Path C: Cloudflare (existing)

Already configured and working. Deploy via GitHub CI + `wrangler pages deploy`. `wrangler.jsonc` files exist in all deployed apps (`crouton-playground`, `velo`, `thinkgraph`, `docs`). This stays the easiest path — no changes needed.

**Note**: Coolify is an option for users who want a UI to manage their Hetzner VPS, but it's not a supported deploy path — just a mention in the docs.

---

## Multi-Project on One VPS

This is a killer feature vs Cloudflare (per-project billing). One Hetzner CX22 runs 6-8 crouton projects for €8.50 total.

**Note**: This is about running *different crouton projects* on one VPS. Multi-tenancy (multiple teams/organizations) is already built into every crouton app via the `[team]` route parameter and `useTeamContext()`.

Start with single-project templates. Document multi-project as an "advanced" section.

Caddyfile for multi-project:
```
app1.example.com {
    reverse_proxy localhost:3001
}

app2.example.com {
    reverse_proxy localhost:3002
}
```

Each project gets its own:
- Port (3001, 3002, 3003...)
- SQLite file (`/opt/apps/app1/.data/db/sqlite.db`)
- `.env` file
- Systemd service

They share:
- Redis instance
- Object Storage bucket (different key prefixes)
- Caddy reverse proxy

---

## Nitro Scheduled Tasks

Two documented recipes — not shipped in crouton-core, since backup is VPS-only and email scheduling is bookings-specific. Both share the same Nitro task infrastructure.

```ts
// nuxt.config.ts — add to your app as needed
nitro: {
  experimental: { tasks: true },
  scheduledTasks: {
    '0 8 * * *': ['email:send-scheduled'],  // daily at 8am — reminders & follow-ups
    '0 * * * *': ['backup:sqlite'],          // hourly — VPS only
  },
}
```

### SQLite Backup Task

```ts
// server/tasks/backup/sqlite.ts
import { readFile } from 'node:fs/promises'

export default defineTask({
  meta: {
    name: 'backup:sqlite',
    description: 'Backup SQLite database to blob storage',
  },
  async run() {
    const dbPath = '.data/db/sqlite.db'
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const key = `backups/${timestamp}.sqlite3`

    const file = await readFile(dbPath)
    await blob.put(key, file, {
      contentType: 'application/x-sqlite3',
    })

    return { result: `Backed up to ${key}` }
  },
})
```

### Email Scheduling Task

For bookings with `reminder_before` and `follow_up_after` triggers:

```ts
// server/tasks/email/send-scheduled.ts
export default defineTask({
  meta: {
    name: 'email:send-scheduled',
    description: 'Send scheduled booking reminder and follow-up emails',
  },
  async run() {
    const db = useDB()
    // Query bookings needing reminders (date = today + daysOffset)
    // Query bookings needing follow-ups (date = today - daysOffset)
    // Match against email templates with matching triggers
    // Send via useEmailService() and log to bookingsEmaillogs
    return { result: `Sent ${count} scheduled emails` }
  },
})
```

---

## CI/CD via GitHub Actions

Existing CI (`.github/workflows/ci.yml`) runs lint, typecheck, tests, and package validation on push/PR to `main`. Deploy workflows exist per app (`.github/workflows/deploy-*.yml`) using `wrangler pages deploy`.

VPS deploy workflow template:
```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install
      - run: pnpm test
      - run: pnpm lint

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install && pnpm build
      - name: Deploy to server
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /opt/apps/my-app
            git pull
            pnpm install
            pnpm build
            sudo systemctl restart my-app
```

---

## CLI Commands

Deploy commands live in the existing CLI at `packages/crouton-cli/` (`@fyit/crouton-cli`), built with **citty** + **@clack/prompts**. This fits naturally — the CLI already handles the full project lifecycle (`scaffold-app` → `generate` → `doctor` → now `deploy`).

**Remote execution**: System `ssh`/`rsync` via `execa`. Leverages the user's existing `~/.ssh/config`, agent forwarding, and keys. Works on macOS, Linux, and Windows 10+ (ships with OpenSSH built-in since 2018). Prerequisite: OpenSSH installed (document this).

**Config storage**: `.crouton/deploy.json` (gitignored), supporting multiple environments:

```json
{
  "defaultEnvironment": "production",
  "environments": {
    "production": {
      "host": "116.203.x.x",
      "user": "deploy",
      "path": "/opt/apps/myapp"
    },
    "staging": {
      "host": "116.203.x.x",
      "user": "deploy",
      "path": "/opt/apps/myapp-staging"
    }
  }
}
```

### Server setup
```bash
npx crouton deploy init                # Interactive: SSH into VPS, install Caddy + Node + Redis
npx crouton deploy setup <app-name>    # Create app dir, Caddyfile entry, .env, systemd service
```

`deploy init` would:
1. Ask for server IP (SSH key assumed from user's config)
2. SSH in and install Node 20 + Caddy + Redis
3. Create a deploy user
4. Set up firewall (80, 443, 22 only)
5. Save connection details to `.crouton/deploy.json`

`deploy setup` would:
1. Create `/opt/apps/<name>/` on the server
2. Generate `.env` from `.env.example`
3. Add Caddyfile entry for the domain
4. Create systemd service
5. Reload Caddy

### Day-to-day deployment
```bash
npx crouton deploy push                    # Build locally + rsync .output + restart service
npx crouton deploy push --env staging      # Deploy to staging
npx crouton deploy logs                    # Tail remote logs via SSH
npx crouton deploy env set KEY=VALUE       # Set env var on server
npx crouton deploy env list                # Show current env vars
```

### Database
```bash
npx crouton db backup                  # Trigger the Nitro backup task
npx crouton db restore <timestamp>     # Download backup from blob storage and replace local DB
npx crouton db download                # Pull remote SQLite to local for debugging
```

### Email (from [email refactor plan](./plan-crouton-email-refactor.md))
```bash
npx crouton email test                 # Send a test email with current driver config
npx crouton email verify-dns           # Check SPF/DKIM/DMARC records for your domain
```

---

## What Crouton Ships

### Templates & Config Files (in `packages/crouton-cli/templates/deploy/`)
- [ ] `Caddyfile` — reverse proxy with auto HTTPS (single-app)
- [ ] `Dockerfile` — multi-stage Node.js build
- [ ] `docker-compose.yml` — app + Redis + Caddy (advanced path)
- [ ] `.env.example` — all required environment variables
- [ ] `systemd/crouton-app.service` — systemd unit template
- [ ] GitHub Actions workflow template

### Documented Recipes
- [ ] `server/tasks/backup/sqlite.ts` — hourly blob storage backup (VPS only)
- [ ] `server/tasks/email/send-scheduled.ts` — daily reminder/follow-up emails (bookings)
- [ ] Restore utility or CLI command

### Documentation
- [ ] Hetzner VPS deploy guide (comprehensive, step-by-step — primary)
- [ ] Cloudflare deploy guide (short, "what's different" — existing path)
- [ ] Generic VPS guide (any provider, same templates)
- [ ] Multi-project guide (advanced topic)
- [ ] Backup & restore guide
- [ ] Email provider DNS setup guide (SPF/DKIM/DMARC per provider)
- [ ] VPS compatibility matrix (which crouton packages work on VPS)

---

## Monorepo Context

| Question | Answer |
|---|---|
| Package scope | `@fyit/*` (confirmed — uniform across all packages) |
| Shared package | `packages/crouton-core/` — NuxtHub config, blob, encryption, CRUD, team context |
| CLI package | `packages/crouton-cli/` — citty + @clack/prompts, lifecycle tooling |
| Config storage | `.crouton/deploy.json` (new, gitignored, multi-environment) |
| Existing Docker | None |
| Existing deploy | Cloudflare Pages via GitHub CI + `wrangler pages deploy` + `wrangler.jsonc` per app |
| Existing CI | `.github/workflows/ci.yml` — lint, typecheck, tests. No deploy step. |
| `@nuxthub/core` | Loaded via crouton-core layer. Most packages don't declare it — should add as `peerDependencies: ">=0.10.0"` |

---

## Trade-offs vs Cloudflare (document honestly)

| | Cloudflare | Hetzner VPS |
|---|---|---|
| Global edge | 300+ PoPs | Single datacenter |
| DDoS protection | Enterprise-grade | Basic (add Bunny CDN for more) |
| Auto-scaling | Unlimited | Manual (resize VPS) |
| Real-time collab | Durable Objects (built-in) | Not supported (yet) |
| Maintenance | Zero | You manage Node + OS updates |
| **Data sovereignty** | **US company** | **EU only** |
| **SQLite** | **Over network (D1)** | **On disk, zero latency** |
| **WebSockets** | **Durable Objects (complex)** | **Native (simple)** |
| **Cron** | **Cron Triggers + wrangler** | **Nitro scheduledTasks, just works** |
| **Passkeys** | **Broken (needs stubs)** | **Native Node.js, just works** |
| **Email** | **HTTP API only (Resend)** | **Any provider (HTTP + SMTP)** |
| **Cost at low scale** | **Free tier** | **~€8.50/mo** |
| **Multiple projects** | **Per-project billing** | **All on one VPS** |

For EU-focused CRUD apps, VPS wins on simplicity, latency, and cost. Cloudflare wins for global distribution, zero-ops, and real-time collaboration.

---

## Tasks

### Phase 0 — Prerequisites
- [ ] Fix `DrizzleD1Database` type in `crouton-auth/server/lib/auth.ts` (~1 line)
- [ ] Replace `hubDatabase()` calls in `crouton-auth/server/utils/team.ts` (~10 lines)
- [ ] Fix dead `useDrizzle()` calls in `crouton-triage` (~2 lines)
- [ ] Email multi-driver refactor (see [email plan](./plan-crouton-email-refactor.md))

### Phase 1 — Templates
- [ ] Create Caddyfile template (single-app)
- [ ] Create systemd service template
- [ ] Create Dockerfile + docker-compose.yml (advanced path)
- [ ] Create .env.example with all VPS env vars
- [ ] Create GitHub Actions deploy workflow template
- [ ] Document backup Nitro task recipe
- [ ] Document email scheduling Nitro task recipe
- [ ] Test full deploy on a fresh Hetzner CX22

### Phase 2 — CLI Commands
- [ ] Add `execa` dependency to crouton-cli
- [ ] `crouton deploy init` — server setup wizard
- [ ] `crouton deploy setup <app>` — per-app setup
- [ ] `crouton deploy push [--env]` — build + rsync + restart
- [ ] `crouton deploy logs` — tail remote logs
- [ ] `crouton deploy env set/list` — manage env vars
- [ ] `crouton db backup` / `restore` / `download`
- [ ] `crouton email test` / `verify-dns`
- [ ] `.crouton/deploy.json` config with multi-environment support

### Phase 3 — Documentation
- [ ] Hetzner VPS deploy guide (primary)
- [ ] Cloudflare deploy guide
- [ ] Generic VPS guide
- [ ] Multi-project guide (advanced)
- [ ] Backup & restore guide
- [ ] VPS compatibility matrix
- [ ] Email provider DNS setup guide

### Phase 4 — Validate
- [ ] Fresh deploy following only the docs
- [ ] Test 3+ projects on one CX22
- [ ] Test backup + restore cycle
- [ ] Test Nitro scheduled tasks (backup + email scheduling)
- [ ] Verify NuxtHub blob driver with Hetzner Object Storage
- [ ] Test email with EU provider on VPS

---

## Server Hardening Checklist (include in docs)

- [ ] SSH key-only auth (disable password login)
- [ ] Hetzner Cloud Firewall (allow 80, 443, 22 only)
- [ ] Unattended upgrades for OS security patches
- [ ] Log rotation (prevent disk fill)
- [ ] Monitoring: Hetzner alerts for CPU/disk, or self-host Uptime Kuma
- [ ] Backup verification: monthly test restore
