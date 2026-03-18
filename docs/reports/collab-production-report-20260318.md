# Report: Yjs Collaboration in ThinkGraph Production

**Date:** 2026-03-18
**Status:** Working

## Summary

Enabled real-time Yjs collaboration on ThinkGraph's canvas pages in production (Cloudflare Pages). Multiple users/tabs can now edit the same canvas simultaneously with changes syncing in real-time via Durable Objects.

## Architecture

```
Client Browser
  │ wss://thinkgraph-collab.cloudflare-e53.workers.dev/{roomKey}/ws
  │ (direct connection — bypasses Nitro)
  ▼
thinkgraph-collab Worker
  │ Routes by roomKey to DO instance
  ▼
CollabRoom Durable Object
  ├── WebSocket sync (Yjs CRDTs)
  ├── Awareness/presence
  ├── DO storage (fast) + D1 (durable)
  └── Auth: HMAC token verification (no callback needed)
```

**Local dev** is unchanged — crossws handler runs in-process.

## Key Decisions & Learnings

### 1. Pages can't host Durable Objects
Cloudflare Pages projects cannot define DO classes. They must reference DOs from a separate Worker via `script_name`. Created `workers/collab-worker/` as a standalone Worker hosting `CollabRoom`.

### 2. Nitro can't proxy WebSocket frames
The initial approach used a Nitro middleware (`00.collab-proxy.ts`) to intercept `/api/collab/*` paths and forward to the DO via `sendWebResponse`. The 101 upgrade appeared to work, but **no messages flowed** — h3/Nitro can't bridge WebSocket frames between client and DO.

**Solution:** Client connects directly to the collab worker URL, bypassing Nitro entirely. Configured via `runtimeConfig.public.collabWorkerUrl`.

### 3. Cross-origin auth requires HMAC tokens
Direct WebSocket connections to the worker are cross-origin. `HttpOnly` session cookies can't be read by `document.cookie` and aren't sent cross-origin.

**Solution:** Token-based auth flow:
1. Client fetches `/api/collab/token` (same-origin, cookies sent automatically)
2. Server validates session, creates HMAC-signed token (`{userId, exp}` signed with `BETTER_AUTH_SECRET`)
3. Client passes token as `?token=` query param to worker WebSocket
4. CollabRoom DO verifies HMAC signature and expiry — no callback to app needed

Both the Pages app and the collab worker share `BETTER_AUTH_SECRET` for signing/verification.

### 4. Canvas page needed SSR/client split
The canvas page (`[canvasId].vue`) previously loaded positions via SSR using a broken direct-canvasId lookup. Fixed to use `ensureFlowConfig` pattern (auto-creates `flow_configs` row) and moved all data loading to `onMounted` to avoid hydration mismatches when `flowId` is null on server but set on client.

### 5. SyncBridge race condition (original)
When CroutonFlow mounts with `sync`, the Yjs WebSocket and `refreshNodes` run concurrently. If the WebSocket connects (`synced=true`) before nodes are loaded (`rows` is empty), the bridge skips seeding. Added a second watcher on `rows.length` to handle late-arriving data.

### 6. Blank canvas in production — no fallback when sync fails
**Recurring bug:** Nodes exist in the database but the canvas renders empty. Root cause: `Flow.vue`'s `finalNodes` computed uses `syncNodes` (Yjs data) exclusively when `sync=true`. If the WebSocket is slow to connect (DO cold start), fails entirely, or the seeding race condition hits, `syncNodes` is empty and there's **no fallback to rows**.

**Symptoms:** Canvas appears blank, but node count badges (e.g., "1 dispatching") still show because they read from the `nodes` ref (DB data), not from Yjs.

**Fix (two parts):**

1. **Fallback rendering in `Flow.vue`** — When sync mode is active but Yjs hasn't synced yet (`syncNodes` empty + `synced` false), fall back to `layoutedNodes` (rows-based rendering). Once Yjs syncs, it takes over seamlessly.

   ```typescript
   // In finalNodes computed
   if (nodes.length === 0 && !syncState.synced.value) {
     baseNodes = layoutedNodes.value  // Show rows while Yjs connects
   }
   ```

2. **Unified seeding watcher in `useFlowSyncBridge.ts`** — Replaced the two separate watchers (one on `synced`, one on `rows.length`) with a single watcher that tracks **both** values. The old approach was fragile: each watcher only re-fired when its own dependency changed, so if both conditions were already true when the watchers were set up, neither would trigger seeding.

### 7. Deploy script must include collab worker URL
The `NUXT_PUBLIC_COLLAB_WORKER_URL` env var must be set at **build time** (it's baked into the client bundle via `runtimeConfig.public`). Without it, the WebSocket has no endpoint and sync mode silently fails.

Updated `apps/thinkgraph/package.json` `cf:deploy` script to include the collab worker URL, `nuxt prepare` step (rolldown tsconfig bug), and `--commit-dirty=true`. Deploy is now just:

```bash
cd apps/thinkgraph && pnpm cf:deploy
```

## Files Changed

| File | Change |
|------|--------|
| `workers/collab-worker/*` | New standalone Worker hosting CollabRoom DO |
| `packages/crouton-collab/server/middleware/00.collab-proxy.ts` | Proxy middleware (later removed — Nitro can't proxy WS frames) |
| `packages/crouton-collab/server/routes/api/collab/token.get.ts` | New HMAC token endpoint |
| `packages/crouton-collab/server/durable-objects/CollabRoom.ts` | Added HMAC token verification alongside cookie auth |
| `packages/crouton-collab/app/composables/useCollabConnection.ts` | Direct worker URL + token auth flow |
| `packages/crouton-collab/nuxt.config.ts` | Added `collabWorkerUrl` runtime config |
| `packages/crouton-flow/app/composables/useFlowSyncBridge.ts` | Unified seeding watcher (replaced fragile two-watcher approach) |
| `apps/thinkgraph/app/pages/admin/[team]/canvas/[canvasId].vue` | Enabled sync, ensureFlowConfig, client-side loading |
| `apps/thinkgraph/nuxt.config.ts` | Added `collabWorkerUrl` public runtime config |
| `apps/thinkgraph/wrangler.toml` | Added DO binding with `script_name` |
| `.github/workflows/deploy-thinkgraph.yml` | Collab worker deploy step, D1 migration, worker URL env |
| `pnpm-workspace.yaml` | Added `workers/*` |

## Deployment Checklist

When deploying collab changes:

1. **Set `BETTER_AUTH_SECRET`** on the collab worker (same value as Pages):
   ```bash
   cd workers/collab-worker && npx wrangler secret put BETTER_AUTH_SECRET
   ```

2. **Deploy collab worker** (must be before Pages):
   ```bash
   cd workers/collab-worker && npx wrangler deploy
   ```

3. **Run D1 migration** (first time only):
   ```bash
   cd workers/collab-worker && npx wrangler d1 execute thinkgraph-db --remote \
     --file=../../packages/crouton-collab/server/database/migrations/0001_yjs_collab_states.sql
   ```

4. **Deploy ThinkGraph** with worker URL:
   ```bash
   cd apps/thinkgraph && \
     NUXT_PUBLIC_COLLAB_WORKER_URL=https://thinkgraph-collab.cloudflare-e53.workers.dev \
     NITRO_PRESET=cloudflare-pages npx nuxt prepare && \
     NUXT_PUBLIC_COLLAB_WORKER_URL=https://thinkgraph-collab.cloudflare-e53.workers.dev \
     NITRO_PRESET=cloudflare-pages npx nuxt build && \
     npx wrangler pages deploy dist/ --commit-dirty=true
   ```

## Additional Files Changed (follow-up fix)

| File | Change |
|------|--------|
| `packages/crouton-flow/app/components/Flow.vue` | Added fallback to rows-based rendering when sync hasn't connected |
| `packages/crouton-flow/app/composables/useFlowSyncBridge.ts` | Unified seeding into single watcher on both `synced` + `rows.length` |
| `apps/thinkgraph/package.json` | `cf:deploy` script now includes collab worker URL + prepare step |

## Known Limitations

- **Collab proxy middleware** (`00.collab-proxy.ts`) was removed — Nitro cannot proxy WebSocket frames, and HTTP endpoints (`/state`, `/users`) work via normal Nitro routes.
- **Token expiry** is 60 seconds — enough for initial connection. Reconnections fetch a fresh token.
- **BETTER_AUTH_SECRET rotation** requires updating both the Pages project and the collab worker simultaneously.
- The collab worker URL is hardcoded in CI. If the worker is redeployed to a different URL, update `deploy-thinkgraph.yml`.
