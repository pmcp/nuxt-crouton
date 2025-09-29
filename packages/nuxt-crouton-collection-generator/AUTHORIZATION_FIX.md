# Team Authorization Fix for nuxt-crouton-collection-generator

## Problem Summary
Generated API endpoints failed because they received team slugs from URLs but attempted to use them as IDs for authorization checks, causing all team-based operations to fail with 403 errors.

## Solutions Implemented

### 1. Enhanced Team Resolution (Default Behavior)
Updated all API endpoint generators to handle both slugs and IDs:
- First tries to find team by slug (most common case)
- Falls back to ID lookup if slug not found
- Returns 404 if neither matches
- Uses resolved team.id for all database operations

### 2. Team Auth Utility Option (--use-team-utility flag)
Created a reusable team authentication utility that:
- Provides centralized team resolution logic
- Reduces code duplication across endpoints
- Makes future auth changes easier
- Includes both `resolveTeamAndCheckMembership()` and `isTeamMember()` functions

### 3. Date Field Handling (Already Implemented)
The generator already handles date field conversion from strings to Date objects for Drizzle ORM compatibility.

## Usage

### Default Mode (Inline Resolution)
```bash
node generate-collection.mjs shop products --fields-file schemas/products.json
```

Generates endpoints with inline team resolution logic that handles both slugs and IDs.

### Simplified Mode (With Team Utility)
```bash
node generate-collection.mjs shop products --fields-file schemas/products.json --use-team-utility
```

Generates:
1. Cleaner endpoints using the shared utility
2. `layers/[layer]/server/utils/team-auth.ts` utility file (if doesn't exist)

## Files Modified

### Core Changes
- `lib/generators/api-endpoints.mjs` - Enhanced team resolution in all endpoints
- `lib/generators/team-auth-utility.mjs` - New team auth utility generator
- `lib/generators/api-endpoints-simplified.mjs` - Simplified endpoint generators
- `lib/generate-collection.mjs` - Added --use-team-utility flag support

## Generated Code Patterns

### Before (Broken)
```typescript
const { id: teamId } = getRouterParams(event)
const hasAccess = await isTeamMember(teamId, user.id) // Fails: teamId is actually a slug
```

### After - Default Mode
```typescript
const { id: teamSlugOrId } = getRouterParams(event)

// Try slug first, then ID
let team = await useDB()
  .select()
  .from(tables.teams)
  .where(eq(tables.teams.slug, teamSlugOrId))
  .get()

if (!team) {
  team = await useDB()
    .select()
    .from(tables.teams)
    .where(eq(tables.teams.id, teamSlugOrId))
    .get()
}

// Use team.id for operations
await createProduct({ ...data, teamId: team.id })
```

### After - With Utility Mode
```typescript
import { resolveTeamAndCheckMembership } from '~/server/utils/team-auth'

export default defineEventHandler(async (event) => {
  const { team, user } = await resolveTeamAndCheckMembership(event)
  // Clean and simple - team is already resolved and membership verified

  await createProduct({ ...data, teamId: team.id, userId: user.id })
})
```

## Benefits

1. **Backward Compatible**: Works with both slugs and IDs in URLs
2. **Future Proof**: Centralized auth logic makes updates easier
3. **Developer Friendly**: Clear error messages and cleaner code
4. **Performance**: Minimal overhead with direct DB queries
5. **Flexible**: Choose between inline or utility-based approach

## Testing

To verify the fix works:

1. Generate a collection with team-based endpoints
2. Create a team (gets a slug like "pmcptest1")
3. Access the API using either slug or ID:
   - `/api/teams/pmcptest1/shop-products` ✅
   - `/api/teams/YGeeS8aEbLwOT1QZAF-EI/shop-products` ✅
4. CRUD operations should now work correctly

## Migration Path

For existing generated collections:
1. Regenerate with the same fields file
2. Or manually update endpoints to use the new resolution pattern
3. Consider using --use-team-utility for cleaner code going forward