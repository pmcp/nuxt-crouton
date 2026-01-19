# CLAUDE.md - @fyit/crouton-devtools

## Package Purpose

DevTools integration for Nuxt Crouton. Provides visual inspection and management of CRUD collections in Nuxt DevTools with zero config.

## Key Files

| File | Purpose |
|------|---------|
| `src/module.ts` | Nuxt module entry point |
| `src/runtime/pages/data-browser.vue` | Collection inspector UI |
| `src/runtime/server-rpc/client.ts` | Embedded DevTools UI (Vue app) |
| `src/runtime/server-rpc/collections.ts` | Get collections RPC |
| `src/runtime/server-rpc/operations.ts` | Get operations RPC |
| `src/runtime/server-rpc/events.ts` | Query persisted events (when events package installed) |
| `src/runtime/server-rpc/eventsHealth.ts` | Events health statistics |
| `src/runtime/server/utils/operationStore.ts` | In-memory operation tracking |
| `src/runtime/server/plugins/operationTracker.ts` | Nitro plugin for tracking API calls |

## Features

- **Collections Tab** - View all registered collections with search & filter
- **Operations Tab** - Monitor live CRUD operations in real-time
- **API Explorer Tab** - Test collection endpoints interactively
- **Data Browser Tab** - Browse collection data with layout options
- **Activity Tab** - Unified events view (when `nuxt-crouton-events` installed)
- Dark mode support
- Auto-refresh capabilities

## Installation

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: [
    '@nuxt/devtools',
    '@fyit/crouton-devtools'
  ],
  devtools: {
    enabled: true
  }
})
```

## What You'll See

### Collection Inspector

- **Collection Cards** - Quick overview of each collection
- **Search & Filter** - Find by name, layer, or API path
- **Layer Badges** - Internal/external/custom indicators
- **Detail View** - Click for full configuration

### Collection Details

- Name and key
- API path
- Component name
- Layer type
- Full JSON configuration

### Activity Tab (Events Integration)

When `nuxt-crouton-events` is installed, the Activity tab appears automatically:

- **Health Dashboard** - Total events, today's count, this week, status
- **Operation Breakdown** - CREATE/UPDATE/DELETE counts
- **Filters** - By collection, operation type, limit
- **Events List** - Timeline of persisted mutation events
- **Event ↔ Operation Correlation** - Link HTTP operations to events via itemId

The module auto-detects the events package via layer inspection.

## Architecture

```
src/
├── module.ts                    # Nuxt module (events detection, tab registration)
├── runtime/
│   ├── pages/
│   │   └── data-browser.vue    # Data browser page
│   ├── server-rpc/
│   │   ├── client.ts           # Embedded Vue app (all tabs)
│   │   ├── collections.ts      # Get collections
│   │   ├── endpoints.ts        # List endpoints
│   │   ├── operations.ts       # Track operations
│   │   ├── events.ts           # Query persisted events
│   │   └── eventsHealth.ts     # Events health stats
│   └── server/
│       ├── plugins/
│       │   └── operationTracker.ts  # Nitro plugin
│       └── utils/
│           └── operationStore.ts    # In-memory store
```

## Common Tasks

### Add new DevTools tab
1. Create page in `src/runtime/pages/`
2. Register in `module.ts` with `addCustomTab()`
3. Add server RPC if needed

### Add operation tracking
Use `src/runtime/server/utils/operationStore.ts` utilities.

## Development

```bash
# Build module
pnpm build

# Test in playground
cd playground && pnpm dev
```

## Roadmap

- ✅ Phase 1: Collection inspector
- ✅ Phase 2: CRUD operations monitoring, API testing
- ✅ Phase 3: Collection data browser
- ✅ Phase 4: Events integration (Activity tab)
- Phase 5: Generator history and rollback
- Phase 6: Schema validation, i18n manager

## Dependencies

- **Core**: `@nuxt/devtools-kit ^1.6.4`, `@nuxt/kit ^3.15.1`
- **Build**: `unbuild ^3.6.1`
- **Dev only**: Zero production impact

## Testing

```bash
npx nuxt typecheck  # MANDATORY after changes
pnpm build          # Build module
```
