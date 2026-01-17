# CLAUDE.md - @friendlyinternet/nuxt-crouton-collab

## Package Purpose

Real-time collaboration infrastructure for Nuxt Crouton using Yjs CRDTs. This package provides the foundation for collaborative features across all Crouton apps, enabling multiple users to edit the same content simultaneously with automatic conflict resolution.

**Why this package exists:**
- Generic collaboration layer usable by any Crouton package
- Separates collaboration infrastructure from domain-specific code
- `crouton-flow` and `crouton-pages` can extend this package
- Provides consistent presence/awareness across the platform

## Key Files

| File | Purpose |
|------|---------|
| `server/durable-objects/CollabRoom.ts` | Cloudflare Durable Object for Yjs sync |
| `server/routes/api/collab/[roomId]/ws.ts` | WebSocket endpoint (local + production) |
| `server/database/migrations/0001_yjs_collab_states.sql` | D1 table for state persistence |
| `app/types/collab.ts` | TypeScript types for collaboration |
| `wrangler.example.toml` | Cloudflare configuration template |

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          Clients                                │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                         │
│  │ User A  │  │ User B  │  │ User C  │                         │
│  └────┬────┘  └────┬────┘  └────┬────┘                         │
│       │            │            │                               │
│       └────────────┼────────────┘                               │
│                    │ WebSocket                                  │
│                    ▼                                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              /api/collab/[roomId]/ws                    │   │
│  │              ?type=page|flow|document                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                    │                                            │
│                    ▼                                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   CollabRoom DO                         │   │
│  │  ┌─────────┐  ┌──────────────┐  ┌────────────────────┐ │   │
│  │  │  Y.Doc  │  │   Sessions   │  │    Awareness      │ │   │
│  │  │ (CRDT)  │  │ (WebSockets) │  │ (User Presence)   │ │   │
│  │  └────┬────┘  └──────────────┘  └────────────────────┘ │   │
│  └───────┼─────────────────────────────────────────────────┘   │
│          │                                                      │
│          ▼                                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 D1: yjs_collab_states                   │   │
│  │  ┌────────────┬─────────┬───────┬─────────┬─────────┐  │   │
│  │  │ room_type  │ room_id │ state │ version │ updated │  │   │
│  │  ├────────────┼─────────┼───────┼─────────┼─────────┤  │   │
│  │  │ page       │ abc-123 │ BLOB  │ 42      │ 17...   │  │   │
│  │  │ flow       │ def-456 │ BLOB  │ 17      │ 17...   │  │   │
│  │  └────────────┴─────────┴───────┴─────────┴─────────┘  │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## How CollabRoom Works

1. **Connection**: Client connects via WebSocket with `type` and `roomId` params
2. **Initial Sync**: CollabRoom sends full Y.Doc state to new client
3. **Updates**: Clients send Yjs binary updates, CollabRoom applies and broadcasts
4. **Awareness**: JSON messages track cursor positions, selections, presence
5. **Persistence**: Debounced (1s) save to both DO storage and D1

### Room Types

The `type` query parameter differentiates room types:

| Type | Use Case | Yjs Structure |
|------|----------|---------------|
| `page` | TipTap editor content | `Y.XmlFragment` |
| `flow` | Node graphs | `Y.Map` |
| `document` | Plain text | `Y.Text` |
| `generic` | Custom | Any |

### Key Design Decisions

1. **Generic, not domain-specific**: CollabRoom doesn't know about "nodes" or "pages"
2. **Consumer syncs to collections**: This package only stores Yjs blob state
3. **Phase 6 ready**: `/users` endpoint returns current users for global presence

## Usage

### 1. Extend in nuxt.config.ts

```typescript
export default defineNuxtConfig({
  extends: ['@friendlyinternet/nuxt-crouton-collab']
})
```

### 2. Configure Cloudflare (wrangler.toml)

```toml
[[durable_objects.bindings]]
name = "COLLAB_ROOMS"
class_name = "CollabRoom"

[[migrations]]
tag = "collab-v1"
new_classes = ["CollabRoom"]
```

### 3. Run D1 Migration

```bash
npx wrangler d1 execute <DB_NAME> \
  --file=./packages/nuxt-crouton-collab/server/database/migrations/0001_yjs_collab_states.sql
```

### 4. Connect from Client (Phase 2 composables)

```typescript
// Phase 2 will add useCollabSync composable
const { connected, synced, users } = useCollabSync({
  roomId: 'page-123',
  roomType: 'page',
  structure: 'xmlFragment'
})
```

## WebSocket Protocol

### Binary Messages (Yjs Updates)

Raw Uint8Array containing Yjs update data.

### JSON Messages

```typescript
// Awareness update
{
  type: 'awareness',
  userId: 'user-123',
  state: {
    user: { id: 'user-123', name: 'Alice', color: '#ff0000' },
    cursor: { x: 100, y: 200 },
    selection: { anchor: 10, head: 20 }
  }
}

// Ping/Pong for connection health
{ type: 'ping' }
{ type: 'pong' }

// Awareness broadcast (from server)
{
  type: 'awareness',
  users: [/* all connected users' states */]
}
```

## HTTP Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/collab/[roomId]/ws?type=X` | GET | WebSocket upgrade |
| `/state` (via DO) | GET | Get current Yjs state as binary |
| `/users` (via DO) | GET | Get current users JSON |

## Types Reference

```typescript
interface CollabUser {
  id: string
  name: string
  color: string
}

interface CollabAwarenessState {
  user: CollabUser
  cursor: { x: number; y: number } | null
  selection?: { anchor: number; head: number } | null
  selectedNodeId?: string | null
  ghostNode?: { id: string; position: { x: number; y: number } } | null
  [key: string]: unknown  // Extensible
}

interface CollabConnectionState {
  connected: boolean
  synced: boolean
  error: Error | null
}

type CollabStructure = 'map' | 'array' | 'xmlFragment' | 'text'
```

## Dependencies

- **Extends**: `@friendlyinternet/nuxt-crouton`
- **Runtime**: `yjs`, `y-protocols`
- **Dev**: `@cloudflare/workers-types`

## Phase Roadmap

This package is part of a 7-phase collaboration implementation:

| Phase | Status | Description |
|-------|--------|-------------|
| 1 | ✅ Complete | Package foundation (this) |
| 2 | Pending | Core composables (useCollabSync, useCollabPresence, useCollabEditor) |
| 3 | Pending | UI components (Status, Presence, Cursors) |
| 4 | Pending | Refactor crouton-flow to use this package |
| 5 | Pending | Add collaborative editing to crouton-pages |
| 6 | Pending | Global presence ("2 people editing" in lists) |
| 7 | Pending | Testing and documentation |

## Testing

```bash
# MANDATORY after any changes
npx nuxt typecheck

# Note: In the monorepo, typecheck may show errors from other packages.
# Verify the collab package's own files compile correctly:
cd packages/nuxt-crouton-collab
npx tsc --noEmit --skipLibCheck app/types/collab.ts
```

## Common Tasks

### Add a new room type

1. No changes needed to this package
2. Consumer creates composable using `useCollabSync` with new type
3. Consumer handles domain-specific syncing to collection tables

### Debug connection issues

1. Check browser WebSocket tab in DevTools
2. Verify `type` and `roomId` query params
3. Check Cloudflare Durable Object logs
4. Verify D1 migration was run

### Check who's in a room

```bash
# Via curl (when DO is running)
curl https://your-app.com/api/collab/room-123/users
```
