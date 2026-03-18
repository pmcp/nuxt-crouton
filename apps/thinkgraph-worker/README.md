# ThinkGraph Worker (Pi Agent)

Distributed worker that polls ThinkGraph for dispatched nodes, claims them via optimistic concurrency, and runs a Pi coding agent session to create child nodes.

## Prerequisites

- Node.js 18+
- [Pi Agent CLI](https://pi.dev/) installed and authenticated
- Access to ThinkGraph production (service token or credentials)

## Pi Agent Setup

The worker uses `@mariozechner/pi-coding-agent` SDK, which requires Pi to be installed and authenticated.

```bash
# Install Pi
curl -fsSL https://pi.dev/install | bash

# Authenticate (creates ~/.pi/agent/auth.json)
pi auth login
```

**API key resolution order** (handled by `AuthStorage.create()`):
1. Runtime overrides (`setRuntimeApiKey`)
2. `~/.pi/agent/auth.json` (from `pi auth login`)
3. Environment variables (`ANTHROPIC_API_KEY`)

Without credentials, `session.prompt()` resolves silently with no output — the session appears to start and immediately end with no error.

## Configuration

Copy `.env.example` to `.env` and fill in:

```bash
cp .env.example .env
```

| Variable | Required | Description |
|----------|----------|-------------|
| `THINKGRAPH_URL` | Yes | Production URL (e.g. `https://thinkgraph.pages.dev`) |
| `THINKGRAPH_TEAM` | Yes | Team slug to watch for dispatched nodes |
| `THINKGRAPH_SERVICE_TOKEN` | Yes | Service token (from `/api/teams/:id/worker-auth`) |
| `ANTHROPIC_API_KEY` | Alt | Alternative to `pi auth login` |
| `PI_WORK_DIR` | Yes | Working directory for agent sessions (default: `/home/pi/repos`) |
| `PI_MAX_SESSIONS` | No | Max concurrent sessions (default: 3) |

## Running

```bash
# Build and run
npx tsc && node dist/index.js

# Or pull latest and run
cd ~/nuxt-crouton && git pull && cd apps/thinkgraph-worker && npx tsc && node dist/index.js
```

## How It Works

1. **Dispatch Watcher** polls `/api/teams/{id}/thinkgraph-nodes?status=dispatching` every 5s
2. Claims node via PATCH with `_expectedStatus: 'dispatching'` (409 if another worker got it)
3. Opens WebSocket to `/api/teams/{id}/terminal-ws/{nodeId}` for terminal streaming
4. Creates Pi agent session with ThinkGraph tools (create_node, update_node, search_graph, etc.)
5. Agent creates child nodes under the dispatched node
6. Session completes → node status set to 'done'

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Session starts then immediately ends (no error) | Missing Pi auth / API key | Run `pi auth login` or set `ANTHROPIC_API_KEY` |
| `Session error: 401` | Expired service token | Re-authenticate via worker-auth endpoint |
| `Session error: 409` | Another worker claimed the node | Normal — multiple workers race for nodes |
| WebSocket closes immediately | Invalid service token or team mismatch | Check `THINKGRAPH_SERVICE_TOKEN` and `THINKGRAPH_TEAM` |
