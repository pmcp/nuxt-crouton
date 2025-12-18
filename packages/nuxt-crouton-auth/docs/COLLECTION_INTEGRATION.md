# Collection Integration Guide

This guide explains how @crouton/auth integrates with nuxt-crouton collections to provide team-scoped data access.

## Overview

@crouton/auth provides seamless team context to nuxt-crouton collections:

1. **Client-side**: Collections automatically get team context via `useTeam()` composable
2. **Server-side**: API handlers use `#crouton/team-auth` for team validation
3. **All modes**: Works with multi-tenant, single-tenant, and personal modes

## Quick Start

### 1. Configure the Alias

In your main `nuxt.config.ts`, set up the team-auth alias:

```typescript
export default defineNuxtConfig({
  modules: ['@crouton/auth'],

  nitro: {
    alias: {
      '#crouton/team-auth': '@crouton/auth/server/utils/team-auth'
    }
  }
})
```

### 2. Export Auth Schema

In your main database schema index, export the auth tables:

```typescript
// server/database/schema/index.ts
export * from '@crouton/auth/server/database/schema/auth'
export * from './your-collections'
```

### 3. Use Collections Normally

Generated collections automatically use team context:

```vue
<script setup>
// Team context is automatically resolved
const { items: bookings, pending } = await useCollectionQuery('shopBookings')
</script>
```

## How It Works

### Client-Side Flow

1. **useCollectionQuery** calls **useTeamContext** (from nuxt-crouton)
2. **useTeamContext** calls **useTeam()** (from @crouton/auth)
3. **useTeam()** returns `currentTeam` with `.id` and `.slug`
4. API calls go to `/api/teams/{teamId}/{collection}`

```
useCollectionQuery('bookings')
    └─> useTeamContext().getTeamId()
        └─> useTeam().currentTeam.value.id
            └─> fetch('/api/teams/team-123/shop-bookings')
```

### Server-Side Flow

1. API handler calls **resolveTeamAndCheckMembership** (from #crouton/team-auth)
2. Validates user has access to the team
3. Returns `{ team, user, membership }` for query scoping
4. All queries filter by `teamId`

```
POST /api/teams/team-123/shop-bookings
    └─> resolveTeamAndCheckMembership(event)
        └─> Returns { team: {...}, user: {...}, membership: {...} }
            └─> createBooking({ teamId: team.id, ... })
```

## Team Context Methods

### Using useTeamContext (Recommended)

```typescript
const { teamId, teamSlug, buildApiUrl } = useTeamContext()

// Get current team ID (reactive)
const id = teamId.value

// Build API URL
const apiUrl = buildApiUrl('/bookings') // '/api/teams/team-123/bookings'
```

### Using useTeam

```typescript
const { currentTeam, teams, switchTeam } = useTeam()

// Get current team
const team = currentTeam.value
console.log(team.id, team.name, team.slug)

// List user's teams
for (const t of teams.value) {
  console.log(t.name)
}

// Switch teams (multi-tenant mode)
await switchTeam(newTeamId)
```

### Using $croutonAuth Plugin

```typescript
const { $croutonAuth } = useNuxtApp()

// Get team ID (non-reactive)
const teamId = $croutonAuth.getTeamId()

// Check if team context exists
if ($croutonAuth.hasTeamContext()) {
  const url = $croutonAuth.buildApiUrl('/bookings')
}
```

## Mode-Aware Behavior

### Multi-Tenant Mode

- Users can belong to multiple teams
- Team ID comes from URL (`/dashboard/:team/...`) or session
- Team switcher is visible
- Collections are scoped to URL team

```typescript
// URL: /dashboard/acme-corp/bookings
const { teamId } = useTeamContext()
console.log(teamId.value) // 'team-abc123' (ID, not slug)
```

### Single-Tenant Mode

- All users share one organization
- Team auto-resolved from session
- No team in URL
- Team switcher hidden

```typescript
// URL: /dashboard/bookings
const { teamId } = useTeamContext()
console.log(teamId.value) // 'default' or configured defaultTeamId
```

### Personal Mode

- Each user has their own organization
- Team auto-resolved from session
- No team in URL
- Team management hidden

```typescript
// URL: /dashboard/bookings
const { teamId } = useTeamContext()
console.log(teamId.value) // 'personal-abc12345' (user's personal workspace)
```

## Server-Side Utilities

### resolveTeamAndCheckMembership

Main utility for API handlers:

```typescript
// server/api/teams/[id]/shop-bookings/index.post.ts
import { resolveTeamAndCheckMembership } from '#crouton/team-auth'

export default defineEventHandler(async (event) => {
  // Validates user is team member, returns context
  const { team, user, membership } = await resolveTeamAndCheckMembership(event)

  // Create booking scoped to team
  const booking = await createBooking({
    teamId: team.id,
    createdBy: user.id,
    ...body
  })

  return booking
})
```

### Role-Based Access

```typescript
import { requireTeamAdmin, requireTeamOwner } from '#crouton/team-auth'

// Require admin or owner role
const { team, user } = await requireTeamAdmin(event)

// Require owner role only
const { team, user } = await requireTeamOwner(event)
```

### Query Helpers

```typescript
import {
  getTeamById,
  getTeamBySlug,
  getUserTeams,
  isTeamMemberWithEvent
} from '#crouton/team-auth'

// Get team by ID
const team = await getTeamById(event, teamId)

// Check membership
const isMember = await isTeamMemberWithEvent(event, teamId, userId)
```

## Custom Collection Patterns

### Adding Team Scoping to Custom Queries

```typescript
// composables/useCustomBookingQuery.ts
export function useCustomBookingQuery() {
  const { teamId } = useTeamContext()
  const { buildApiUrl } = useTeamContext()

  const fetchWithFilters = async (filters: BookingFilters) => {
    const url = buildApiUrl('/shop-bookings')
    return await $fetch(url, {
      params: filters
    })
  }

  return { fetchWithFilters }
}
```

### Server-Side Custom Query

```typescript
// server/api/teams/[id]/shop-bookings/upcoming.get.ts
import { resolveTeamAndCheckMembership } from '#crouton/team-auth'
import { getUpcomingBookings } from '../../../database/queries'

export default defineEventHandler(async (event) => {
  const { team } = await resolveTeamAndCheckMembership(event)

  // Custom query, still scoped to team
  return await getUpcomingBookings(team.id, {
    startDate: new Date(),
    limit: 10
  })
})
```

## Best Practices

### 1. Always Use Team Context

Never hardcode team IDs. Always use the resolved context:

```typescript
// ❌ Bad
const bookings = await $fetch('/api/teams/my-team/bookings')

// ✅ Good
const { buildApiUrl } = useTeamContext()
const bookings = await $fetch(buildApiUrl('/bookings'))
```

### 2. Validate on Server

Always validate team membership on the server:

```typescript
// ✅ Server validates access
const { team } = await resolveTeamAndCheckMembership(event)
```

### 3. Check Team Context Before Actions

```typescript
const { hasTeamContext, teamId } = useTeamContext()

const handleSave = async () => {
  if (!hasTeamContext) {
    toast.error('No team context available')
    return
  }
  // Proceed with save
}
```

### 4. Handle Mode Differences

```typescript
const config = useRuntimeConfig().public.crouton?.auth
const { showTeamSwitcher } = useTeam()

// Show team switcher only in multi-tenant mode
<TeamSwitcher v-if="showTeamSwitcher" />
```

## Troubleshooting

### "Team context required but not available"

This error occurs when `useCollectionQuery` can't resolve a team ID.

**Causes:**
1. User not authenticated
2. Route doesn't have team param (multi-tenant mode)
3. Session doesn't have activeOrganizationId

**Solutions:**
1. Ensure user is logged in
2. Check route configuration
3. Verify team middleware is running

### "Not a team member"

Server returns 403 when user tries to access a team they're not part of.

**Causes:**
1. User navigated to wrong team URL
2. User was removed from team
3. Stale session

**Solutions:**
1. Redirect to user's team
2. Refresh session
3. Clear session and re-authenticate

### Collections Not Auto-Scoping

If collections aren't automatically scoped to team:

1. Verify `#crouton/team-auth` alias is configured
2. Check that `useTeam()` composable is available
3. Verify middleware order (team-context should run after auth)

## Migration from Custom Auth

If migrating from a custom auth system:

1. Map your team table to `organization`:
   - `teams.id` → `organization.id`
   - `teams.name` → `organization.name`
   - `teams.slug` → `organization.slug`

2. Map your membership table to `member`:
   - `team_members.teamId` → `member.organizationId`
   - `team_members.userId` → `member.userId`
   - `team_members.role` → `member.role`

3. Update session to include `activeOrganizationId`

See [MIGRATION.md](./MIGRATION.md) for detailed migration guide.
