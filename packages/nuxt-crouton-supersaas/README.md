# @friendlyinternet/nuxt-crouton-supersaas

SuperSaaS integration layer for Nuxt Crouton - connectors, translations, and utilities.

## Why This Package?

When using Crouton's `CroutonReferenceSelect` with external collections (like users from your auth system), you need to:
1. Register the collection with Crouton
2. Create an API endpoint to serve the data
3. Transform data to Crouton's format

This package provides **ready-to-use implementations** for common auth systems, so you can copy-paste instead of writing from scratch.

## Available Connectors

- ✅ **SuperSaaS** - Team-based user management
- ✅ **NuxSaaS** - Admin-level user management with better-auth

## Installation

```bash
pnpm add @friendlyinternet/nuxt-crouton-supersaas
```

## Usage Patterns

### Pattern 1: Proxy Mode (Recommended - No File Copying)

Best for most use cases. Connects to your existing endpoints without creating duplicates.

```typescript
// app.config.ts
import { connectSupersaas } from '@friendlyinternet/nuxt-crouton-supersaas/supersaas'
import { z } from 'zod'

const userSchema = z.object({
  id: z.string(),
  title: z.string(),
  email: z.string().optional(),
  avatarUrl: z.string().optional()
})

export default defineAppConfig({
  croutonCollections: {
    users: connectSupersaas({
      sourceEndpoint: 'members', // Uses your existing /api/teams/[id]/members
      schema: userSchema,
      transform: (member) => ({
        id: member.userId,
        title: member.name,
        email: member.email,
        avatarUrl: member.avatarUrl
      })
    })
  }
})
```

**Benefits:**
- ✅ No file copying or maintenance
- ✅ No duplicate endpoints
- ✅ Single source of truth (your existing SuperSaaS endpoints)
- ✅ Easy to update and customize

### Pattern 2: Copy-Paste (For Heavy Customization)

Best when you need full control over the endpoint logic.

```bash
# Install package
pnpm add @friendlyinternet/nuxt-crouton-supersaas

# Copy connector files to your project
cp -r node_modules/@friendlyinternet/nuxt-crouton-supersaas/connectors/supersaas/app/composables/useUsers.ts ./app/composables/
cp -r node_modules/@friendlyinternet/nuxt-crouton-supersaas/connectors/supersaas/server/* ./server/
```

Then register in `app.config.ts`:

```typescript
import { usersConfig } from './composables/useUsers'

export default defineAppConfig({
  croutonCollections: {
    users: usersConfig
  }
})
```

## Connectors

### SuperSaaS Connector

For team-based user management systems.

**Requirements:**
- `getActiveTeamMembers(teamId)` function
- `validateTeamOwnership(event, teamId)` function
- Team-based routing: `/api/teams/[id]/*`

[**Full SuperSaaS Documentation →**](./connectors/supersaas/README.md)

## Creating Custom Connectors

See [Custom Connector Template](./connectors/templates/custom-connector-template.md) for a guide on creating connectors for other auth systems.

## How It Works

### The Problem
Your generated forms have:
```vue
<CroutonReferenceSelect collection="users" v-model="state.updatedBy" />
```

But Crouton doesn't know what "users" is, causing:
```
Error: Collection "users" not registered
```

### The Solution
Connectors provide:

1. **Collection Config** (`useUsers.ts`)
   ```typescript
   export const usersConfig = defineExternalCollection({
     name: 'users',
     schema: userSchema
   })
   ```

2. **API Endpoint** (`server/api/teams/[id]/users/index.get.ts`)
   ```typescript
   export default createExternalCollectionHandler(
     async (event) => {
       // Fetch users from your system
       return await getActiveTeamMembers(teamId)
     },
     (member) => ({
       // Transform to Crouton format
       id: member.userId,
       title: member.name
     })
   )
   ```

3. **Registration** (`app.config.ts`)
   ```typescript
   croutonCollections: {
     users: usersConfig
   }
   ```

Now `CroutonReferenceSelect` can query users and display them in dropdowns.

## Architecture

This package follows the same addon pattern as `nuxt-crouton-assets` and `nuxt-crouton-i18n`:

```
@friendlyinternet/nuxt-crouton          ← Core (provides utilities)
@friendlyinternet/nuxt-crouton-assets   ← Asset management addon
@friendlyinternet/nuxt-crouton-i18n     ← i18n addon
@friendlyinternet/nuxt-crouton-supersaas ← SuperSaaS integration (this package)
```

## Contributing

Have a connector for another auth system? PRs welcome!

1. Create a new directory in `connectors/`
2. Follow the SuperSaaS connector structure
3. Add documentation
4. Submit PR

## License

MIT © FYIT
