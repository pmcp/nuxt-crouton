# CLAUDE.md - @friendlyinternet/nuxt-crouton-supersaas

## Package Purpose

External collection connectors for Nuxt Crouton. Provides ready-to-use implementations for connecting auth systems (SuperSaaS, NuxSaaS) to `CroutonReferenceSelect` dropdowns.

## Key Files

| File | Purpose |
|------|---------|
| `connectors/supersaas/app/composables/useUsers.ts` | SuperSaaS user connector |
| `connectors/supersaas/server/api/teams/[id]/users/` | User API endpoints |
| `connectors/nuxsaas/app/composables/useUsers.ts` | NuxSaaS admin connector |
| `i18n/locales/*.json` | Connector translations |

## Problem Solved

```vue
<!-- This fails without connector -->
<CroutonReferenceSelect collection="users" v-model="state.updatedBy" />
<!-- Error: Collection "users" not registered -->
```

## Usage Patterns

### Pattern 1: Proxy Mode (Recommended)

No file copying - connects to existing endpoints:

```typescript
// app.config.ts
import { connectSupersaas } from '@friendlyinternet/nuxt-crouton-supersaas/supersaas'

export default defineAppConfig({
  croutonCollections: {
    users: connectSupersaas({
      sourceEndpoint: 'members',  // Uses existing /api/teams/[id]/members
      schema: userSchema,
      transform: (member) => ({
        id: member.userId,
        title: member.name,
        email: member.email
      })
    })
  }
})
```

### Pattern 2: Copy-Paste (Full Control)

```bash
# Copy connector files to your project
cp -r node_modules/@friendlyinternet/nuxt-crouton-supersaas/connectors/supersaas/app/composables/useUsers.ts ./app/composables/
cp -r node_modules/@friendlyinternet/nuxt-crouton-supersaas/connectors/supersaas/server/* ./server/
```

```typescript
// app.config.ts
import { usersConfig } from './composables/useUsers'

export default defineAppConfig({
  croutonCollections: {
    users: usersConfig
  }
})
```

## Available Connectors

| Connector | Purpose | Routing |
|-----------|---------|---------|
| SuperSaaS | Team-based user management | `/api/teams/[id]/*` |
| NuxSaaS | Admin-level with better-auth | `/api/admin/*` |

## Connector Structure

```
connectors/supersaas/
├── app/composables/
│   └── useUsers.ts         # Collection config
├── server/api/teams/[id]/
│   └── users/
│       └── index.get.ts    # API endpoint
├── README.md
└── index.ts                # Exports
```

## Creating Custom Connector

1. Create collection config with `defineExternalCollection()`
2. Create API endpoint with `createExternalCollectionHandler()`
3. Transform data to `{ id, title, ...optional }` format
4. Register in `app.config.ts`

## Common Tasks

### Add new auth system connector
1. Create `connectors/{name}/` directory
2. Copy SuperSaaS structure as template
3. Implement `useUsers.ts` config
4. Implement API endpoint
5. Export from `connectors/{name}/index.ts`

### Customize user fields
Modify transform function in proxy config or copied endpoint.

## Dependencies

- **Extends**: `@friendlyinternet/nuxt-crouton` (required)
- **Peer deps**: `@nuxtjs/i18n ^9.0.0`, `zod ^3.0.0`

## Testing

```bash
npx nuxt typecheck  # MANDATORY after changes
pnpm build          # Build with unbuild
```
