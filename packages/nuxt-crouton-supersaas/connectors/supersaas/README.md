# SuperSaaS Connector

Pre-built connector for SuperSaaS team-based user management.

## What It Does

Connects SuperSaaS's existing user system to Crouton's `CroutonReferenceSelect` component, so your generated forms can reference users without duplicating user management.

## Requirements

Your SuperSaaS project must have:

### Required for All Operations
1. **Team-based routing**: `/api/teams/[id]/*`
2. **validateTeamOwnership()** function for auth:
   ```typescript
   // Expected in: server/utils/teamValidation.ts (or similar)
   export async function validateTeamOwnership(event: H3Event, teamId: string) {
     // Throws error if user doesn't have access
   }
   ```

### Required for Read Operations (List, View)
3. **getActiveTeamMembers()** function that returns team members:
   ```typescript
   // Expected in: server/database/queries/teams.ts (or similar)
   export async function getActiveTeamMembers(teamId: string) {
     // Returns array of team members
   }
   ```

### Required for Update Operations (Optional)
4. **updateTeamMember()** function to update member data:
   ```typescript
   // Expected in: server/database/queries/teams.ts (or similar)
   export async function updateTeamMember(teamId: string, memberId: string, data: Partial<Member>) {
     // Updates member and returns updated member
   }
   ```

### Required for Delete Operations (Optional)
5. **deleteTeamMember()** function to delete member:
   ```typescript
   // Expected in: server/database/queries/teams.ts (or similar)
   export async function deleteTeamMember(teamId: string, memberId: string) {
     // Deletes (or soft-deletes) member
   }
   ```

**Note**: Most projects only need read operations (to select users in forms). Update/Delete operations are only needed if you want to manage users through Crouton.

## Quick Setup (2 Steps - Proxy Mode)

### 1. Install Package

```bash
pnpm add @friendlyinternet/nuxt-crouton-supersaas
```

### 2. Configure in app.config.ts

```typescript
import { connectSupersaas } from '@friendlyinternet/nuxt-crouton-supersaas/supersaas'
import { z } from 'zod'

const userSchema = z.object({
  id: z.string(),
  title: z.string(),
  email: z.string().optional(),
  avatarUrl: z.string().optional(),
  role: z.string().optional()
})

export default defineAppConfig({
  croutonCollections: {
    users: connectSupersaas({
      sourceEndpoint: 'members', // Your existing /api/teams/[id]/members endpoint
      schema: userSchema,
      transform: (member) => ({
        id: member.userId,
        title: member.name,
        email: member.email,
        avatarUrl: member.avatarUrl,
        role: member.role
      })
    })
  }
})
```

### Done! ✅

Your forms with `collection="users"` will now work:

```vue
<CroutonReferenceSelect collection="users" v-model="state.updatedBy" />
```

**How it works:** The connector proxies requests to your existing SuperSaaS `/api/teams/[id]/members` endpoint and transforms the response to Crouton format. No duplicate endpoints needed!

---

## Alternative: Copy-Paste Mode (For Heavy Customization)

If you need full control over the endpoint logic:

### 1. Install Package

```bash
pnpm add @friendlyinternet/nuxt-crouton-supersaas
```

### 2. Copy Connector Files

```bash
# Copy composable
cp node_modules/@friendlyinternet/nuxt-crouton-supersaas/connectors/supersaas/app/composables/useUsers.ts ./app/composables/

# Copy API endpoint (creates directory structure)
cp -r node_modules/@friendlyinternet/nuxt-crouton-supersaas/connectors/supersaas/server/api/teams ./server/api/
```

### 3. Register in app.config.ts

```typescript
import { usersConfig } from './composables/useUsers'

export default defineAppConfig({
  croutonCollections: {
    users: usersConfig
  }
})
```

## What Gets Created

After copying, you'll have:

```
your-project/
├── app/
│   └── composables/
│       └── useUsers.ts                  # Collection config
└── server/
    └── api/
        └── teams/
            └── [id]/
                └── members/
                    ├── index.get.ts             # List all members (required)
                    ├── [memberId].get.ts        # Get single member (required)
                    ├── [memberId].patch.ts      # Update member (optional)
                    └── [memberId].delete.ts     # Delete member (optional)
```

## Customization

### Add Custom Fields

Edit `app/composables/useUsers.ts`:

```typescript
const userSchema = z.object({
  id: z.string(),
  title: z.string(),
  email: z.string().optional(),
  avatarUrl: z.string().optional(),
  role: z.string().optional(),
  // Add your fields:
  department: z.string().optional(),
  phoneNumber: z.string().optional()
})
```

### Customize Display

Edit `server/api/teams/[id]/users/index.get.ts` transform function:

```typescript
(member) => ({
  id: member.userId,
  title: `${member.name} (${member.role})`, // Show role in dropdown
  email: member.email,
  avatarUrl: member.avatarUrl,
  role: member.role,
  department: member.department // Add custom field
})
```

### Filter Users

Edit the fetch function in `server/api/teams/[id]/users/index.get.ts`:

```typescript
async (event) => {
  const teamId = getRouterParam(event, 'id')
  await validateTeamOwnership(event, teamId!)

  const members = await getActiveTeamMembers(teamId!)

  // Filter to only show admins and owners:
  return members.filter(m => ['admin', 'owner'].includes(m.role))
}
```

## Auto-Populate updatedBy (Recommended)

Users shouldn't manually select themselves. Auto-populate in your API handlers:

```typescript
// Example: server/api/teams/[id]/bookings-bookings/[itemId].patch.ts
export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const body = await readBody(event)

  // Auto-populate with current user
  body.updatedBy = session.user.id

  // ... rest of your update logic
})
```

Then remove the `updatedBy` field from your forms since users don't need to see it.

## Troubleshooting

### Error: "getActiveTeamMembers is not defined"

The API endpoint expects this function. Update the import in `server/api/teams/[id]/users/index.get.ts`:

```typescript
// Change this line to match your project structure:
// import { getActiveTeamMembers } from '@@/server/database/queries/teams'
import { getActiveTeamMembers } from '~/path/to/your/function'
```

### Error: "validateTeamOwnership is not defined"

Update the import to match your project:

```typescript
// import { validateTeamOwnership } from '@@/server/utils/teamValidation'
import { validateTeamOwnership } from '~/path/to/your/function'
```

### Error: "Collection 'users' not registered"

Make sure you registered in `app.config.ts`:

```typescript
import { usersConfig } from './composables/useUsers'

export default defineAppConfig({
  croutonCollections: {
    users: usersConfig  // Must be present
  }
})
```

### Users Dropdown is Empty

Check your API endpoint is returning data:
```bash
# Test the endpoint
curl http://localhost:3000/api/teams/YOUR_TEAM_ID/users
```

Should return:
```json
[
  { "id": "user1", "title": "Alice", "email": "alice@example.com" },
  { "id": "user2", "title": "Bob", "email": "bob@example.com" }
]
```

## Data Flow

```
1. User opens form
     ↓
2. <CroutonReferenceSelect collection="users" />
     ↓
3. Looks up "users" in app.config.ts → ✅ Found!
     ↓
4. GET /api/teams/{teamId}/users
     ↓
5. validateTeamOwnership() checks access
     ↓
6. getActiveTeamMembers() fetches members
     ↓
7. Transform to Crouton format: { id, title, ... }
     ↓
8. Dropdown shows: "Alice", "Bob", etc.
     ↓
9. User selects "Alice"
     ↓
10. Form saves: updatedBy: "alice-user-id"
```

## Benefits

✅ **No Duplicate User Management** - SuperSaaS remains source of truth
✅ **Team-Scoped** - Users only see their team members
✅ **Secure** - Reuses existing auth validation
✅ **Type-Safe** - Full TypeScript support
✅ **Customizable** - Easy to modify for your needs

## Need Help?

- [Main Package Docs](../../README.md)
- [Nuxt Crouton Docs](https://github.com/pmcp/nuxt-crouton)
- [Report Issues](https://github.com/pmcp/nuxt-crouton/issues)
