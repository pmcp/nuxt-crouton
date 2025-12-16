# CLAUDE.md - @friendlyinternet/nuxt-crouton-events

## Package Purpose

Automatic event tracking and audit trail for Nuxt Crouton collections. Hooks into `crouton:mutation` events to log all CREATE, UPDATE, DELETE operations with smart diff and user attribution.

## Key Files

| File | Purpose |
|------|---------|
| `app/composables/useCroutonEvents.ts` | Query enriched events with user data |
| `app/composables/useCroutonEventsHealth.ts` | Monitor tracking health |
| `app/components/List.vue` | Standard collection list component |
| `events-schema.json` | Event collection schema |

## How It Works

```
User Action → nuxt-crouton mutation → crouton:mutation hook
                                            ↓
                                    Event Listener Plugin
                                            ↓
                                    Smart Diff (old → new)
                                            ↓
                                    Async Tracking (non-blocking)
                                            ↓
                                    collectionEvents table
```

## Configuration

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  extends: [
    '@friendlyinternet/nuxt-crouton',
    '@friendlyinternet/nuxt-crouton-events'
  ],
  runtimeConfig: {
    public: {
      croutonEvents: {
        enabled: true,
        snapshotUserName: true,
        errorHandling: {
          mode: 'toast',        // 'silent' | 'toast' | 'throw'
          logToConsole: true
        },
        retention: {
          enabled: true,
          days: 90,
          maxEvents: 100000
        }
      }
    }
  }
})
```

## Event Schema

```typescript
interface CroutonEvent {
  id: string
  timestamp: Date
  operation: 'create' | 'update' | 'delete'
  collectionName: string
  itemId: string
  teamId: string
  userId: string
  userName: string              // Snapshot at time of event
  changes: {
    fieldName: string
    oldValue: string | null     // JSON stringified
    newValue: string | null
  }[]
  metadata?: {
    ipAddress?: string
    userAgent?: string
    duration?: number
  }
}
```

## Usage

```typescript
// Query events
const { data: events } = await useCollectionQuery('collectionEvents', {
  teamId: currentTeam.id,
  filters: { collectionName: 'users', operation: 'update' }
})

// Enriched with current user data
const { data: enriched } = await useCroutonEvents({
  enrichUserData: true
})

// Health monitoring
const { data: health } = useCroutonEventsHealth()
// health.total, health.failed, health.lastError
```

## Component

```vue
<!-- Use generated list component -->
<CroutonEventsCollectionEventsList />
```

## Common Tasks

### Disable tracking for specific collection
Modify the event listener plugin to filter by collection name.

### Add custom metadata
Extend the event schema to include additional fields.

### Export audit trail
Query events with filters and export as JSON/CSV.

## Dependencies

- **Extends**: `@friendlyinternet/nuxt-crouton` (required)
- **Peer deps**: `nuxt ^4.0.0`, `@nuxt/ui ^4.0.0`

## Storage Estimate

- CREATE: ~500 bytes
- UPDATE: ~200-400 bytes (changed fields only)
- DELETE: ~150 bytes
- **10,000 events ≈ 3-5 MB**

## Testing

```bash
npx nuxt typecheck  # MANDATORY after changes
```
