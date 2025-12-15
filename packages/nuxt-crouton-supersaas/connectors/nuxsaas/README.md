# NuxSaaS Connector for nuxt-crouton

Pre-built connector for integrating NuxSaaS users with nuxt-crouton collections.

## Overview

This connector provides admin-level access to NuxSaaS users, including:
- User authentication via better-auth
- PostgreSQL database integration
- Subscription data (Stripe/Polar)
- Audit logging integration
- Role-based filtering
- Banned user filtering

## Requirements

Your NuxSaaS project must have:

- ✅ **better-auth** - Authentication system
- ✅ **PostgreSQL + Drizzle ORM** - Database
- ✅ `requireAuth(event)` - Auth utility function
- ✅ `useDB(event)` - Database access utility
- ✅ `logAuditEvent(data)` - Audit logging (optional but recommended)
- ✅ User and subscription tables in database schema

## Installation

```bash
# Install the connector package
pnpm add @friendlyinternet/nuxt-crouton-supersaas

# Or if also installing the base package
pnpm add @friendlyinternet/nuxt-crouton @friendlyinternet/nuxt-crouton-supersaas
```

## Setup

There are two ways to use this connector:

### Option 1: Proxy Mode (Recommended)

This mode uses your existing NuxSaaS endpoints without duplicating code.

#### 1. Configure in `app.config.ts`:

```typescript
import { connectNuxsaas } from '@friendlyinternet/nuxt-crouton-supersaas/nuxsaas'
import { nuxsaasUserSchema } from '@friendlyinternet/nuxt-crouton-supersaas/nuxsaas'

export default defineAppConfig({
  croutonCollections: {
    users: connectNuxsaas({
      schema: nuxsaasUserSchema,
      transform: (user) => ({
        id: user.id,
        title: user.name, // Required for CroutonReferenceSelect
        email: user.email,
        image: user.image,
        role: user.role,
        subscriptionStatus: user.subscriptionStatus
      }),
      defaultFilters: {
        includeBanned: false // Exclude banned users by default
      }
    })
  }
})
```

#### 2. Extend nuxt-crouton in `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  extends: [
    '@friendlyinternet/nuxt-crouton'
  ]
})
```

#### 3. Copy API endpoints to your project:

The connector provides these endpoints that you need to copy to your NuxSaaS project:

```
server/api/admin/users/
├── index.get.ts       # List all users
└── [userId].get.ts    # Get single user
```

**Copy these files manually or use this command:**

```bash
# From your NuxSaaS project root
cp -r node_modules/@friendlyinternet/nuxt-crouton-supersaas/connectors/nuxsaas/server/api/admin/users \
  server/api/admin/
```

### Option 2: Copy-Paste Mode

Manually copy all files to your project for full customization.

#### 1. Copy all connector files:

```bash
# Copy composables
cp node_modules/@friendlyinternet/nuxt-crouton-supersaas/connectors/nuxsaas/app/composables/useUsers.ts \
  app/composables/

# Copy API endpoints
cp -r node_modules/@friendlyinternet/nuxt-crouton-supersaas/connectors/nuxsaas/server/api/admin/users \
  server/api/admin/
```

#### 2. Register in `app.config.ts`:

```typescript
import { usersConfig } from '~/composables/useUsers'

export default defineAppConfig({
  croutonCollections: {
    users: usersConfig
  }
})
```

## Usage

Once configured, you can use the users collection with any Crouton component:

### In Vue Components

```vue
<template>
  <div>
    <!-- Reference select for user picker -->
    <CroutonReferenceSelect
      v-model="selectedUserId"
      collection="users"
      label="Assign to User"
      placeholder="Select a user"
    />

    <!-- Collection table -->
    <CroutonCollectionTable
      collection="users"
      :columns="['title', 'email', 'role', 'subscriptionStatus']"
    />
  </div>
</template>

<script setup lang="ts">
const selectedUserId = ref<string>()
</script>
```

### In Composables

```typescript
// Fetch all users
const { data: users } = await useCollectionQuery('users')

// Fetch specific user
const { data: user } = await useCollectionItem('users', userId)

// Filter users by role
const { data: admins } = await useCollectionQuery('users', {
  query: { role: 'admin' }
})
```

## Features

### 1. Role-Based Filtering

Filter users by their role:

```typescript
const { data: admins } = await useCollectionQuery('users', {
  query: { role: 'admin' }
})
```

### 2. Banned User Filtering

Exclude or include banned users:

```typescript
// Exclude banned users (default)
const { data: activeUsers } = await useCollectionQuery('users', {
  query: { includeBanned: 'false' }
})

// Include banned users
const { data: allUsers } = await useCollectionQuery('users', {
  query: { includeBanned: 'true' }
})
```

### 3. Subscription Data

Access subscription status and tier:

```typescript
const { data: users } = await useCollectionQuery('users')

users.forEach(user => {
  console.log(user.subscriptionStatus) // 'active' | 'inactive' | 'trialing' | ...
  console.log(user.subscriptionTier)   // 'pro' | 'basic' | ...
})
```

### 4. Audit Logging

All API calls are automatically logged to NuxSaaS's audit log:

```typescript
// Logged automatically when users are fetched
{
  userId: currentUser.id,
  category: 'api',
  action: 'list_users',
  targetType: 'user',
  status: 'success',
  details: {
    filters: { includeBanned: false, role: 'admin' },
    resultCount: 42
  }
}
```

## API Endpoints

### GET `/api/admin/users`

List all users with optional filters.

**Query Parameters:**
- `includeBanned` - Include banned users (default: `false`)
- `role` - Filter by role (e.g., `admin`, `user`)
- `ids` - Comma-separated list of user IDs

**Example:**
```bash
GET /api/admin/users?role=admin&includeBanned=false
```

**Response:**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "John Doe",
    "email": "john@example.com",
    "image": "https://...",
    "role": "admin",
    "banned": false,
    "subscriptionStatus": "active",
    "subscriptionTier": "pro"
  }
]
```

### GET `/api/admin/users/[userId]`

Fetch a single user by ID.

**Example:**
```bash
GET /api/admin/users/550e8400-e29b-41d4-a716-446655440000
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "John Doe",
  "email": "john@example.com",
  "image": "https://...",
  "role": "admin",
  "banned": false,
  "subscriptionStatus": "active",
  "subscriptionTier": "pro"
}
```

## Schema

The connector uses this Zod schema:

```typescript
import { z } from 'zod'

export const nuxsaasUserSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),                    // Maps to user.name
  email: z.string().email(),
  image: z.string().optional(),
  role: z.string().optional(),
  banned: z.boolean().optional(),
  emailVerified: z.boolean().optional(),
  subscriptionStatus: z.enum([
    'active',
    'inactive',
    'trialing',
    'canceled',
    'past_due'
  ]).optional(),
  subscriptionTier: z.string().optional(),
  stripeCustomerId: z.string().optional(),
  polarCustomerId: z.string().optional()
})
```

## Security

### Authentication

All endpoints require authentication via `requireAuth(event)`.

### Authorization Options

The connector provides commented examples for different authorization strategies:

**Option 1: Admin-only access**
```typescript
// Only admins can fetch users
if (currentUser.role !== 'admin') {
  throw createError({
    statusCode: 403,
    statusMessage: 'Admin access required'
  })
}
```

**Option 2: Users can fetch their own data**
```typescript
// Users can fetch their own data, admins can fetch anyone
if (currentUser.role !== 'admin' && currentUser.id !== userId) {
  throw createError({
    statusCode: 403,
    statusMessage: 'Access denied'
  })
}
```

Choose the option that fits your security requirements by uncommenting the appropriate code in the endpoint files.

## Customization

### Custom Transform

Customize which fields are exposed:

```typescript
connectNuxsaas({
  schema: z.object({
    id: z.string().uuid(),
    title: z.string(),
    email: z.string(),
    // Add your custom fields
    customField: z.string()
  }),
  transform: (user) => ({
    id: user.id,
    title: `${user.name} (${user.email})`, // Custom title format
    email: user.email,
    customField: user.role === 'admin' ? 'Administrator' : 'User'
  })
})
```

### Custom Filters

Add default filters:

```typescript
connectNuxsaas({
  // ...
  defaultFilters: {
    includeBanned: false,
    role: 'admin' // Only show admins by default
  }
})
```

### Modify Endpoints

After copying the files, you can modify them to:
- Add additional query filters
- Join with other tables
- Add custom business logic
- Change authorization rules

## Differences from SuperSaaS Connector

| Feature | SuperSaaS | NuxSaaS |
|---------|-----------|---------|
| **Routing** | `/api/teams/[id]/users` | `/api/admin/users` |
| **Auth** | `nuxt-auth-utils` | `better-auth` |
| **Context** | Team-scoped | Admin-level |
| **Database** | SQLite | PostgreSQL |
| **IDs** | nanoid | UUIDv7 |
| **Subscriptions** | Not included | Stripe/Polar support |

## Troubleshooting

### Import Errors

If you get import errors for schema:

```typescript
// Adjust the import path to match your NuxSaaS structure
const { user, subscription } = await import('~/server/database/schema')
```

### Database Connection

Make sure your `useDB()` utility is properly configured:

```typescript
// server/utils/db.ts
export const useDB = async (event?: H3Event) => {
  // Your database connection logic
}
```

### Audit Logging

If audit logging is not available, comment out the `logAuditEvent()` calls:

```typescript
// await logAuditEvent({ ... })
```

## Contributing

Found a bug or have a suggestion? Please open an issue or PR on the [nuxt-crouton repository](https://github.com/friendlyinternet/nuxt-crouton).

## License

MIT