# Crouton EU Hosting & Deploy Plan

## Summary

Ship crouton with deployment templates, CLI commands, and documentation so users can self-host on EU infrastructure. Not replacing Cloudflare/Vercel — adding VPS as a documented, EU-sovereign alternative. NuxtHub v0.10 handles provider abstraction, crouton provides the deployment scaffolding and CLI tooling.

---

## Recommended EU Stack

| Layer | Provider | Location | Cost |
|---|---|---|---|
| Compute | Hetzner VPS (CX22: 2 vCPU, 4GB) | Germany | €3.49/mo |
| Database | SQLite on disk | On VPS | Free |
| DB Backups | Nitro task → Hetzner Object Storage | Germany | Included |
| Blob Storage | Hetzner Object Storage (S3-compatible) | Germany | €4.99/mo |
| KV + Cache | Redis (Docker container on VPS) | On VPS | Free |
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

> **🔍 OPEN: Should Docker be the primary or secondary path?** Crouton users are Nuxt devs, not DevOps people. Docker Compose with 4 services is a lot. The simplest path might be bare Node + Caddy:
> ```bash
> pnpm build
> node .output/server/index.mjs
> ```
> With Caddy (single binary, auto HTTPS) in front. Docker becomes the advanced option for people who want isolation. What does the current codebase assume about deployment?

> **🔍 OPEN: Litestream vs Nitro task for SQLite backups?** Litestream is powerful (continuous WAL streaming) but adds a container to understand. A Nitro scheduled task that copies the SQLite file to S3 every hour is simpler — zero extra infrastructure. For most crouton CRUD apps, hourly backups are fine. Which approach fits better?

---

## NuxtHub v0.10 Configuration

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@nuxthub/core'],
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

> **🔍 OPEN: Is `@nuxthub/core` already a dependency somewhere in the monorepo?** How is it currently configured? The v0.10 multi-vendor config above needs to match whatever patterns are already established.

---

## Deploy Paths

### Path A: Bare Node + Caddy (simplest)

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

### Path B: Docker Compose (isolated)

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

### Path C: Cloudflare / Vercel (existing)

NuxtHub v0.10 works on these platforms with different driver configs. Keep this as the easiest path — don't fight it.

> **🔍 OPEN: How is Cloudflare deploy documented/configured currently?** Is there a `wrangler.toml`, Vercel config, or deploy guide already? The VPS path is additive — the existing cloud paths should stay the easiest option.

> **🔍 OPEN: Is there a `Dockerfile` or `docker-compose.yml` anywhere in the repo already?**

---

## Multi-App on One VPS

This is a killer feature vs Cloudflare/Vercel (per-project billing). One Hetzner CX22 runs 6-8 crouton apps for €8.50 total.

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

> **🔍 OPEN: Should the deploy templates support multi-app out of the box?** Or start with single-app and document multi-app as an advanced topic?

---

## SQLite Backup via Nitro Task

Instead of Litestream, use a built-in scheduled task:

```ts
// server/tasks/backup/sqlite.ts
import { readFile } from 'node:fs/promises'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

export default defineTask({
  meta: {
    name: 'backup:sqlite',
    description: 'Backup SQLite database to S3',
  },
  async run() {
    const config = useRuntimeConfig()
    const dbPath = '.data/db.sqlite3'
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')

    const s3 = new S3Client({
      endpoint: config.s3Endpoint,
      region: config.s3Region,
      credentials: {
        accessKeyId: config.s3AccessKey,
        secretAccessKey: config.s3SecretKey,
      },
    })

    const file = await readFile(dbPath)
    await s3.send(new PutObjectCommand({
      Bucket: config.s3Bucket,
      Key: `backups/${timestamp}.sqlite3`,
      Body: file,
    }))

    return { result: `Backed up to backups/${timestamp}.sqlite3` }
  },
})
```

Configured in `nuxt.config.ts`:
```ts
nitro: {
  experimental: { tasks: true },
  scheduledTasks: {
    '0 * * * *': ['backup:sqlite'], // every hour
  },
}
```

> **🔍 OPEN: Should this backup task ship as part of crouton core, or as a documented recipe?** If it's in core, every crouton app gets backups for free. If it's a recipe, it's more flexible but users might skip it.

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

The crouton CLI should get deploy and infra commands that turn a 20-step guide into 3 commands.

> **🔍 OPEN: Where does the CLI package live?** Is it `packages/crouton-cli`? What's it built with — citty, commander, unbuild? What's the existing command structure?

> **🔍 OPEN: Is there config storage (like `.croutonrc`) for server SSH details?** The deploy commands need to know the server host, user, and app path.

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
6. Save connection details to `.croutonrc`

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
npx crouton db backup                  # Trigger the Nitro backup task, or copy SQLite to S3
npx crouton db restore <timestamp>     # Download backup from S3 and replace local DB
npx crouton db download                # Pull remote SQLite to local for debugging
```

### Email (see email plan)
```bash
npx crouton email test                 # Send a test email with current driver config
npx crouton email verify-dns           # Check SPF/DKIM/DMARC records for your domain
```

> **🔍 OPEN: Is there a setup script approach vs CLI?** An alternative to full CLI commands would be a simple bash script: `curl -fsSL https://crouton.dev/setup.sh | bash`. Less elegant, more portable. Which fits better with how crouton users work?

> **🔍 OPEN: Can we use `node-ssh` or `execa` for remote commands?** Need to check what's feasible within the CLI's dependency constraints.

---

## What Crouton Ships

### Templates & Config Files
- [ ] `Caddyfile` — reverse proxy with auto HTTPS (single and multi-app)
- [ ] `Dockerfile` — multi-stage Node.js build
- [ ] `docker-compose.yml` — app + Redis + Caddy (advanced path)
- [ ] `.env.example` — all required environment variables
- [ ] `systemd/crouton-app.service` — systemd unit template
- [ ] GitHub Actions workflow template

> **🔍 OPEN: Where should deployment templates live in the monorepo?** Options:
> - `packages/crouton-deploy/` (new package with templates + CLI commands)
> - Inside the existing CLI package as `templates/deploy/`
> - `templates/deploy/` at repo root
>
> What's the existing pattern for this kind of thing?

### Backup Task
- [ ] `server/tasks/backup/sqlite.ts` — hourly S3 backup
- [ ] Restore utility or CLI command

### Documentation
- [ ] Hetzner VPS deploy guide (comprehensive, step-by-step)
- [ ] Cloudflare deploy guide (short, "what's different")
- [ ] Vercel deploy guide (short)
- [ ] Generic VPS guide (any provider, same templates)
- [ ] Multi-app guide
- [ ] Backup & restore guide
- [ ] Email provider DNS setup guide

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
| **Cost at low scale** | **Free tier** | **~€8.50/mo** |
| **Multiple apps** | **Per-project billing** | **All on one VPS** |

For EU-focused CRUD apps, VPS wins on simplicity, latency, and cost. Cloudflare wins for global distribution and zero-ops.

> **🔍 OPEN: Consider Fly.io as a documented middle ground?** Not EU-owned but has Amsterdam region, persistent volumes for SQLite, simpler than raw VPS. Fills the gap between Cloudflare and self-hosted for users who want EU hosting without server management. Worth a short deploy guide?

---

## Monorepo Questions

> **🔍 OPEN: What's the current package scope?** Is it `@crouton/*`, `@friendlyinternet/*`, or `@fyit/*`? There was a scope migration planned.

> **🔍 OPEN: Is there a `packages/crouton-core` or similar shared package?** Where do shared types and config conventions live?

---

## Tasks

### Phase 1 — Templates (1 day)
- [ ] Create Caddyfile template (single + multi-app)
- [ ] Create systemd service template
- [ ] Create Dockerfile
- [ ] Create docker-compose.yml (advanced path)
- [ ] Create .env.example
- [ ] Create GitHub Actions workflow template
- [ ] Create backup Nitro task
- [ ] Test full deploy on a fresh Hetzner CX22

### Phase 2 — CLI Commands (2 days)
- [ ] `crouton deploy init` — server setup wizard
- [ ] `crouton deploy setup <app>` — per-app setup
- [ ] `crouton deploy push` — build + rsync + restart
- [ ] `crouton deploy logs` — tail remote logs
- [ ] `crouton deploy env` — manage env vars
- [ ] `crouton db backup` / `restore` / `download`
- [ ] `crouton email test` / `verify-dns`

### Phase 3 — Documentation (1-2 days)
- [ ] Hetzner VPS deploy guide (primary)
- [ ] Cloudflare deploy guide
- [ ] Vercel deploy guide
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

**Total: ~5-6 days**

---

## Server Hardening Checklist (include in docs)

- [ ] SSH key-only auth (disable password login)
- [ ] Hetzner Cloud Firewall (allow 80, 443, 22 only)
- [ ] Unattended upgrades for OS security patches
- [ ] Log rotation (prevent disk fill)
- [ ] Monitoring: Hetzner alerts for CPU/disk, or self-host Uptime Kuma
- [ ] Backup verification: monthly test restore
