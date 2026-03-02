# Crouton EU Hosting & Deploy Plan

## Summary

Ship crouton with deployment templates, CLI commands, and documentation so users can self-host on EU infrastructure. Not replacing Cloudflare/Vercel — adding VPS as a documented, EU-sovereign alternative. NuxtHub v0.10 handles provider abstraction, crouton provides the deployment scaffolding and CLI tooling.

**Related**: The [email refactor plan](./plan-crouton-email-refactor.md) enables EU email providers (Mailgun EU, Brevo, Scaleway) for VPS deployments.

---

## Recommended EU Stack

| Layer | Provider | Location | Cost |
|---|---|---|---|
| Compute | Hetzner VPS (CX22: 2 vCPU, 4GB) | Germany | €3.49/mo |
| Database | SQLite on disk | On VPS | Free |
| DB Backups | Nitro task → Hetzner Object Storage | Germany | Included |
| Blob Storage | Hetzner Object Storage (S3-compatible) | Germany | €4.99/mo |
| KV + Cache | Redis (Docker container on VPS) | On VPS | Free |
| Email | Mailgun EU / Brevo / Scaleway (see [email plan](./plan-crouton-email-refactor.md)) | EU | Varies |
| CDN | Bunny.net (optional) | Slovenia | ~€1/mo |
| AI | Mistral API (optional) | France | Pay-as-you-go |
| Analytics | Plausible (optional) | Estonia | Self-host or €9/mo |
| **Total** | | **All EU** | **~€8.50/mo** |

Multiple crouton apps run on a single VPS. Each gets its own domain, SQLite file, and Caddy route. They share Redis and Object Storage.

---

## Architecture

```
Hetzner VPS
├── Caddy (reverse proxy, auto SSL)
│   ├── app1.example.com → :3001
│   ├── app2.example.com → :3002
│   └── app3.example.com → :3003
├── Nuxt apps (node-server preset)
│   ├── NuxtHub v0.10 (db, blob, kv, cache)
│   ├── Nitro scheduled tasks (built-in cron)
│   └── y-websocket (optional, for Yjs collab)
├── Redis (shared across apps)
├── SQLite files on disk (per app)
└── Nitro backup task → Object Storage

Hetzner Object Storage (1TB included)
├── Blob storage (user uploads, per app prefix)
└── SQLite backups (per app prefix)
```

### Resolved: Docker vs Bare Node

**Bare Node + Caddy is the primary path.** No Docker files exist in the repo currently. Crouton users are Nuxt devs, not DevOps people. Docker Compose with 3 services (app + Redis + Caddy) is the documented advanced option for users who want container isolation.

Current codebase deploys to Cloudflare via `nuxthub deploy` (see `wrangler.toml` in `apps/crouton-playground/` and `apps/thinkgraph/`). VPS is additive.

### Resolved: Litestream vs Nitro Task

**Nitro scheduled task for backups.** Simpler, zero extra infrastructure, consistent with the "everything in Nuxt" philosophy. Hourly backups are sufficient for CRUD apps. Use NuxtHub's blob API (not raw `@aws-sdk/client-s3`) to stay provider-agnostic — see backup section below.

---

## NuxtHub v0.10 Configuration

`@nuxthub/core` is already a dependency — `crouton-core` extends it and configures `hub: { db: 'sqlite' }`. Blob storage is set via `blob: true` in crouton-core's layer config. The VPS config overrides the drivers:

```ts
// nuxt.config.ts (VPS override)
export default defineNuxtConfig({
  hub: {
    db: 'sqlite',
    blob: {
      driver: 's3',
      bucket: process.env.S3_BUCKET,
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION,
      accessKeyId: process.env.S3_ACCESS_KEY,
      secretAccessKey: process.env.S3_SECRET_KEY,
    },
    kv: {
      driver: 'redis',
      url: process.env.REDIS_URL,
    },
    cache: {
      driver: 'redis',
      url: process.env.REDIS_URL,
    },
  },
  nitro: {
    experimental: { tasks: true },
    scheduledTasks: {
      '0 * * * *': ['backup:sqlite'], // hourly backup
    },
  },
})
```

Note: `crouton-triage` requires `hub: { kv: true }` for Slack OAuth state storage. On VPS this maps to Redis via the config above.

---

## Deploy Paths

### Path A: Bare Node + Caddy (primary — simplest)

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

### Path B: Docker Compose (advanced — isolated)

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
      - S3_ACCESS_KEY=${S3_ACCESS_KEY}
      - S3_SECRET_KEY=${S3_SECRET_KEY}
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

### Path C: Cloudflare (existing — zero-ops)

Already configured and working. Deploy via `nuxthub deploy`. `wrangler.toml` files exist in `apps/crouton-playground/` and `apps/thinkgraph/`. This stays the easiest path for users who don't need EU data sovereignty.

### Path D: Fly.io (middle ground — worth documenting)

Not EU-owned but has Amsterdam region, persistent volumes for SQLite, simpler than raw VPS. Fills the gap for users who want EU hosting without server management. Worth a short deploy guide.

---

## Multi-App on One VPS

This is a killer feature vs Cloudflare/Vercel (per-project billing). One Hetzner CX22 runs 6-8 crouton apps for €8.50 total.

**Decision**: Start with single-app templates. Document multi-app as an "advanced" section — same templates, just different ports.

Caddyfile for multi-app:
```
app1.example.com {
    reverse_proxy localhost:3001
}

app2.example.com {
    reverse_proxy localhost:3002
}

app3.example.com {
    reverse_proxy localhost:3003
}
```

Each app gets its own:
- Port (3001, 3002, 3003...)
- SQLite file (`/opt/apps/app1/.data/db.sqlite3`)
- `.env` file
- Systemd service or Docker container

They share:
- Redis instance
- Object Storage bucket (different key prefixes)
- Caddy reverse proxy

---

## SQLite Backup via Nitro Task

Use NuxtHub's blob API instead of raw `@aws-sdk/client-s3` — stays provider-agnostic and works on both Cloudflare and VPS:

```ts
// server/tasks/backup/sqlite.ts
import { readFile } from 'node:fs/promises'

export default defineTask({
  meta: {
    name: 'backup:sqlite',
    description: 'Backup SQLite database to blob storage',
  },
  async run() {
    const dbPath = '.data/db.sqlite3'
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

**Decision**: Ship in `crouton-core` so every app gets backups for free. Small footprint, universally useful, prevents data loss for users who forget to set it up.

Configured in `nuxt.config.ts`:
```ts
nitro: {
  experimental: { tasks: true },
  scheduledTasks: {
    '0 * * * *': ['backup:sqlite'], // every hour
  },
}
```

---

## CI/CD via GitHub Actions

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

Or with Docker:
```yaml
      - name: Deploy to server
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: deploy
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /opt/apps/my-app
            git pull
            docker compose up -d --build
```

---

## CLI Commands

The CLI lives at `packages/nuxt-crouton-cli/`, built with **citty** + **unbuild**. No `.croutonrc` config store exists — CLI reads from `.env` and project config.

### Resolved: CLI approach

Use citty subcommands within the existing CLI. Deploy commands should save server connection details to `.croutonrc.json` (new, project-local) since SSH host/user/path are needed across multiple commands. For remote execution, use `node-ssh` (lightweight, no native deps).

### Server setup
```bash
npx crouton deploy init                # Interactive: SSH into VPS, install Caddy + Node
npx crouton deploy setup <app-name>    # Create app dir, Caddyfile entry, .env, systemd service
```

`deploy init` would:
1. Ask for server IP and SSH key
2. SSH in and install Node 20 + Caddy
3. Create a deploy user
4. Set up firewall (80, 443, 22 only)
5. Install Redis if needed
6. Save connection details to `.croutonrc.json`

`deploy setup` would:
1. Create `/opt/apps/<name>/` on the server
2. Generate `.env` from `.env.example`
3. Add Caddyfile entry for the domain
4. Create systemd service
5. Reload Caddy

### Day-to-day deployment
```bash
npx crouton deploy push                # Build locally + rsync .output + restart service
npx crouton deploy logs                # Tail remote logs via SSH
npx crouton deploy env set KEY=VALUE   # Set env var on server
npx crouton deploy env list            # Show current env vars
```

`deploy push` would:
1. Run `pnpm build` locally
2. rsync `.output/` to server
3. Restart the systemd service
4. Tail logs briefly to confirm startup

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

### Resolved: Template location

Deploy templates go inside the CLI package at `packages/nuxt-crouton-cli/templates/deploy/`. The CLI already has a template system for collection generation — deploy templates follow the same pattern.

### Templates & Config Files
- [ ] `Caddyfile` — reverse proxy with auto HTTPS (single-app, multi-app documented separately)
- [ ] `Dockerfile` — multi-stage Node.js build
- [ ] `docker-compose.yml` — app + Redis + Caddy (advanced path)
- [ ] `.env.example` — all required environment variables (including email driver config)
- [ ] `systemd/crouton-app.service` — systemd unit template
- [ ] GitHub Actions workflow template

### Backup Task
- [ ] `server/tasks/backup/sqlite.ts` — hourly blob storage backup (ships in crouton-core)
- [ ] Restore utility or CLI command

### Documentation
- [ ] Hetzner VPS deploy guide (comprehensive, step-by-step — primary)
- [ ] Fly.io deploy guide (middle ground — Amsterdam region, simpler than VPS)
- [ ] Cloudflare deploy guide (short, "what's different" — existing path)
- [ ] Generic VPS guide (any provider, same templates)
- [ ] Multi-app guide (advanced topic)
- [ ] Backup & restore guide
- [ ] Email provider DNS setup guide (SPF/DKIM/DMARC per provider)

---

## Monorepo Context (Resolved)

| Question | Answer |
|---|---|
| Package scope | `@fyit/*` (e.g., `@fyit/crouton-email`, `@fyit/crouton-core`) |
| Shared package | `packages/crouton-core/` — types, composables, hooks, team context, DB utils, NuxtHub config |
| CLI package | `packages/nuxt-crouton-cli/` — citty + unbuild, template-based generation |
| Config storage | None currently. CLI reads `.env`. Deploy commands will introduce `.croutonrc.json`. |
| Existing Docker | None — no Dockerfile or docker-compose anywhere in the repo |
| Existing deploy | Cloudflare via `nuxthub deploy` + `wrangler.toml` per app |

---

## Trade-offs vs Cloudflare (document honestly)

| | Cloudflare | Hetzner VPS |
|---|---|---|
| Global edge | 300+ PoPs | Single datacenter |
| DDoS protection | Enterprise-grade | Basic (add Bunny CDN for more) |
| Auto-scaling | Unlimited | Manual (resize VPS) |
| Durable Objects | Built-in | DIY (y-websocket) |
| Maintenance | Zero | You manage Node + OS updates |
| **Data sovereignty** | **US company** | **EU only** |
| **SQLite** | **Over network (D1)** | **On disk, zero latency** |
| **WebSockets** | **Durable Objects (complex)** | **Native (simple)** |
| **Cron** | **Cron Triggers + wrangler** | **Nitro scheduledTasks, just works** |
| **Email** | **Resend only (HTTP API)** | **Any provider (HTTP + SMTP)** |
| **Cost at low scale** | **Free tier** | **~€8.50/mo** |
| **Multiple apps** | **Per-project billing** | **All on one VPS** |

For EU-focused CRUD apps, VPS wins on simplicity, latency, and cost. Cloudflare wins for global distribution and zero-ops.

---

## Tasks

### Phase 0 — Email Multi-Driver (prerequisite)
See [email refactor plan](./plan-crouton-email-refactor.md). Must land first so VPS users can configure EU email providers.

### Phase 1 — Templates (1 day)
- [ ] Create Caddyfile template (single-app)
- [ ] Create systemd service template
- [ ] Create Dockerfile
- [ ] Create docker-compose.yml (advanced path)
- [ ] Create .env.example (includes `EMAIL_DRIVER`, `EMAIL_API_KEY`, etc.)
- [ ] Create GitHub Actions workflow template
- [ ] Create backup Nitro task in crouton-core (using `blob.put()`)
- [ ] Test full deploy on a fresh Hetzner CX22

### Phase 2 — CLI Commands (2 days)
- [ ] `crouton deploy init` — server setup wizard
- [ ] `crouton deploy setup <app>` — per-app setup
- [ ] `crouton deploy push` — build + rsync + restart
- [ ] `crouton deploy logs` — tail remote logs
- [ ] `crouton deploy env` — manage env vars
- [ ] `crouton db backup` / `restore` / `download`
- [ ] `crouton email test` / `verify-dns`
- [ ] Introduce `.croutonrc.json` for server connection details

### Phase 3 — Documentation (1-2 days)
- [ ] Hetzner VPS deploy guide (primary)
- [ ] Fly.io deploy guide (middle ground)
- [ ] Cloudflare deploy guide
- [ ] Generic VPS guide
- [ ] Multi-app guide
- [ ] Backup & restore guide

### Phase 4 — Validate (1 day)
- [ ] Fresh deploy following only the docs
- [ ] Test 3+ apps on one CX22
- [ ] Test backup + restore cycle
- [ ] Test Nitro scheduled tasks
- [ ] Test y-websocket alongside Nuxt app
- [ ] Verify NuxtHub blob driver with Hetzner Object Storage
- [ ] Test email with Mailgun EU on VPS

**Total: ~5-6 days** (plus email refactor as Phase 0)

---

## Server Hardening Checklist (include in docs)

- [ ] SSH key-only auth (disable password login)
- [ ] Hetzner Cloud Firewall (allow 80, 443, 22 only)
- [ ] Unattended upgrades for OS security patches
- [ ] Log rotation (prevent disk fill)
- [ ] Monitoring: Hetzner alerts for CPU/disk, or self-host Uptime Kuma
- [ ] Backup verification: monthly test restore
