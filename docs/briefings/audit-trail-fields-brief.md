# Audit Trail Fields Briefing

## Overview

Nuxt Crouton uses a three-field audit trail system to track ownership and modification history for all collection records. This system distinguishes between who owns a record, who created it, and who last modified it.

## The Three Fields

### 1. `owner` (Team Field)
- **Purpose**: Identifies who owns or benefits from the record
- **Type**: `string` (user ID reference)
- **Required**: Yes
- **Mutable**: Yes (ownership can be transferred)
- **Authorization**: Used in authorization checks for updates/deletes

**Example Use Cases:**
- In a booking system: The person the booking is FOR
- In a task system: The person assigned to the task
- In a document system: The person who owns the document

### 2. `createdBy` (Metadata Field)
- **Purpose**: Records who originally created the record
- **Type**: `string` (user ID reference)
- **Required**: Yes
- **Mutable**: No (set once at creation, never changes)
- **Authorization**: Not used for authorization, audit only

**Example Use Cases:**
- Admin creates a booking for a user → `createdBy` = Admin ID
- User creates their own booking → `createdBy` = User ID
- System creates a record → `createdBy` = System ID

### 3. `updatedBy` (Metadata Field)
- **Purpose**: Records who last modified the record
- **Type**: `string` (user ID reference)
- **Required**: Yes
- **Mutable**: Yes (auto-updated on every modification)
- **Authorization**: Not used for authorization, audit only

**Example Use Cases:**
- Tracking who made the last edit
- Compliance and audit trails
- Change history for debugging

## Standard Fields Summary

When both `useTeamUtility` and `useMetadata` flags are enabled (default), every collection automatically gets:

```typescript
interface CollectionRecord {
  id: string              // Primary key
  teamId: string          // Multi-tenancy
  owner: string           // Who owns this record
  createdAt: Date         // When created
  updatedAt: Date         // Last update time
  createdBy: string       // Who created it (immutable)
  updatedBy: string       // Who last updated it (auto-updated)
  // ... custom fields ...
}
```

## Real-World Example: Booking System

### Scenario: Admin creates booking for a user

```typescript
// Admin (ID: admin-123) creates a booking for User (ID: user-456)
const booking = await createBooking({
  owner: 'user-456',        // Booking is FOR this user
  createdBy: 'admin-123',   // Admin created it
  updatedBy: 'admin-123',   // Initially same as createdBy
  location: 'conference-room-a',
  date: new Date('2025-10-15'),
  // ...
})

// Later, the user updates their own booking
const updated = await updateBooking(booking.id, {
  notes: 'Need projector'
})
// Result:
// - owner: 'user-456'      (unchanged - still belongs to user)
// - createdBy: 'admin-123' (unchanged - admin still the creator)
// - updatedBy: 'user-456'  (auto-updated to current user)
```

### Scenario: User creates their own booking

```typescript
// User (ID: user-456) creates their own booking
const booking = await createBooking({
  owner: 'user-456',        // Booking is FOR themselves
  createdBy: 'user-456',    // They created it
  updatedBy: 'user-456',    // Initially same as createdBy
  location: 'conference-room-b',
  date: new Date('2025-10-16'),
})
```

## Authorization Rules

The `owner` field is used for authorization in update and delete operations:

```typescript
// From database-queries.mjs
export async function updateRecord(recordId, teamId, ownerId, updates) {
  // Only the owner can update their own records
  const [record] = await db
    .update(table)
    .set({ ...updates, updatedBy: ownerId })
    .where(and(
      eq(table.id, recordId),
      eq(table.teamId, teamId),
      eq(table.owner, ownerId)  // ← Authorization check
    ))
    .returning()

  if (!record) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not found or unauthorized'
    })
  }

  return record
}
```

**Key Points:**
- `owner` determines who can modify/delete the record
- `createdBy` is purely for audit trail, not authorization
- `updatedBy` tracks the last modifier, not authorization

## Database Schema

### SQLite
```javascript
{
  // Team fields
  teamId: text('teamId').notNull(),
  owner: text('owner').notNull(),

  // Metadata fields
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().$default(() => new Date()),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull().$onUpdate(() => new Date()),
  createdBy: text('createdBy').notNull(),
  updatedBy: text('updatedBy').notNull()
}
```

### PostgreSQL
```javascript
{
  // Team fields
  teamId: text('teamId').notNull(),
  owner: text('owner').notNull(),

  // Metadata fields
  createdAt: timestamp('createdAt', { withTimezone: true }).notNull().$default(() => new Date()),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().$onUpdate(() => new Date()),
  createdBy: text('createdBy').notNull(),
  updatedBy: text('updatedBy').notNull()
}
```

## TypeScript Types

```typescript
export interface Record {
  id: string
  teamId: string
  owner: string
  createdAt: Date
  updatedAt: Date
  createdBy: string
  updatedBy: string
  // ... custom fields
}

export type NewRecord = Omit<Record, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>
```

When creating a new record, the client only needs to provide:
- `teamId`
- `owner`
- Custom fields

The system automatically populates:
- `id` (generated)
- `createdAt` (current timestamp)
- `updatedAt` (current timestamp)
- `createdBy` (from auth context)
- `updatedBy` (from auth context)

## Configuration Flags

Control which fields are generated:

```javascript
// crouton.config.js
{
  flags: {
    useTeamUtility: true,  // Adds: teamId, owner
    useMetadata: true      // Adds: createdAt, updatedAt, createdBy, updatedBy
  }
}
```

## LEFT JOIN Support

The generator automatically detects user references and creates LEFT JOINs to fetch user details:

```typescript
// Auto-generated query with user joins
const bookings = await db
  .select({
    ...tables.bookings,
    ownerUser: {
      id: usersSchema.users.id,
      name: usersSchema.users.name,
      email: usersSchema.users.email,
      avatarUrl: usersSchema.users.avatarUrl
    },
    createdByUser: { /* same structure */ },
    updatedByUser: { /* same structure */ }
  })
  .from(tables.bookings)
  .leftJoin(usersSchema.users, eq(tables.bookings.owner, usersSchema.users.id))
  .leftJoin(usersSchema.users, eq(tables.bookings.createdBy, usersSchema.users.id))
  .leftJoin(usersSchema.users, eq(tables.bookings.updatedBy, usersSchema.users.id))
```

## Migration from `userId` to `owner`

If you have existing collections using `userId`, you need to:

1. **Update your schemas** - The generator now uses `owner` instead of `userId`
2. **Regenerate collections** - Run `pnpm crouton-generate` to regenerate with new field names
3. **Migrate data** (if in production):
   ```sql
   -- SQLite
   ALTER TABLE your_table RENAME COLUMN userId TO owner;

   -- PostgreSQL
   ALTER TABLE your_table RENAME COLUMN "userId" TO owner;
   ```

## Best Practices

1. **Always set `owner` explicitly** - Don't assume it's the same as the authenticated user
2. **Never modify `createdBy`** - It's an immutable audit field
3. **Let the system handle `updatedBy`** - It's auto-updated on every change
4. **Use `owner` for authorization** - It determines who can modify the record
5. **Use `createdBy`/`updatedBy` for audit trails** - Not for authorization logic

## Related Files

- `/packages/nuxt-crouton-collection-generator/lib/generators/database-schema.mjs`
- `/packages/nuxt-crouton-collection-generator/lib/generators/database-queries.mjs`
- `/packages/nuxt-crouton-collection-generator/lib/generators/types.mjs`

---

**Last Updated**: 2025-10-08
**Version**: 1.0.0
