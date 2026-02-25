# crouton-mail — Generic Email System for Crouton Collections

## Summary

Extract the email template + trigger system from `crouton-bookings` into a standalone `crouton-mail` package that works with **any** crouton collection. Collections define their triggers, variables, and recipient logic via `defineMailConfig()`. The existing `crouton-email` package stays as the transport layer (Resend).

## Problem

The bookings package has a production-ready email engine (templates, triggers, logs, admin UI, multi-locale, AI generation) — but it's hardwired to bookings. Any other collection that needs transactional emails (orders, registrations, tickets, applications) would have to duplicate all of that infrastructure.

## Architecture

```
crouton-email        → Transport (Resend API, vue-email rendering) — UNCHANGED
crouton-mail   [NEW] → Generic email logic (templates, triggers, variables, logs, scheduler, UI)
crouton-bookings     → Registers its mail config via defineMailConfig() — CONSUMER
```

### Package Responsibilities

| Package | Owns |
|---------|------|
| `crouton-email` | Resend client, `useEmailService()`, provider registration |
| `crouton-mail` | Template CRUD, variable rendering, trigger matching, email logs, scheduled sends, admin UI |
| `crouton-bookings` | `defineMailConfig()` with booking-specific triggers/variables/recipients |

## Core Abstraction: `defineMailConfig()`

Each domain package (or app) registers its email capabilities:

```typescript
// packages/crouton-bookings/server/utils/mail-config.ts
import { defineMailConfig } from '@fyit/crouton-mail/server'

defineMailConfig({
  collection: 'bookings',
  label: 'Bookings',

  triggers: [
    { id: 'record_created', label: 'Booking Created' },
    { id: 'record_cancelled', label: 'Booking Cancelled' },
    {
      id: 'scheduled_before',
      label: 'Reminder Before',
      scheduled: true,
      dateField: 'date',
      direction: 'before'
    },
    {
      id: 'scheduled_after',
      label: 'Follow-Up After',
      scheduled: true,
      dateField: 'date',
      direction: 'after'
    }
  ],

  variables: [
    // Direct field mapping
    { key: 'customer_name', field: 'customerName', label: 'Customer Name' },
    { key: 'customer_email', field: 'customerEmail', label: 'Customer Email' },
    // Computed variables (need access to record + locale)
    { key: 'booking_date', label: 'Booking Date',
      compute: (record, locale) => formatBookingDate(record.date, locale) },
    { key: 'booking_slot', label: 'Time Slot',
      compute: (record) => resolveSlotLabels(record.slotIds, record.locationSlots) },
    { key: 'booking_reference', label: 'Booking Reference',
      compute: (record) => `BK-${record.id.slice(0, 8).toUpperCase()}` },
  ],

  // Team-level variables are always available (team_name, team_email, team_phone)
  // No need to declare them — crouton-mail provides them automatically.

  recipients: {
    primary: (record) => ({ email: record.customerEmail, name: record.customerName }),
    notification: 'team' // sends to team contact email
  },

  // Optional: scope templates to a sub-entity (e.g. per-location templates)
  scope: {
    field: 'locationId',
    collection: 'locations',
    label: 'Location'
  },

  // Optional: demo data for template preview
  demoData: {
    customerName: 'Emma van der Berg',
    customerEmail: 'emma.vanderberg@gmail.com',
    date: new Date('2025-01-24T14:00:00'),
    slotIds: ['slot-1'],
    locationSlots: [{ id: 'slot-1', label: '14:00 - 15:00' }]
  }
})
```

### Built-In Variables (always available)

These are provided by `crouton-mail` for every collection — no config needed:

| Variable | Source |
|----------|--------|
| `{{team_name}}` | Team record |
| `{{team_email}}` | Team contact email |
| `{{team_phone}}` | Team contact phone |
| `{{record_id}}` | Record primary key |

## Database Schema

Two shared collections (app-level, not per-domain):

### `mailTemplates`

| Field | Type | Notes |
|-------|------|-------|
| `id` | text PK | |
| `teamId` | text | |
| `collectionId` | text | Which collection config this belongs to |
| `name` | text | Template name (translatable) |
| `subject` | text | Email subject (translatable) |
| `body` | text | Email body HTML (translatable) |
| `fromEmail` | text | Sender override (optional) |
| `triggerType` | text | Matches a trigger `id` from config |
| `recipientType` | text | `primary`, `notification`, `both` |
| `isActive` | boolean | |
| `scopeValue` | text | Optional — e.g. locationId |
| `daysOffset` | integer | For scheduled triggers |
| `translations` | json | `{ "nl": { "name": "...", "subject": "...", "body": "..." } }` |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | |

### `mailLogs`

| Field | Type | Notes |
|-------|------|-------|
| `id` | text PK | |
| `teamId` | text | |
| `collectionId` | text | |
| `recordId` | text | Generic — the record that triggered the email |
| `templateId` | text | Which template was used |
| `recipientEmail` | text | |
| `triggerType` | text | |
| `status` | text | `pending`, `sent`, `failed` |
| `sentAt` | timestamp | |
| `error` | text | Error message if failed |
| `createdAt` | timestamp | |

## Trigger System

### Immediate Triggers (hook-based)

Listens to `crouton:mutation` (client-side) and the existing `crouton:operation` hooks (server-side).

The key integration point: **CRUD API endpoints** in crouton-core already call `crouton:mutation` hooks on create/update/delete via `useCollectionMutation()`. On the server side, `crouton:operation` is emitted by domain packages.

For `crouton-mail`, we add a **server-side Nitro plugin** that listens to a new standardized hook:

```typescript
// packages/crouton-mail/server/plugins/mail-trigger.ts
export default defineNitroPlugin((nitroApp) => {
  // Listen for record lifecycle events
  nitroApp.hooks.hook('crouton:record:created', async ({ collection, record, teamId, userId }) => {
    const config = getMailConfig(collection)
    if (!config) return

    const trigger = config.triggers.find(t => t.id === 'record_created')
    if (!trigger) return

    await processMailTrigger({ config, trigger, record, teamId, userId })
  })

  nitroApp.hooks.hook('crouton:record:deleted', async ({ collection, record, teamId, userId }) => {
    const config = getMailConfig(collection)
    if (!config) return

    const trigger = config.triggers.find(t => t.id === 'record_cancelled' || t.id === 'record_deleted')
    if (!trigger) return

    await processMailTrigger({ config, trigger, record, teamId, userId })
  })
})
```

Domain packages emit these hooks from their API endpoints:

```typescript
// In booking creation endpoint
nitroApp.hooks.callHook('crouton:record:created', {
  collection: 'bookings',
  record: createdBooking,
  teamId,
  userId
})
```

### Scheduled Triggers (Cloudflare Workers Cron)

For `scheduled_before` and `scheduled_after` triggers, `crouton-mail` runs a **Cloudflare Workers scheduled task** (cron trigger):

```typescript
// packages/crouton-mail/server/tasks/mail-scheduler.ts
export default defineTask({
  meta: { name: 'mail:process-scheduled', description: 'Process scheduled email triggers' },

  async run() {
    const configs = getAllMailConfigs()

    for (const config of configs) {
      const scheduledTriggers = config.triggers.filter(t => t.scheduled)

      for (const trigger of scheduledTriggers) {
        // Find active templates for this trigger
        const templates = await getActiveTemplates(config.collection, trigger.id)

        for (const template of templates) {
          // Query records where:
          // - dateField +/- daysOffset = today
          // - no mailLog exists yet for this record+trigger combo
          const records = await findRecordsDueForEmail({
            collection: config.collection,
            dateField: trigger.dateField,
            direction: trigger.direction,
            daysOffset: template.daysOffset
          })

          for (const record of records) {
            await processMailTrigger({ config, trigger, record, teamId: record.teamId })
          }
        }
      }
    }
  }
})
```

App-level wrangler.toml:

```toml
[triggers]
crons = ["0 7 * * *"]  # Run daily at 7:00 AM
```

## Recipient Model

Replaces the booking-specific `customer`/`admin`/`both` with a generic model:

| Type | Meaning | Example |
|------|---------|---------|
| `primary` | The person the record is about | Customer, applicant, registrant |
| `notification` | People who should be notified | Team admin, manager, assigned staff |
| `both` | Send to both | Confirmation to customer + copy to admin |

Resolved from `defineMailConfig().recipients`:
- `primary` — function that extracts email/name from the record
- `notification` — `'team'` (use team contact) or a function

## Admin UI

### Template Management Page

Collection-aware — one unified page for all collections:

```
/admin/[team]/mail-templates
```

UI flow:
1. **Collection picker** — dropdown: "Bookings", "Registrations", etc. (populated from registered configs)
2. **Trigger filter** — tabs or chips per trigger type (loaded from that collection's config)
3. **Template list** — name, trigger, recipient type, active toggle, scope badge
4. **Template editor** — same rich text editor as current bookings
   - **Variable picker** — buttons populated from collection's `variables` config (see screenshot)
   - **Locale tabs** — EN / NL / FR (from crouton-i18n)
   - **Live preview** — uses `demoData` from config or auto-generates from collection schema
   - **Scope selector** — e.g. "All Locations" / specific location (if config has `scope`)
   - **Days offset** — only shown for scheduled triggers

### Email Logs Page

```
/admin/[team]/mail-logs
```

Filterable by collection, trigger type, status, date range. Shows sent/pending/failed with error details.

### Per-Record Email Status

A composable for any collection detail page to show email history for that record:

```typescript
const { logs, stats, resend } = useRecordMailLogs(collectionId, recordId)
// stats = { sent: 2, pending: 0, failed: 1 }
// resend(triggerType) — manual resend
```

## Package Structure

```
packages/crouton-mail/
├── nuxt.config.ts
├── package.json
├── types/
│   └── index.ts                          # MailConfig, MailTrigger, MailVariable, etc.
├── server/
│   ├── utils/
│   │   ├── mail-config.ts                # defineMailConfig() + getMailConfig() registry
│   │   ├── mail-service.ts               # Orchestration: fetch templates → render → send → log
│   │   ├── mail-renderer.ts              # {{variable}} replacement engine
│   │   ├── mail-templates.ts             # Template CRUD helpers
│   │   └── mail-logs.ts                  # Log CRUD + stats helpers
│   ├── plugins/
│   │   └── mail-trigger.ts               # Listens to crouton:record:* hooks
│   ├── tasks/
│   │   └── mail-scheduler.ts             # Cloudflare cron for scheduled triggers
│   └── api/
│       └── crouton-mail/
│           └── teams/[id]/
│               ├── mail-configs.get.ts   # List registered configs (for UI)
│               ├── mail-templates/       # CRUD
│               └── mail-logs/            # Read + stats
├── app/
│   ├── components/
│   │   ├── CroutonMailTemplateEditor.vue # Rich text + variable picker
│   │   ├── CroutonMailPreview.vue        # Live preview with demo data
│   │   ├── CroutonMailVariablePicker.vue # Insert variable buttons
│   │   └── CroutonMailLogStatus.vue      # Per-record email status badge
│   ├── composables/
│   │   ├── useMailTemplates.ts           # Template CRUD composable
│   │   ├── useMailVariables.ts           # Variable definitions per collection
│   │   └── useRecordMailLogs.ts          # Per-record log status + resend
│   └── pages/
│       └── admin/[team]/
│           ├── mail-templates.vue        # Template management
│           └── mail-logs.vue             # Log viewer
└── CLAUDE.md
```

## Migration Path

Non-breaking, incremental:

### Phase 1: Extract Core
1. Create `crouton-mail` package with types, config registry, renderer, service
2. Move generic parts from `crouton-bookings/server/utils/booking-emails.ts` and `email-service.ts`
3. Move `bookingsEmailtemplates` schema → `mailTemplates` with added `collectionId`
4. Move `bookingsEmaillogs` schema → `mailLogs` with `recordId` replacing `bookingId`

### Phase 2: Wire Up Bookings
5. Create `defineMailConfig()` in crouton-bookings with current 4 triggers + 14 variables
6. Bookings email sending calls `crouton-mail` service instead of its own
7. Migration script: add `collectionId: 'bookings'` to existing template/log rows

### Phase 3: Admin UI
8. Extract template editor components from bookings into crouton-mail
9. Make collection picker, variable picker, trigger tabs dynamic
10. Add mail-logs page

### Phase 4: Scheduler
11. Implement Cloudflare cron task for scheduled triggers
12. Replace bookings' manual reminder/follow-up logic with generic scheduler

### Phase 5: Standardize Hooks
13. Add `crouton:record:created/updated/deleted` to `crouton-hooks.d.ts`
14. Emit from CRUD endpoints (crouton-core or generated code)
15. crouton-mail plugin listens and auto-triggers

## Hook System Extension

New hooks to add to `crouton-core/crouton-hooks.d.ts`:

```typescript
// Record lifecycle (server-side)
'crouton:record:created': (payload: {
  collection: string
  record: Record<string, any>
  teamId: string
  userId?: string
}) => void

'crouton:record:updated': (payload: {
  collection: string
  record: Record<string, any>
  previousData?: Record<string, any>
  teamId: string
  userId?: string
}) => void

'crouton:record:deleted': (payload: {
  collection: string
  recordId: string
  teamId: string
  userId?: string
}) => void

// Mail lifecycle (emitted by crouton-mail)
'crouton:mail:sent': (payload: {
  collection: string
  recordId: string
  templateId: string
  recipientEmail: string
  triggerType: string
  teamId: string
}) => void

'crouton:mail:failed': (payload: {
  collection: string
  recordId: string
  error: string
  teamId: string
}) => void
```

## Configuration

### App-level (nuxt.config.ts)

```typescript
runtimeConfig: {
  croutonMail: {
    enabled: true,
    schedulerEnabled: true,    // Enable cron for scheduled triggers
    schedulerTime: '07:00',    // Default send time for scheduled emails
    maxRetriesOnFailure: 3
  },
  public: {
    croutonMail: {
      enabled: true
    }
  }
}
```

### wrangler.toml (for scheduled sends)

```toml
[triggers]
crons = ["0 7 * * *"]
```

## Open Design Decisions

1. **Should `crouton-mail` generate its own DB collections via the crouton CLI, or ship a fixed schema?**
   Fixed schema is simpler (like crouton-events), but CLI-generated would follow the existing collection pattern.

2. **Should the variable picker support nested record fields?**
   E.g. `{{record.location.name}}` via relation traversal. Useful but adds complexity.

3. **Should we support webhook triggers?**
   E.g. "send email when Stripe payment succeeds" — external events, not just CRUD.

## Dependencies

- `@fyit/crouton-core` — hooks, team context, collection utils
- `@fyit/crouton-email` — transport (Resend)
- `@fyit/crouton-i18n` — locale support for templates
- `@fyit/crouton-editor` — rich text editor (optional, for template body editing)

## What Other Collections Get for Free

Once `crouton-mail` exists, adding emails to any collection is just:

```typescript
// In your domain package
defineMailConfig({
  collection: 'registrations',
  label: 'Registrations',
  triggers: [
    { id: 'record_created', label: 'Registration Confirmed' },
    { id: 'record_deleted', label: 'Registration Cancelled' },
  ],
  variables: [
    { key: 'participant_name', field: 'name', label: 'Participant Name' },
    { key: 'event_date', field: 'eventDate', label: 'Event Date' },
  ],
  recipients: {
    primary: (record) => ({ email: record.email, name: record.name }),
    notification: 'team'
  }
})
```

That's it. Templates, logs, admin UI, sending, scheduling — all handled by `crouton-mail`.
