# Self-Hosted Pi Agent on a Raspberry Pi (Cloudflare ingress) — Runbook

**Date:** 2026-06-17
**Status:** Reference runbook (harvested from `retired/pocs/thinkgraph-worker` before archive)
**Purpose:** How to run a pi.dev coding agent on your own box (a Raspberry Pi) and
dispatch work to it over the internet via Cloudflare. This is the **self-host
escape-hatch playbook** — the chosen path is Claude Code + GitHub (see
`writeups/architecture/agent-orchestration-architecture.md`); keep this for the day a
hard isolation/cost requirement makes own-infra worth it again.

> Source of truth for the working version: `retired/pocs/thinkgraph-worker/` (`src/index.ts`,
> `src/config.ts`, `deploy.sh`, `thinkgraph-worker.service`, `.env.example`). This doc
> generalises that into a reusable recipe and flags the gotchas we hit.

## The shape of it

```
┌─────────────┐   HTTPS POST /dispatch     ┌──────────────────┐
│ Dispatcher  │  (Bearer DISPATCH_SECRET)  │ Cloudflare Tunnel │
│ (anything:  │ ─────────────────────────▶ │  agent.example.   │
│  CF Pages,  │                            │  com (stable URL) │
│  a webhook, │                            └────────┬─────────┘
│  a cron)    │                                     │ localhost
└─────────────┘                                     ▼
                                          ┌──────────────────────┐
                                          │ Raspberry Pi          │
                                          │  pi-agent worker      │
                                          │  - HTTP :8787         │
                                          │    /dispatch /health  │
                                          │  - pi.dev SDK session │
                                          │  - git worktrees      │
                                          │  systemd: always-on   │
                                          └──────────────────────┘
```

The worker is a plain Node service that (1) exposes an HTTP endpoint, (2) on a valid
dispatch spins up a pi.dev agent session in a working dir, (3) streams progress back to
whatever surface you want (ThinkGraph used Yjs; a GitHub-flavoured build would post
comments / open PRs instead).

## What the Pi can and cannot do (read first)

- **Can:** run pi agent sessions, read/edit files, run git + `gh`, manage worktrees,
  hit remote APIs. A Pi 5 (8GB+) handles several concurrent low-footprint sessions.
- **Cannot:** run `pnpm typecheck` or full Nuxt builds — they **exceed the Pi's memory**.
  Offload those to CI (the ThinkGraph reviewer stage explicitly does this: it checks the
  branch's CI run rather than typechecking locally). Plan the Pi as the *orchestrator /
  agent host*, not the build box.

## 1. Prepare the Pi

```bash
# On the Pi (Raspberry Pi OS 64-bit)
# Node 22 via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
nvm install 22

# git + gh for the agent to use
sudo apt-get install -y git
# install gh (GitHub CLI) per https://cli.github.com, then: gh auth login

# Clone the repo the agent will work in
git clone <repo-url> /home/pi/nuxt-crouton

# Install pi.dev and authenticate (creates ~/.pi/agent/auth.json)
curl -fsSL https://pi.dev/install | bash
pi auth login
```

**API key resolution order** (pi `AuthStorage.create()`): runtime override →
`~/.pi/agent/auth.json` (from `pi auth login`) → `ANTHROPIC_API_KEY` env.
⚠️ **Gotcha:** with no credentials, `session.prompt()` resolves *silently* — the session
appears to start and instantly end with no error. If a session does nothing, check auth
first.

## 2. Configure the worker

Copy `.env.example` → `.env` and fill in. The keys that matter for *any* pi worker:

| Variable | Purpose |
|---|---|
| `PI_WORK_DIR` | Where agent sessions run (the cloned repo), e.g. `/home/pi/nuxt-crouton` |
| `PI_MAX_SESSIONS` | Concurrency cap (default 3 — keep low on a Pi) |
| `ANTHROPIC_API_KEY` | Model auth (or use `pi auth login`) |
| `PI_MODEL` | Model id. **See gotcha below — wire it through, it's currently dead config.** |
| `DISPATCH_SECRET` | Bearer token the worker requires on `/dispatch`. **Always set this** — without it the endpoint is unauthenticated. |
| `HEALTH_PORT` | Local HTTP port (default 8787) |

(The ThinkGraph-specific vars — `THINKGRAPH_URL`, `THINKGRAPH_TEAM`,
`THINKGRAPH_SERVICE_TOKEN`, `COLLAB_WORKER_URL`, `BETTER_AUTH_SECRET` — are about its Yjs
canvas + auth and are NOT needed for a generic pi worker.)

⚠️ **Gotcha (the one that matters for cost/model choice):** `config.ts` loads
`PI_MODEL`, but `session-manager.ts` never passes `config.model` into
`createAgentSession()`. So **`PI_MODEL` is dead config today** — every session uses
pi's default model, and there's no per-stage routing. To actually get "cheap model for
eval stages, strong model for building", thread a per-call `model` into
`createAgentSession` and register the provider (pi is provider-agnostic, so a z.ai/GLM
or OpenAI-compatible endpoint works) in the `ModelRegistry`.

## 3. Ingress: expose the worker via Cloudflare Tunnel

The worker only listens on `localhost:8787`. Cloudflare Tunnel gives it a **stable public
hostname with no open inbound ports** (no port-forwarding, no dynamic-DNS).

```bash
# On the Pi
# Install cloudflared (arm64), then:
cloudflared tunnel login
cloudflared tunnel create pi-agent
# Map a hostname to the local worker port:
cloudflared tunnel route dns pi-agent agent.example.com
```

`~/.cloudflared/config.yml`:
```yaml
tunnel: pi-agent
credentials-file: /home/pi/.cloudflared/<tunnel-id>.json
ingress:
  - hostname: agent.example.com
    service: http://localhost:8787
  - service: http_status:404
```

Run the tunnel as its own service: `sudo cloudflared service install`.

**Two layers of auth on the ingress (do both):**
1. **`DISPATCH_SECRET` bearer token** — the worker rejects any `/dispatch` without it
   (`index.ts` checks `Authorization: Bearer <secret>`).
2. **Cloudflare Access** (recommended) — put a Zero-Trust policy / service-token in front
   of `agent.example.com` so only your dispatcher can even reach the tunnel. Defence in
   depth: a box that runs arbitrary LLM-driven `bash` and holds repo write creds should
   not be openly reachable.

> Note: `index.ts` sets CORS `Access-Control-Allow-Origin: *` for browser callers. The
> bearer secret is what actually protects it; the `*` is convenience, not a hole, but
> Cloudflare Access is the belt to that suspenders.

## 4. Run it always-on (systemd)

`/etc/systemd/system/pi-agent.service` (adapt the ThinkGraph unit — **fix the path**,
see gotcha):

```ini
[Unit]
Description=Pi Agent Worker
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/nuxt-crouton/retired/pocs/thinkgraph-worker
ExecStart=/home/pi/.nvm/versions/node/v22/bin/node dist/index.js
Restart=always
RestartSec=10
EnvironmentFile=/home/pi/nuxt-crouton/retired/pocs/thinkgraph-worker/.env

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now pi-agent
sudo systemctl status pi-agent --no-pager -l
```

⚠️ **Gotcha (stale paths):** the committed `thinkgraph-worker.service`, `deploy.sh`, and
`README.md` still point at `apps/thinkgraph-worker` — the worker moved to
`retired/pocs/thinkgraph-worker`. As-is, `WorkingDirectory`/`EnvironmentFile` don't exist and the
service won't start. Update all three paths to `pocs/` (or wherever it lands) before
deploying.

## 5. Deploy / update loop

`deploy.sh` pattern (SSH-driven from your laptop): pull → `npm install --production` →
`npx tsc` → copy systemd unit → `systemctl restart`. Health-check after:

```bash
curl -fsS https://agent.example.com/health   # → {status:'ok', activeSessions, memory,...}
```

## Patterns worth keeping (the actually-good ideas)

- **Always-on + auth-retry-with-backoff** — `index.ts` `authenticateWithRetry()` retries
  the server connection up to 50× with capped exponential backoff, so a Pi that boots
  before the network/server is up self-heals instead of dying.
- **Bounded concurrency** — a session manager with `PI_MAX_SESSIONS` + 202/503 responses
  ("accepted" / "max sessions reached") keeps a small box from being swamped.
- **Health endpoint with memory stats** — `/health` reports `rss`/`heapUsed` + active
  sessions; trivial to alert on.
- **Constrain the tool surface per job** — ThinkGraph injects only the tools a given job
  needs (e.g. a comment-reply session gets *only* the reply tool). Tighter tools = more
  honest agent behaviour.
- **Agent reads project conventions at run start** — every stage `cat`s
  `~/nuxt-crouton/CLAUDE.md` + the relevant `.claude/skills/*/SKILL.md` before working.
  This is *why skills are portable*: a non-Claude-Code harness consumes them by reading
  them into context.

## See also

- Decision context: `writeups/architecture/agent-orchestration-architecture.md`
- Live reference code (until archived): `retired/pocs/thinkgraph-worker/`
