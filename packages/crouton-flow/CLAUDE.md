# CLAUDE.md - @fyit/crouton-flow

## Package Purpose

Vue Flow integration for Nuxt Crouton. Renders collection data as interactive node graphs with automatic DAG layout, real-time multiplayer sync via Yjs CRDTs, and presence awareness.

**Uses crouton-collab for collaboration infrastructure** (as of Phase 4). Connection management, Yjs sync, and presence tracking are now provided by the shared collab package.

## Key Files

| File | Purpose |
|------|---------|
| `app/components/Flow.vue` | Main graph component |
| `app/composables/useFlowSync.ts` | Flow sync (wraps useCollabSync) |
| `app/composables/useFlowPresence.ts` | Presence UI utilities |
| `app/types/yjs.ts` | Flow node types (uses collab types) |
| `server/durable-objects/FlowRoom.ts` | **DEPRECATED** - Use CollabRoom |
| `server/routes/api/flow/[flowId]/ws.ts` | **DEPRECATED** - Use collab endpoint |

## Dependencies

- **Extends**: `@fyit/crouton-collab` (for collaboration infrastructure)
- **Peer Dependencies**: `@fyit/crouton`
- **Core**: `@vue-flow/core`, `@dagrejs/dagre`, `yjs`
- **Plugins**: `@vue-flow/background`, `@vue-flow/controls`, `@vue-flow/minimap`

## Basic Usage

```vue
<CroutonFlow
  :rows="decisions"
  collection="decisions"
  parent-field="parentId"
  position-field="position"
/>
```

## Real-time Multiplayer

```vue
<CroutonFlow
  collection="decisions"
  sync
  :flow-id="projectId"
/>
```

When `sync` is enabled:
1. Uses crouton-collab's CollabRoom Durable Object
2. Connects to `/api/collab/[flowId]/ws?type=flow`
3. Yjs CRDT manages all node state with conflict resolution
4. Changes broadcast to all connected clients in real-time
5. Dual persistence: Yjs blob + individual rows

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `rows` | `array` | - | Collection rows (not needed with sync) |
| `collection` | `string` | **required** | Collection name |
| `parentField` | `string` | `'parentId'` | Parent relationship field |
| `positionField` | `string` | `'position'` | Node position field |
| `labelField` | `string` | `'title'` | Node label field |
| `sync` | `boolean` | `false` | Enable real-time sync |
| `flowId` | `string` | - | Flow ID (required with sync) |
| `controls` | `boolean` | `true` | Show zoom controls |
| `minimap` | `boolean` | `false` | Show minimap |
| `draggable` | `boolean` | `true` | Enable node dragging |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `nodeClick` | `(nodeId, data)` | Node clicked |
| `nodeDblClick` | `(nodeId, data)` | Node double-clicked |
| `nodeMove` | `(nodeId, position)` | Node moved |
| `edgeClick` | `(edgeId)` | Edge clicked |

## Composables

### useFlowSync (Wraps useCollabSync)

```typescript
// Provides flow-specific operations on top of collab sync
const {
  nodes, connected, synced, error, users,
  createNode, updateNode, updatePosition, deleteNode,
  selectNode, updateCursor,
  updateGhostNode, clearGhostNode
} = useFlowSync({ flowId: 'my-flow', collection: 'decisions' })
```

### useFlowPresence (Uses collab types)

```typescript
// Presence UI utilities for flow graphs
const { otherUsers, getUsersSelectingNode, getNodePresenceStyle, getUserColor } = useFlowPresence({
  users: computed(() => syncState.users),
  currentUserId: currentUser.id
})
```

## UI Components

Flow.vue uses these components from crouton-collab:

| Component | Purpose | Props |
|-----------|---------|-------|
| `CollabStatus` | Connection status dot | `connected`, `synced`, `error` |
| `CollabPresence` | User avatars | `users`, `maxVisible`, `size` |
| `CollabCursors` | Remote cursor overlay | `users`, `showLabels` |

## Custom Node Components

Create `[Collection]Node.vue` for custom rendering:

```vue
<!-- app/components/DecisionsNode.vue -->
<script setup lang="ts">
defineProps<{
  data: Record<string, unknown>
  selected: boolean
  dragging: boolean
  label?: string
}>()
</script>

<template>
  <div class="custom-node" :class="{ selected }">
    <h3>{{ data.title }}</h3>
  </div>
</template>
```

## Sync Prerequisites

### 1. Extend crouton-collab in your app

The flow package already extends crouton-collab, so you get this automatically when extending flow:

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  extends: [
    '@fyit/crouton',
    '@fyit/crouton-flow'  // Already extends crouton-collab
  ]
})
```

### 2. Configure Cloudflare Durable Objects

```toml
# wrangler.toml
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
  --file=./node_modules/@fyit/crouton-collab/server/database/migrations/0001_yjs_collab_states.sql
```

### 4. Authentication

Users are auto-detected via `useUserSession()` from crouton-auth.

## Architecture

```
Clients → WebSocket → /api/collab/[flowId]/ws?type=flow
                              ↓
                    CollabRoom Durable Object
                              ↓
                    Yjs Y.Doc (Y.Map for nodes)
                              ↓
                    D1 (yjs_collab_states + collection tables)
```

**Note:** The old `/api/flow/[flowId]/ws` endpoint and `FlowRoom` Durable Object are deprecated but kept for backward compatibility.

## Migration from Standalone FlowRoom

If you were using the old flow-specific infrastructure:

1. **No code changes needed** - useFlowSync now wraps useCollabSync internally
2. **Update Cloudflare config** - Replace FlowRoom with CollabRoom
3. **Data migration** - Move data from `yjs_flow_states` to `yjs_collab_states` with `room_type='flow'`

## Component Naming

Components auto-import with `CroutonFlow` prefix:
- `Flow.vue` → `<CroutonFlow />`

## Testing

```bash
npx nuxt typecheck  # MANDATORY after changes
```
