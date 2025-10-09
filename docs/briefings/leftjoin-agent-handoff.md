# LEFT JOIN Agent Handoff: Audit Trail Fields Update

## Summary
The standard fields in the collection generator have been updated to support a comprehensive audit trail. This affects LEFT JOIN logic for user references.

## Changes Overview

### Field Renaming
- `userId` → `owner` (represents record ownership, not just creation)

### New Fields
- `createdBy` (new metadata field tracking who created the record)

### Complete Standard Field Set
When `useTeamUtility` and `useMetadata` are both enabled (default):

```typescript
{
  // Team fields
  teamId: string
  owner: string           // ← renamed from userId

  // Metadata fields
  createdAt: Date
  updatedAt: Date
  createdBy: string       // ← NEW
  updatedBy: string
}
```

## Impact on LEFT JOIN Logic

### User Reference Fields to JOIN
The system now has **THREE** user reference fields that need LEFT JOINs:

1. **`owner`** - Who owns/benefits from the record
2. **`createdBy`** - Who created the record (NEW)
3. **`updatedBy`** - Who last modified the record

### Detection Logic
Located in `/packages/nuxt-crouton-collection-generator/lib/generators/database-queries.mjs`:

```javascript
function detectReferenceFields(data, config) {
  const references = []

  // Check custom fields for refTarget
  if (data.fields) {
    data.fields.forEach(field => {
      if (field.refTarget) {
        references.push({
          fieldName: field.name,
          targetCollection: field.refTarget,
          isUserReference: field.refTarget === 'users'
        })
      }
    })
  }

  // Add standard metadata user references if enabled
  const useMetadata = config?.flags?.useMetadata ?? true
  if (useMetadata) {
    references.push({
      fieldName: 'updatedBy',
      targetCollection: 'users',
      isUserReference: true
    })
    // NEW: Add createdBy
    references.push({
      fieldName: 'createdBy',
      targetCollection: 'users',
      isUserReference: true
    })
  }

  return references
}
```

### Expected Query Structure

**Before (old structure with userId):**
```javascript
const bookings = await db
  .select({
    ...tables.bookings,
    userIdUser: {
      id: usersSchema.users.id,
      name: usersSchema.users.name,
      email: usersSchema.users.email,
      avatarUrl: usersSchema.users.avatarUrl
    },
    updatedByUser: { /* same */ }
  })
  .from(tables.bookings)
  .leftJoin(usersSchema.users, eq(tables.bookings.userId, usersSchema.users.id))
  .leftJoin(usersSchema.users, eq(tables.bookings.updatedBy, usersSchema.users.id))
```

**After (new structure with owner + createdBy):**
```javascript
const bookings = await db
  .select({
    ...tables.bookings,
    ownerUser: {                    // ← renamed from userIdUser
      id: usersSchema.users.id,
      name: usersSchema.users.name,
      email: usersSchema.users.email,
      avatarUrl: usersSchema.users.avatarUrl
    },
    createdByUser: {                // ← NEW
      id: usersSchema.users.id,
      name: usersSchema.users.name,
      email: usersSchema.users.email,
      avatarUrl: usersSchema.users.avatarUrl
    },
    updatedByUser: { /* same */ }
  })
  .from(tables.bookings)
  .leftJoin(usersSchema.users, eq(tables.bookings.owner, usersSchema.users.id))
  .leftJoin(usersSchema.users, eq(tables.bookings.createdBy, usersSchema.users.id))
  .leftJoin(usersSchema.users, eq(tables.bookings.updatedBy, usersSchema.users.id))
```

## Critical Issues to Address

### 1. Multiple JOINs on Same Table
The current implementation attempts to LEFT JOIN the `users` table **three times** (for `owner`, `createdBy`, and `updatedBy`). This will cause issues:

- **SQL Error**: Cannot use same table name multiple times without aliases
- **Data Overwriting**: Later joins may overwrite data from earlier joins

**Solution Needed:**
Use table aliases in Drizzle:

```javascript
const ownerUsers = alias(usersSchema.users, 'ownerUsers')
const createdByUsers = alias(usersSchema.users, 'createdByUsers')
const updatedByUsers = alias(usersSchema.users, 'updatedByUsers')

const bookings = await db
  .select({
    ...tables.bookings,
    ownerUser: {
      id: ownerUsers.id,
      name: ownerUsers.name,
      email: ownerUsers.email,
      avatarUrl: ownerUsers.avatarUrl
    },
    createdByUser: {
      id: createdByUsers.id,
      name: createdByUsers.name,
      email: createdByUsers.email,
      avatarUrl: createdByUsers.avatarUrl
    },
    updatedByUser: {
      id: updatedByUsers.id,
      name: updatedByUsers.name,
      email: updatedByUsers.email,
      avatarUrl: updatedByUsers.avatarUrl
    }
  })
  .from(tables.bookings)
  .leftJoin(ownerUsers, eq(tables.bookings.owner, ownerUsers.id))
  .leftJoin(createdByUsers, eq(tables.bookings.createdBy, createdByUsers.id))
  .leftJoin(updatedByUsers, eq(tables.bookings.updatedBy, updatedByUsers.id))
```

### 2. Import Statement Update
The generator needs to import `alias` from Drizzle:

```javascript
import { eq, and, desc, inArray, alias } from 'drizzle-orm'
```

### 3. Conditional Logic
Only add `owner` LEFT JOIN if `useTeamUtility === true`
Only add `createdBy`/`updatedBy` LEFT JOINs if `useMetadata === true`

## Testing Scenarios

### Scenario 1: User Creates Own Booking
```javascript
// All three fields point to same user
{
  owner: 'user-123',
  createdBy: 'user-123',
  updatedBy: 'user-123',

  // After LEFT JOINs, all three should resolve to same user data
  ownerUser: { id: 'user-123', name: 'John Doe', ... },
  createdByUser: { id: 'user-123', name: 'John Doe', ... },
  updatedByUser: { id: 'user-123', name: 'John Doe', ... }
}
```

### Scenario 2: Admin Creates for User, User Updates
```javascript
// Different users in each field
{
  owner: 'user-456',
  createdBy: 'admin-123',
  updatedBy: 'user-456',

  // After LEFT JOINs, each should resolve correctly
  ownerUser: { id: 'user-456', name: 'Jane Smith', ... },
  createdByUser: { id: 'admin-123', name: 'Admin User', ... },
  updatedByUser: { id: 'user-456', name: 'Jane Smith', ... }
}
```

### Scenario 3: Deleted Users (NULL Handling)
```javascript
// If createdBy user was deleted
{
  owner: 'user-789',
  createdBy: 'deleted-user',
  updatedBy: 'user-789',

  // LEFT JOINs should handle nulls gracefully
  ownerUser: { id: 'user-789', name: 'Bob Wilson', ... },
  createdByUser: null,  // User no longer exists
  updatedByUser: { id: 'user-789', name: 'Bob Wilson', ... }
}
```

## Files to Update

1. **`database-queries.mjs`** (line 76-120)
   - Add `alias` import from drizzle-orm
   - Update `detectReferenceFields()` to track when multiple joins to same table
   - Implement alias logic in query generation
   - Update both `getAll${PascalCasePlural}()` and `get${PascalCasePlural}ByIds()`

2. **Test Generation**
   - Ensure generated queries work with all three user reference fields
   - Verify aliases are used when joining same table multiple times

## Priority Actions

1. **IMMEDIATE**: Fix multiple LEFT JOIN issue using aliases
2. **HIGH**: Test with real data to ensure no join conflicts
3. **MEDIUM**: Add documentation about user reference patterns
4. **LOW**: Consider performance impact of three LEFT JOINs (may need indexing)

## References

- Original audit trail briefing: `/docs/briefings/audit-trail-fields-brief.md`
- Database queries generator: `/packages/nuxt-crouton-collection-generator/lib/generators/database-queries.mjs`
- Database schema generator: `/packages/nuxt-crouton-collection-generator/lib/generators/database-schema.mjs`

---

**Created**: 2025-10-08
**Context**: Audit trail fields refactoring (userId → owner, added createdBy)
**Status**: Ready for LEFT JOIN agent implementation
