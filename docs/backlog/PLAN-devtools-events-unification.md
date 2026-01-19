# DevTools & Events Unification Plan

## Overview

Unify the observability story for Nuxt Crouton by clarifying ownership between `nuxt-crouton-events` (production audit trail) and `nuxt-crouton-devtools` (development tooling), with optional integration when both are installed.

---

## Current State

### nuxt-crouton-events (v0.3.0 BETA)
- Subscribes to `crouton:mutation` hook
- Persists events to database (team-scoped)
- Provides `useCroutonEvents()`, `useCroutonEventTracker()`, `useCroutonEventsHealth()`
- Generates basic list component
- **Gap**: No rich admin UI for viewing audit logs

### nuxt-crouton-devtools (v0.3.0)
- In-memory operation tracking (500 ops circular buffer)
- Nitro plugin tracking HTTP requests
- 4 tabs: Collections Inspector, Operations Monitor, API Explorer, Data Browser
- **Gap**: No awareness of events package, duplicates some tracking

### The Problem
- Two separate tracking systems for the same mutations
- No correlation between HTTP operations and application events
- Events package lacks proper admin UI
- DevTools doesn't leverage persisted events when available

---

## Proposed Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    nuxt-crouton (core)                          │
│  • Owns crouton:mutation hook definition                        │
│  • Emits from useCollectionMutation / useTreeMutation           │
│  • Zero persistence, zero UI                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────────────┐   ┌─────────────────────────────┐
│   nuxt-crouton-events       │   │   nuxt-crouton-devtools     │
│   (Production)              │   │   (Development only)        │
├─────────────────────────────┤   ├─────────────────────────────┤
│ • Owns events collection    │   │ • In-memory operation store │
│ • Database persistence      │   │ • Collections inspector     │
│ • Composables & APIs        │   │ • API explorer              │
│ • Admin UI components       │   │ • Data browser              │
│ • Works standalone          │   │ • Detects events package    │
│                             │   │ • Enhanced UI if available  │
└─────────────────────────────┘   └─────────────────────────────┘
```

---

## Ownership Model

| Responsibility | Owner | Status |
|----------------|-------|--------|
| Hook definition (`crouton:mutation`) | `nuxt-crouton` | ✅ Done |
| Hook emission | `nuxt-crouton` | ✅ Done |
| Events collection schema | `nuxt-crouton-events` | ✅ Done |
| Database persistence | `nuxt-crouton-events` | ✅ Done |
| `useCroutonEvents()` | `nuxt-crouton-events` | ✅ Done |
| `useCroutonEventsHealth()` | `nuxt-crouton-events` | ✅ Done |
| **Admin UI for audit logs** | `nuxt-crouton-events` | 🔴 Needs work |
| Dev operation tracking | `nuxt-crouton-devtools` | ✅ Done |
| **Events integration in devtools** | `nuxt-crouton-devtools` | 🔴 New feature |

---

## Phase 1: Events Admin UI

**Package**: `nuxt-crouton-events`

### 1.1 Activity Log Page Component

Pre-built page for `/admin/activity` or similar:

```vue
<!-- packages/nuxt-crouton-events/app/components/CroutonActivityLog.vue -->
<script setup lang="ts">
const props = defineProps<{
  /** Filter to specific collection */
  collection?: string
  /** Filter to specific user */
  userId?: string
  /** Page size */
  pageSize?: number
}>()

const { data: events, pending, refresh } = useCroutonEvents({
  collectionName: props.collection,
  userId: props.userId,
  limit: props.pageSize ?? 50
})
</script>

<template>
  <div class="crouton-activity-log">
    <!-- Filters bar -->
    <CroutonActivityFilters v-model="filters" />

    <!-- Timeline view -->
    <CroutonActivityTimeline :events="events" />

    <!-- Pagination -->
    <UPagination v-model="page" :total="total" />
  </div>
</template>
```

### 1.2 Activity Timeline Component

Visual timeline of changes:

```
┌─ Today ────────────────────────────────────────────────────────┐
│                                                                 │
│  ● 14:32  CREATE  tasks       "Implement login"      @john     │
│           ├─ title: "Implement login"                          │
│           ├─ status: "todo"                                    │
│           └─ priority: "high"                                  │
│                                                                 │
│  ● 14:28  UPDATE  projects    2 fields changed       @jane     │
│           ├─ title: "Old Name" → "New Name"                    │
│           └─ status: "draft" → "active"                        │
│                                                                 │
│  ● 14:15  DELETE  notes       "Meeting notes"        @john     │
│                                                                 │
├─ Yesterday ────────────────────────────────────────────────────┤
│  ...                                                           │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 Event Detail Modal

Rich diff view for a single event:

```vue
<!-- packages/nuxt-crouton-events/app/components/CroutonEventDetail.vue -->
<template>
  <UModal v-model="open">
    <template #content>
      <div class="p-6">
        <!-- Header -->
        <div class="flex items-center gap-3 mb-4">
          <UBadge :color="operationColor">{{ event.operation }}</UBadge>
          <span class="font-medium">{{ event.collectionName }}</span>
          <span class="text-gray-500">{{ event.itemId }}</span>
        </div>

        <!-- Meta -->
        <dl class="grid grid-cols-2 gap-2 text-sm mb-4">
          <dt class="text-gray-500">When</dt>
          <dd>{{ formatDateTime(event.timestamp) }}</dd>
          <dt class="text-gray-500">Who</dt>
          <dd>{{ event.userName || event.userId }}</dd>
        </dl>

        <!-- Changes table -->
        <CroutonEventChangesTable :changes="event.changes" />
      </div>
    </template>
  </UModal>
</template>
```

### 1.4 Export Functionality

For compliance requirements:

```typescript
// packages/nuxt-crouton-events/app/composables/useCroutonEventsExport.ts
export function useCroutonEventsExport() {
  const exportToCSV = async (filters: EventFilters) => {
    const events = await $fetch('/api/crouton-events/export', {
      query: { ...filters, format: 'csv' }
    })
    downloadFile(events, 'audit-log.csv', 'text/csv')
  }

  const exportToJSON = async (filters: EventFilters) => {
    // Similar for JSON export
  }

  return { exportToCSV, exportToJSON }
}
```

### 1.5 Files to Create

```
packages/nuxt-crouton-events/
├── app/
│   ├── components/
│   │   ├── CroutonActivityLog.vue        # Main page component
│   │   ├── CroutonActivityTimeline.vue   # Timeline visualization
│   │   ├── CroutonActivityFilters.vue    # Filter controls
│   │   ├── CroutonEventDetail.vue        # Detail modal
│   │   └── CroutonEventChangesTable.vue  # Before/after diff table
│   └── composables/
│       └── useCroutonEventsExport.ts     # Export functionality
└── server/
    └── api/
        └── crouton-events/
            └── export.get.ts             # Export endpoint
```

---

## Phase 2: DevTools Events Integration

**Package**: `nuxt-crouton-devtools`

### 2.1 Detect Events Package

```typescript
// packages/nuxt-crouton-devtools/src/module.ts
export default defineNuxtModule({
  setup(options, nuxt) {
    // Check if events package is installed
    const hasEventsPackage = nuxt.options._layers.some(
      layer => layer.config.name?.includes('nuxt-crouton-events')
    )

    // Expose to runtime
    nuxt.options.runtimeConfig.public.croutonDevtools = {
      hasEventsPackage
    }

    if (hasEventsPackage) {
      // Register additional RPC handlers for events
      addServerHandler({
        route: '/__nuxt_crouton_devtools/api/events',
        handler: resolve('./runtime/server-rpc/events.ts')
      })
    }
  }
})
```

### 2.2 Unified Activity Tab

Replace "Operations Monitor" with "Activity" when events available:

```
┌─────────────────────────────────────────────────────────────────┐
│  Activity                                     [Live] [Persisted]│
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Mode: ○ Live (in-memory)  ● Persisted (database)              │
│                                                                 │
│  ┌─ Stats ─────────────────────────────────────────────────┐   │
│  │ Total: 1,247 │ Today: 42 │ Success: 99.2% │ Health: ✓  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─ Filters ───────────────────────────────────────────────┐   │
│  │ Collection: [All ▼] Operation: [All ▼] User: [All ▼]   │   │
│  │ Date: [Last 24h ▼]                      [Export CSV]    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─ Timeline ──────────────────────────────────────────────┐   │
│  │  ● 14:32:15  CREATE  tasks      "New task"     @john    │   │
│  │  ● 14:32:10  UPDATE  projects   title changed  @jane    │   │
│  │  ...                                                     │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 Event ↔ Operation Correlation

Link HTTP operations to application events:

```typescript
interface UnifiedActivity {
  id: string
  timestamp: Date

  // From events package (if available)
  event?: CroutonEvent

  // From devtools operation tracking
  operation?: {
    method: string
    path: string
    status: number
    duration: number
  }

  // Computed
  collection: string
  type: 'create' | 'update' | 'delete' | 'move' | 'reorder'
  userId?: string
}
```

### 2.4 Health Dashboard Integration

Show `useCroutonEventsHealth()` data:

```
┌─ Event Health ──────────────────────────────────────────────────┐
│                                                                 │
│  Tracking Status    ✓ Enabled                                  │
│  Success Rate       99.2% (1,247 / 1,257)                      │
│  Failed (24h)       10 events                                   │
│  Database Size      4.2 MB                                      │
│  Total Events       8,432                                       │
│  Retention          90 days                                     │
│                                                                 │
│  [View Failed Events]  [Clear Old Events]                       │
└─────────────────────────────────────────────────────────────────┘
```

### 2.5 Files to Modify/Create

```
packages/nuxt-crouton-devtools/
├── src/
│   ├── module.ts                          # Add events detection
│   └── runtime/
│       └── server-rpc/
│           ├── events.ts                  # Query persisted events
│           ├── eventsHealth.ts            # Health stats
│           └── client.ts                  # Update UI for events
```

---

## Phase 3: Enhanced Hook System

**Package**: `nuxt-crouton` (core)

### 3.1 Richer Event Payload

Extend hook payload with HTTP context:

```typescript
// packages/nuxt-crouton/crouton-hooks.d.ts
interface CroutonMutationEvent {
  // Existing
  operation: 'create' | 'update' | 'delete' | 'move' | 'reorder'
  collection: string
  itemId?: string
  itemIds?: string[]
  data?: Record<string, unknown>
  updates?: Record<string, unknown>
  result?: unknown

  // New: Before state (for diff calculation)
  before?: Record<string, unknown>

  // New: Request context
  request?: {
    id: string           // Correlation ID
    method: string
    path: string
    startTime: number
  }
}
```

### 3.2 Correlation IDs

Add request correlation for linking events to operations:

```typescript
// In useCollectionMutation
const requestId = crypto.randomUUID()

await nuxtApp.hooks.callHook('crouton:mutation', {
  operation: 'create',
  collection,
  itemId: result.id,
  data: input,
  result,
  request: {
    id: requestId,
    method: 'POST',
    path: `/api/crouton-collection/${collection}`,
    startTime: performance.now()
  }
})
```

---

## Phase 4: Hook Inspector (DevTools)

Debug custom hook subscriptions:

```
┌─ Hook Inspector ────────────────────────────────────────────────┐
│                                                                 │
│  Hook: crouton:mutation                                         │
│                                                                 │
│  Registered Listeners:                                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 1. event-listener.ts        nuxt-crouton-events    ✓ OK  │  │
│  │ 2. devtools-tracker.ts      nuxt-crouton-devtools  ✓ OK  │  │
│  │ 3. slack-notifier.ts        app                    ⚠ Err │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Recent Hook Calls:                                             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 14:32:15.123  CREATE tasks                               │  │
│  │   → event-listener.ts       12ms  ✓                      │  │
│  │   → devtools-tracker.ts      1ms  ✓                      │  │
│  │   → slack-notifier.ts       --    ✗ Rate limited         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Order

| Phase | Scope | Effort | Priority |
|-------|-------|--------|----------|
| **1.1** Activity Timeline Component | events | 2h | High |
| **1.2** Activity Log Page | events | 2h | High |
| **1.3** Event Detail Modal | events | 1h | High |
| **1.4** Export functionality | events | 1h | Medium |
| **2.1** Detect events package | devtools | 0.5h | High |
| **2.2** Unified Activity tab | devtools | 3h | High |
| **2.3** Event ↔ Operation correlation | devtools | 2h | Medium |
| **2.4** Health dashboard | devtools | 1h | Medium |
| **3.1** Richer event payload | core | 1h | Low |
| **3.2** Correlation IDs | core | 1h | Low |
| **4** Hook Inspector | devtools | 3h | Low |

**Total estimated effort**: ~18 hours

---

## Migration Notes

### For Users

No breaking changes. Both packages continue to work standalone:

```typescript
// Works: Events only (production audit)
export default defineNuxtConfig({
  extends: ['@friendlyinternet/nuxt-crouton-events']
})

// Works: DevTools only (development)
export default defineNuxtConfig({
  extends: ['@friendlyinternet/nuxt-crouton-devtools']
})

// Works: Both (enhanced experience)
export default defineNuxtConfig({
  extends: [
    '@friendlyinternet/nuxt-crouton-events',
    '@friendlyinternet/nuxt-crouton-devtools'
  ]
})
```

### For Developers

- Events package gets new admin UI components
- DevTools detects events package automatically
- No configuration required for integration

---

## Success Criteria

- [ ] Events package has production-ready admin UI
- [ ] Non-dev users can view audit logs without devtools
- [ ] DevTools shows richer data when events package present
- [ ] Clear separation of concerns between packages
- [ ] Zero breaking changes to existing APIs
- [ ] Both packages work standalone
- [ ] Integration is automatic when both installed

---

## Open Questions

1. **Should events UI be a separate page or embedded in existing admin?**
   - Leaning toward: Provide components, let user decide placement

2. **Should devtools "Activity" tab replace or supplement "Operations Monitor"?**
   - Leaning toward: Replace when events available, keep for non-events users

3. **How to handle event retention in devtools view?**
   - Leaning toward: DevTools queries events API, respects retention settings

4. **Should we add real-time updates via SSE/WebSocket?**
   - Leaning toward: Nice to have, Phase 5

---

## Related Documents

- `/packages/nuxt-crouton-events/CLAUDE.md` - Events package documentation
- `/packages/nuxt-crouton-devtools/CLAUDE.md` - DevTools package documentation
- `/packages/nuxt-crouton/crouton-hooks.d.ts` - Hook type definitions