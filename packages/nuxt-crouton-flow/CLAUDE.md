# CLAUDE.md - @friendlyinternet/nuxt-crouton-flow

## Package Purpose

Vue Flow integration for Nuxt Crouton. Renders collection data as interactive node graphs with automatic DAG layout, real-time multiplayer sync via Yjs CRDTs, and presence awareness.

## Key Files

| File | Purpose |
|------|---------|
| `app/components/Flow.vue` | Main graph component |
| `app/composables/useFlowSync.ts` | Real-time sync state |
| `app/composables/useFlowPresence.ts` | Presence UI utilities |

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
1. Yjs CRDT manages all node state
2. Cloudflare Durable Object handles WebSocket connections
3. Changes broadcast to all connected clients
4. Dual persistence: Yjs blob + individual rows

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

```typescript
// Direct sync access
const {
  nodes, connected, synced, error, users,
  createNode, updateNode, updatePosition, deleteNode,
  selectNode, updateCursor
} = useFlowSync({ flowId: 'my-flow', collection: 'decisions' })

// Presence UI
const { otherUsers, getUsersSelectingNode, getNodePresenceStyle } = useFlowPresence({
  users: computed(() => syncState.users),
  currentUserId: currentUser.id
})
```

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

1. **D1 Migration**: Create `yjs_flow_states` table
2. **Wrangler Config**: Configure `FlowRoom` Durable Object
3. **Authentication**: Users via `useUserSession()`

## Architecture

```
Clients → WebSocket → Cloudflare Durable Object (FlowRoom)
                              ↓
                    Yjs Y.Doc per flow
                              ↓
                    D1 (yjs_flow_states + collection tables)
```

## Component Naming

Components auto-import with `CroutonFlow` prefix:
- `Flow.vue` → `<CroutonFlow />`

## Dependencies

- **Extends**: `@friendlyinternet/nuxt-crouton`
- **Core**: `@vue-flow/core`, `@dagrejs/dagre`, `yjs`
- **Plugins**: `@vue-flow/background`, `@vue-flow/controls`, `@vue-flow/minimap`

## Testing

```bash
npx nuxt typecheck  # MANDATORY after changes
```
