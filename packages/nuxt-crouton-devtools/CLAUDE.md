# CLAUDE.md - @friendlyinternet/nuxt-crouton-devtools

## Package Purpose

DevTools integration for Nuxt Crouton. Provides visual inspection and management of CRUD collections in Nuxt DevTools with zero config.

## Key Files

| File | Purpose |
|------|---------|
| `src/module.ts` | Nuxt module entry point |
| `src/runtime/pages/data-browser.vue` | Collection inspector UI |
| `src/runtime/server-rpc/*.ts` | Server RPC functions |

## Features

- Collection inspector (view all registered collections)
- Configuration details (schemas, metadata, settings)
- Search & filter by name, layer, API path
- Refresh on demand
- Dark mode support

## Installation

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: [
    '@nuxt/devtools',
    '@friendlyinternet/nuxt-crouton-devtools'
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

## Architecture

```
src/
├── module.ts                    # Nuxt module
├── runtime/
│   ├── pages/
│   │   └── data-browser.vue    # Main DevTools UI
│   ├── server-rpc/
│   │   ├── collections.ts      # Get collections
│   │   ├── endpoints.ts        # List endpoints
│   │   └── operations.ts       # Track operations
│   └── server/
│       └── utils/              # Tracking utilities
└── client/                     # DevTools client
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

- Phase 2: CRUD operations monitoring, API testing
- Phase 3: Collection data browser with inline editing
- Phase 4: Generator history and rollback
- Phase 5: Schema validation, i18n manager

## Dependencies

- **Core**: `@nuxt/devtools-kit ^1.6.4`, `@nuxt/kit ^3.15.1`
- **Build**: `unbuild ^3.6.1`
- **Dev only**: Zero production impact

## Testing

```bash
npx nuxt typecheck  # MANDATORY after changes
pnpm build          # Build module
```
