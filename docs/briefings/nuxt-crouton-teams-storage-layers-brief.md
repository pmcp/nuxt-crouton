# Nuxt Crouton Teams & Storage Layers - Implementation Brief

**Created:** 2025-10-09
**Status:** Planning
**Context:** Extracting SuperSaaS features into reusable Nuxt Crouton layers

---

## Executive Summary

This brief outlines the detailed implementation plan for two new Nuxt Crouton layers:

1. **`@friendlyinternet/nuxt-crouton-teams`** - Multi-tenant team management
2. **`@friendlyinternet/nuxt-crouton-storage`** - NuxtHub Blob storage utilities

These layers extract battle-tested functionality from the SuperSaaS project into reusable, standalone packages that work with any Nuxt + Nuxt UI + NuxtHub application.

---

## Design Decisions

### ✅ Confirmed Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Auth System** | Better Auth | Already used in SuperSaaS, mature ecosystem |
| **Terminology** | "teams" (not "organizations") | Keep existing Nuxt Crouton naming |
| **Storage** | NuxtHub Blob only | Simpler, built-in to NuxtHub projects |
| **Database** | Drizzle ORM + SQLite | Matches NuxtHub defaults |

### 🤔 Open Questions

1. **Backward Compatibility:** Should we keep `teamId` or migrate to `organizationId`?
   - **Recommendation:** Keep `teamId` to avoid breaking changes

2. **Email Integration:** Should teams layer require email layer for invitations?
   - **Recommendation:** Optional peer dependency (graceful degradation)

3. **Route Structure:** Keep `/dashboard/[team]/` or make configurable?
   - **Recommendation:** Configurable via layer options

---

## Package 1: `@friendlyinternet/nuxt-crouton-teams`

### Overview

Multi-tenant team management layer providing:
- Team creation, switching, and management
- Member invitations and role management
- Team-scoped data access patterns
- Integration with Nuxt Crouton collections

### Package Structure

```
packages/nuxt-crouton-teams/
├── server/
│   ├── database/
│   │   └── schema/
│   │       ├── teams.ts
│   │       ├── teamMembers.ts
│   │       └── teamInvitations.ts
│   ├── api/
│   │   └── teams/
│   │       ├── index.get.ts              # List user's teams
│   │       ├── index.post.ts             # Create team
│   │       ├── check-slug.post.ts        # Validate team slug
│   │       └── [id]/
│   │           ├── index.get.ts          # Get team details
│   │           ├── index.patch.ts        # Update team
│   │           ├── index.delete.ts       # Delete team
│   │           ├── members.get.ts        # List members
│   │           ├── members.post.ts       # Invite member
│   │           ├── invitations.get.ts    # List pending invites
│   │           └── members/
│   │               ├── [memberId].get.ts    # Get member
│   │               ├── [memberId].patch.ts  # Update role
│   │               └── [memberId].delete.ts # Remove member
│   └── utils/
│       ├── team-auth.ts              # Team access validation
│       ├── team-validation.ts        # Permission checks
│       └── team-queries.ts           # Common DB queries
├── app/
│   ├── components/
│   │   ├── TeamSwitcher.vue          # Dropdown to switch teams
│   │   ├── TeamMemberList.vue        # Member table with roles
│   │   ├── TeamMemberItem.vue        # Single member row
│   │   ├── TeamInviteForm.vue        # Email invitation form
│   │   ├── TeamInviteList.vue        # Pending invitations
│   │   ├── TeamSettings.vue          # Team settings page
│   │   ├── TeamLogoUpload.vue        # Logo upload component
│   │   └── TeamCreateModal.vue       # New team modal
│   ├── composables/
│   │   ├── useTeam.ts                # Active team context
│   │   ├── useTeams.ts               # List/create teams
│   │   ├── useTeamMembers.ts         # Member management
│   │   ├── useTeamInvitations.ts     # Invitation system
│   │   └── useTeamContext.ts         # Route param resolution
│   ├── middleware/
│   │   ├── team.ts                   # Auto-resolve team
│   │   └── team-owner.ts             # Require owner role
│   └── pages/
│       └── dashboard/
│           └── [team]/
│               └── settings.vue      # Team settings page
├── types/
│   └── index.ts                      # TypeScript types
├── nuxt.config.ts
├── package.json
└── README.md
```

### Database Schema

#### 1. `teams` Table

```typescript
// server/database/schema/teams.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { nanoid } from 'nanoid'

export const teams = sqliteTable('teams', {
  id: text('id')
    .primaryKey()
    .$default(() => nanoid()),

  name: text('name')
    .notNull(),

  slug: text('slug')
    .notNull()
    .unique(),

  logo: text('logo'), // URL to team logo (stored via nuxt-crouton-storage)

  ownerId: text('owner_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),

  metadata: text('metadata', { mode: 'json' }).$type<{
    description?: string
    website?: string
    [key: string]: any
  }>(),

  createdAt: integer('created_at', { mode: 'timestamp' })
    .$default(() => new Date())
    .notNull(),

  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .$default(() => new Date())
    .$onUpdate(() => new Date())
    .notNull()
})

export type Team = typeof teams.$inferSelect
export type NewTeam = typeof teams.$inferInsert
```

#### 2. `teamMembers` Table

```typescript
// server/database/schema/teamMembers.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { nanoid } from 'nanoid'

export const teamMembers = sqliteTable('team_members', {
  id: text('id')
    .primaryKey()
    .$default(() => nanoid()),

  teamId: text('team_id')
    .notNull()
    .references(() => teams.id, { onDelete: 'cascade' }),

  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),

  role: text('role', { enum: ['owner', 'admin', 'member'] })
    .notNull()
    .default('member'),

  createdAt: integer('created_at', { mode: 'timestamp' })
    .$default(() => new Date())
    .notNull()
})

// Composite unique constraint: one user per team
export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id]
  }),
  user: one(user, {
    fields: [teamMembers.userId],
    references: [user.id]
  })
}))

export type TeamMember = typeof teamMembers.$inferSelect
export type NewTeamMember = typeof teamMembers.$inferInsert
```

#### 3. `teamInvitations` Table

```typescript
// server/database/schema/teamInvitations.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { nanoid } from 'nanoid'

export const teamInvitations = sqliteTable('team_invitations', {
  id: text('id')
    .primaryKey()
    .$default(() => nanoid()),

  teamId: text('team_id')
    .notNull()
    .references(() => teams.id, { onDelete: 'cascade' }),

  email: text('email')
    .notNull(),

  role: text('role', { enum: ['admin', 'member'] })
    .notNull()
    .default('member'),

  status: text('status', { enum: ['pending', 'accepted', 'expired', 'cancelled'] })
    .notNull()
    .default('pending'),

  token: text('token')
    .notNull()
    .unique(), // For accepting invitations via link

  expiresAt: integer('expires_at', { mode: 'timestamp' })
    .notNull(), // 7 days default

  inviterId: text('inviter_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),

  createdAt: integer('created_at', { mode: 'timestamp' })
    .$default(() => new Date())
    .notNull()
})

export type TeamInvitation = typeof teamInvitations.$inferSelect
export type NewTeamInvitation = typeof teamInvitations.$inferInsert
```

### Server Utilities

#### `team-auth.ts` - Access Control

```typescript
// server/utils/team-auth.ts
import { eq, and } from 'drizzle-orm'
import * as tables from '../database/schema'

/**
 * Resolves a team by slug or ID and verifies user membership
 *
 * @param event - H3 event object
 * @returns Object containing team, user, and membership
 * @throws 404 if team not found, 403 if user not authorized
 */
export async function resolveTeamAndCheckMembership(event: any) {
  const { id: teamSlugOrId } = getRouterParams(event)
  const { user } = await requireUserSession(event)

  // Try to find team by slug first (most common case)
  let team = await useDB()
    .select()
    .from(tables.teams)
    .where(eq(tables.teams.slug, teamSlugOrId))
    .get()

  // If not found by slug, try by ID
  if (!team) {
    team = await useDB()
      .select()
      .from(tables.teams)
      .where(eq(tables.teams.id, teamSlugOrId))
      .get()
  }

  if (!team) {
    throw createError({
      statusCode: 404,
      statusMessage: `Team not found: ${teamSlugOrId}`
    })
  }

  // Check if user is a member of the team
  const membership = await useDB()
    .select()
    .from(tables.teamMembers)
    .where(
      and(
        eq(tables.teamMembers.teamId, team.id),
        eq(tables.teamMembers.userId, user.id)
      )
    )
    .get()

  if (!membership) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Unauthorized - You are not a member of this team'
    })
  }

  return { team, user, membership }
}

/**
 * Checks if a user has a specific role in a team
 */
export async function requireTeamRole(
  event: any,
  teamId: string,
  requiredRoles: string[]
) {
  const { user } = await requireUserSession(event)

  const membership = await useDB()
    .select()
    .from(tables.teamMembers)
    .where(
      and(
        eq(tables.teamMembers.teamId, teamId),
        eq(tables.teamMembers.userId, user.id)
      )
    )
    .get()

  if (!membership || !requiredRoles.includes(membership.role)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Insufficient permissions'
    })
  }

  return membership
}

/**
 * Checks if user is team owner
 */
export async function requireTeamOwner(event: any, teamId: string) {
  return requireTeamRole(event, teamId, ['owner'])
}

/**
 * Checks if user is team owner or admin
 */
export async function requireTeamAdmin(event: any, teamId: string) {
  return requireTeamRole(event, teamId, ['owner', 'admin'])
}
```

#### `team-queries.ts` - Common Database Queries

```typescript
// server/utils/team-queries.ts
import { eq, and } from 'drizzle-orm'
import * as tables from '../database/schema'

/**
 * Get all teams for a user
 */
export async function getUserTeams(userId: string) {
  return await useDB()
    .select({
      team: tables.teams,
      membership: tables.teamMembers
    })
    .from(tables.teamMembers)
    .innerJoin(tables.teams, eq(tables.teamMembers.teamId, tables.teams.id))
    .where(eq(tables.teamMembers.userId, userId))
    .all()
}

/**
 * Get team members with user details
 */
export async function getTeamMembers(teamId: string) {
  return await useDB()
    .select({
      membership: tables.teamMembers,
      user: {
        id: tables.user.id,
        name: tables.user.name,
        email: tables.user.email,
        image: tables.user.image
      }
    })
    .from(tables.teamMembers)
    .innerJoin(tables.user, eq(tables.teamMembers.userId, tables.user.id))
    .where(eq(tables.teamMembers.teamId, teamId))
    .all()
}

/**
 * Get pending invitations for a team
 */
export async function getPendingInvitations(teamId: string) {
  return await useDB()
    .select()
    .from(tables.teamInvitations)
    .where(
      and(
        eq(tables.teamInvitations.teamId, teamId),
        eq(tables.teamInvitations.status, 'pending')
      )
    )
    .all()
}

/**
 * Check if slug is available
 */
export async function isSlugAvailable(slug: string): Promise<boolean> {
  const existing = await useDB()
    .select()
    .from(tables.teams)
    .where(eq(tables.teams.slug, slug))
    .get()

  return !existing
}
```

### API Endpoints

#### `POST /api/teams` - Create Team

```typescript
// server/api/teams/index.post.ts
import { z } from 'zod'

const createTeamSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  logo: z.string().url().optional()
})

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const body = await readValidatedBody(event, createTeamSchema.parse)

  // Check slug availability
  const slugAvailable = await isSlugAvailable(body.slug)
  if (!slugAvailable) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Slug already taken'
    })
  }

  // Create team
  const team = await useDB()
    .insert(tables.teams)
    .values({
      name: body.name,
      slug: body.slug,
      logo: body.logo,
      ownerId: user.id
    })
    .returning()
    .get()

  // Add creator as owner
  await useDB()
    .insert(tables.teamMembers)
    .values({
      teamId: team.id,
      userId: user.id,
      role: 'owner'
    })

  return team
})
```

#### `GET /api/teams/[id]/members` - List Team Members

```typescript
// server/api/teams/[id]/members.get.ts
export default defineEventHandler(async (event) => {
  const { team } = await resolveTeamAndCheckMembership(event)

  const members = await getTeamMembers(team.id)

  return members
})
```

#### `POST /api/teams/[id]/members` - Invite Member

```typescript
// server/api/teams/[id]/members.post.ts
import { z } from 'zod'
import { nanoid } from 'nanoid'

const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'member']).default('member')
})

export default defineEventHandler(async (event) => {
  const { team } = await resolveTeamAndCheckMembership(event)

  // Require admin or owner role to invite
  await requireTeamAdmin(event, team.id)

  const body = await readValidatedBody(event, inviteMemberSchema.parse)

  // Check if user is already a member
  const existingMember = await useDB()
    .select()
    .from(tables.teamMembers)
    .innerJoin(tables.user, eq(tables.teamMembers.userId, tables.user.id))
    .where(
      and(
        eq(tables.teamMembers.teamId, team.id),
        eq(tables.user.email, body.email)
      )
    )
    .get()

  if (existingMember) {
    throw createError({
      statusCode: 400,
      statusMessage: 'User is already a member'
    })
  }

  // Check for existing pending invitation
  const existingInvite = await useDB()
    .select()
    .from(tables.teamInvitations)
    .where(
      and(
        eq(tables.teamInvitations.teamId, team.id),
        eq(tables.teamInvitations.email, body.email),
        eq(tables.teamInvitations.status, 'pending')
      )
    )
    .get()

  if (existingInvite) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invitation already pending'
    })
  }

  const { user } = await requireUserSession(event)

  // Create invitation
  const invitation = await useDB()
    .insert(tables.teamInvitations)
    .values({
      teamId: team.id,
      email: body.email,
      role: body.role,
      token: nanoid(32),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      inviterId: user.id
    })
    .returning()
    .get()

  // TODO: Send email if nuxt-crouton-email is available
  // await sendTeamInvitationEmail(invitation)

  return invitation
})
```

### Composables

#### `useTeam()` - Active Team Context

```typescript
// app/composables/useTeam.ts

export interface Team {
  id: string
  name: string
  slug: string
  logo?: string
  ownerId: string
  metadata?: any
  createdAt: Date
  updatedAt: Date
}

export function useTeam() {
  const activeTeamId = useState<string | null>('crouton:activeTeamId', () => null)
  const activeTeam = useState<Team | null>('crouton:activeTeam', () => null)

  /**
   * Set the active team for the current session
   */
  const setActiveTeam = async (teamId: string) => {
    try {
      const team = await $fetch<Team>(`/api/teams/${teamId}`)
      activeTeamId.value = teamId
      activeTeam.value = team

      // Persist to localStorage for client-side persistence
      if (import.meta.client) {
        localStorage.setItem('crouton:activeTeamId', teamId)
      }

      return team
    } catch (error) {
      console.error('Failed to set active team:', error)
      throw error
    }
  }

  /**
   * Refresh the active team data
   */
  const refreshTeam = async () => {
    if (!activeTeamId.value) return

    try {
      const team = await $fetch<Team>(`/api/teams/${activeTeamId.value}`)
      activeTeam.value = team
      return team
    } catch (error) {
      console.error('Failed to refresh team:', error)
      throw error
    }
  }

  /**
   * Clear active team
   */
  const clearActiveTeam = () => {
    activeTeamId.value = null
    activeTeam.value = null

    if (import.meta.client) {
      localStorage.removeItem('crouton:activeTeamId')
    }
  }

  // Auto-restore from localStorage on client
  if (import.meta.client) {
    const storedTeamId = localStorage.getItem('crouton:activeTeamId')
    if (storedTeamId && !activeTeamId.value) {
      setActiveTeam(storedTeamId).catch(() => {
        // Silently clear if team no longer accessible
        clearActiveTeam()
      })
    }
  }

  return {
    activeTeamId: readonly(activeTeamId),
    activeTeam: readonly(activeTeam),
    currentTeam: activeTeam, // Alias for compatibility
    setActiveTeam,
    refreshTeam,
    clearActiveTeam
  }
}
```

#### `useTeams()` - Team Management

```typescript
// app/composables/useTeams.ts

export function useTeams() {
  const { user } = useAuth() // Assumes auth layer

  /**
   * Fetch all teams for the current user
   */
  const { data: teams, refresh, pending } = useFetch('/api/teams', {
    key: 'user-teams',
    default: () => []
  })

  /**
   * Create a new team
   */
  const createTeam = async (data: {
    name: string
    slug: string
    logo?: string
  }) => {
    try {
      const team = await $fetch('/api/teams', {
        method: 'POST',
        body: data
      })

      await refresh() // Refresh teams list

      return team
    } catch (error) {
      console.error('Failed to create team:', error)
      throw error
    }
  }

  /**
   * Check if a slug is available
   */
  const checkSlug = async (slug: string): Promise<boolean> => {
    try {
      const result = await $fetch<{ available: boolean }>('/api/teams/check-slug', {
        method: 'POST',
        body: { slug }
      })
      return result.available
    } catch (error) {
      console.error('Failed to check slug:', error)
      return false
    }
  }

  /**
   * Update a team
   */
  const updateTeam = async (teamId: string, data: Partial<Team>) => {
    try {
      const team = await $fetch(`/api/teams/${teamId}`, {
        method: 'PATCH',
        body: data
      })

      await refresh()

      return team
    } catch (error) {
      console.error('Failed to update team:', error)
      throw error
    }
  }

  /**
   * Delete a team
   */
  const deleteTeam = async (teamId: string) => {
    try {
      await $fetch(`/api/teams/${teamId}`, {
        method: 'DELETE'
      })

      await refresh()
    } catch (error) {
      console.error('Failed to delete team:', error)
      throw error
    }
  }

  return {
    teams: readonly(teams),
    pending: readonly(pending),
    createTeam,
    updateTeam,
    deleteTeam,
    checkSlug,
    refresh
  }
}
```

#### `useTeamMembers()` - Member Management

```typescript
// app/composables/useTeamMembers.ts

export interface TeamMember {
  membership: {
    id: string
    teamId: string
    userId: string
    role: 'owner' | 'admin' | 'member'
    createdAt: Date
  }
  user: {
    id: string
    name: string
    email: string
    image?: string
  }
}

export function useTeamMembers(teamId: MaybeRef<string>) {
  const _teamId = computed(() => unref(teamId))

  /**
   * Fetch team members
   */
  const { data: members, refresh, pending } = useFetch(
    () => `/api/teams/${_teamId.value}/members`,
    {
      key: () => `team-members-${_teamId.value}`,
      default: () => []
    }
  )

  /**
   * Invite a new member
   */
  const inviteMember = async (email: string, role: 'admin' | 'member' = 'member') => {
    try {
      const invitation = await $fetch(`/api/teams/${_teamId.value}/members`, {
        method: 'POST',
        body: { email, role }
      })

      return invitation
    } catch (error) {
      console.error('Failed to invite member:', error)
      throw error
    }
  }

  /**
   * Update member role
   */
  const updateMemberRole = async (userId: string, role: 'admin' | 'member') => {
    try {
      const member = await $fetch(`/api/teams/${_teamId.value}/members/${userId}`, {
        method: 'PATCH',
        body: { role }
      })

      await refresh()

      return member
    } catch (error) {
      console.error('Failed to update member role:', error)
      throw error
    }
  }

  /**
   * Remove a member from the team
   */
  const removeMember = async (userId: string) => {
    try {
      await $fetch(`/api/teams/${_teamId.value}/members/${userId}`, {
        method: 'DELETE'
      })

      await refresh()
    } catch (error) {
      console.error('Failed to remove member:', error)
      throw error
    }
  }

  return {
    members: readonly(members),
    pending: readonly(pending),
    inviteMember,
    updateMemberRole,
    removeMember,
    refresh
  }
}
```

### Components

#### `TeamSwitcher.vue` - Team Selection Dropdown

```vue
<script setup lang="ts">
const { activeTeam, setActiveTeam } = useTeam()
const { teams } = useTeams()

const teamItems = computed(() => {
  return teams.value?.map(({ team }) => ({
    label: team.name,
    avatar: { src: team.logo },
    click: () => setActiveTeam(team.id)
  })) || []
})

const createNewTeam = () => {
  // Open create team modal
}
</script>

<template>
  <UDropdownMenu :items="[teamItems]">
    <UButton
      color="neutral"
      variant="ghost"
      trailing-icon="i-lucide-chevron-down"
    >
      <UAvatar
        v-if="activeTeam?.logo"
        :src="activeTeam.logo"
        :alt="activeTeam.name"
        size="xs"
      />
      <span>{{ activeTeam?.name || 'Select Team' }}</span>
    </UButton>

    <template #panel>
      <div class="p-2 border-t">
        <UButton
          color="neutral"
          variant="ghost"
          block
          @click="createNewTeam"
        >
          Create Team
        </UButton>
      </div>
    </template>
  </UDropdownMenu>
</template>
```

#### `TeamMemberList.vue` - Member Table

```vue
<script setup lang="ts">
const props = defineProps<{
  teamId: string
}>()

const { members, removeMember, updateMemberRole } = useTeamMembers(props.teamId)
const { user } = useAuth()

const canManageMembers = computed(() => {
  const currentMember = members.value?.find(m => m.user.id === user.value?.id)
  return currentMember?.membership.role === 'owner' ||
         currentMember?.membership.role === 'admin'
})

const handleRoleChange = async (member: TeamMember, newRole: string) => {
  await updateMemberRole(member.user.id, newRole as 'admin' | 'member')
}

const handleRemove = async (member: TeamMember) => {
  if (confirm(`Remove ${member.user.name} from the team?`)) {
    await removeMember(member.user.id)
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-semibold">Team Members</h3>
      <CroutonTeamInviteForm v-if="canManageMembers" :team-id="teamId" />
    </div>

    <div class="divide-y">
      <div
        v-for="member in members"
        :key="member.user.id"
        class="flex items-center justify-between py-3"
      >
        <div class="flex items-center gap-3">
          <UAvatar
            :src="member.user.image"
            :alt="member.user.name"
          />
          <div>
            <p class="font-medium">{{ member.user.name }}</p>
            <p class="text-sm text-muted">{{ member.user.email }}</p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <UBadge
            v-if="member.membership.role === 'owner'"
            color="primary"
          >
            Owner
          </UBadge>

          <USelect
            v-else-if="canManageMembers"
            :model-value="member.membership.role"
            :options="['admin', 'member']"
            @update:model-value="handleRoleChange(member, $event)"
          />

          <UBadge v-else>
            {{ member.membership.role }}
          </UBadge>

          <UButton
            v-if="canManageMembers && member.membership.role !== 'owner'"
            color="error"
            variant="ghost"
            size="sm"
            icon="i-lucide-trash"
            @click="handleRemove(member)"
          />
        </div>
      </div>
    </div>
  </div>
</template>
```

### Middleware

#### `team.ts` - Auto-resolve Team from Route

```typescript
// app/middleware/team.ts
export default defineNuxtRouteMiddleware(async (to) => {
  const { setActiveTeam } = useTeam()

  const teamParam = to.params.team as string

  if (teamParam) {
    try {
      await setActiveTeam(teamParam)
    } catch (error) {
      // Team not found or access denied
      return navigateTo('/dashboard')
    }
  }
})
```

### Integration with `nuxt-crouton` Base Layer

The teams layer integrates seamlessly with the base `nuxt-crouton` layer:

```typescript
// In collection generator
// Collections automatically get teamId field
const { items } = useCollectionQuery('bookings', {
  teamId: activeTeam.value?.id
})

// Server-side team scoping in generated endpoints
export default defineEventHandler(async (event) => {
  const { team } = await resolveTeamAndCheckMembership(event)

  const bookings = await useDB()
    .select()
    .from(tables.bookings)
    .where(eq(tables.bookings.teamId, team.id))
    .all()

  return bookings
})
```

### Dependencies

```json
{
  "name": "@friendlyinternet/nuxt-crouton-teams",
  "version": "1.0.0",
  "peerDependencies": {
    "nuxt": "^4.0.0",
    "@friendlyinternet/nuxt-crouton": "^1.2.0",
    "drizzle-orm": "^0.30.0",
    "nanoid": "^5.0.0",
    "zod": "^3.0.0"
  },
  "devDependencies": {
    "drizzle-kit": "^0.31.0"
  }
}
```

---

## Package 2: `@friendlyinternet/nuxt-crouton-storage`

### Overview

NuxtHub Blob storage utilities for file and image management, providing:
- Image upload with validation and preview
- Generic file upload
- Avatar upload component
- Blob management utilities

### Package Structure

```
packages/nuxt-crouton-storage/
├── server/
│   ├── api/
│   │   ├── storage/
│   │   │   ├── upload-image.post.ts   # Image upload
│   │   │   ├── upload-file.post.ts    # Generic file
│   │   │   └── [...path].delete.ts    # Delete file
│   │   └── utils/
│   │       └── storage.ts              # Helper functions
├── app/
│   ├── components/
│   │   ├── ImageUpload.vue
│   │   ├── FileUpload.vue
│   │   ├── AvatarUpload.vue
│   │   └── FilePreview.vue
│   └── composables/
│       ├── useImageUpload.ts
│       ├── useFileUpload.ts
│       └── useStorageUrl.ts
├── types/
│   └── index.ts
├── nuxt.config.ts
├── package.json
└── README.md
```

### Server API Endpoints

#### `POST /api/storage/upload-image` - Image Upload

```typescript
// server/api/storage/upload-image.post.ts
export default defineEventHandler(async (event) => {
  // Require authentication
  const { user } = await requireUserSession(event)

  const form = await readFormData(event)
  const image = form.get('image')

  if (!(image instanceof Blob)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Image is required and must be a valid file'
    })
  }

  try {
    ensureBlob(image, {
      maxSize: '2MB',
      types: ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
    })
  } catch (error: unknown) {
    throw createError({
      statusCode: 400,
      statusMessage: (error as Error).message || 'Invalid image file'
    })
  }

  // Upload to NuxtHub Blob
  const file = await hubBlob().put(image.name, image, {
    addRandomSuffix: true,
    prefix: `images/${user.id}/` // Organize by user
  })

  return {
    pathname: file.pathname,
    url: file.url,
    filename: file.pathname.split('/').pop()
  }
})
```

#### `POST /api/storage/upload-file` - Generic File Upload

```typescript
// server/api/storage/upload-file.post.ts
const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/csv',
  'application/zip'
]

export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)

  const form = await readFormData(event)
  const file = form.get('file')

  if (!(file instanceof Blob)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'File is required and must be a valid file'
    })
  }

  try {
    ensureBlob(file, {
      maxSize: '10MB',
      types: ALLOWED_TYPES
    })
  } catch (error: unknown) {
    throw createError({
      statusCode: 400,
      statusMessage: (error as Error).message || 'Invalid file'
    })
  }

  const uploadedFile = await hubBlob().put(file.name, file, {
    addRandomSuffix: true,
    prefix: `files/${user.id}/`
  })

  return {
    pathname: uploadedFile.pathname,
    url: uploadedFile.url,
    filename: uploadedFile.pathname.split('/').pop(),
    size: file.size,
    type: file.type
  }
})
```

#### `DELETE /api/storage/[...path]` - Delete File

```typescript
// server/api/storage/[...path].delete.ts
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)

  const path = getRouterParam(event, 'path')

  if (!path) {
    throw createError({
      statusCode: 400,
      statusMessage: 'File path is required'
    })
  }

  // Security: Ensure user can only delete their own files
  if (!path.startsWith(`images/${user.id}/`) && !path.startsWith(`files/${user.id}/`)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Unauthorized to delete this file'
    })
  }

  try {
    await hubBlob().delete(path)

    return {
      success: true,
      message: 'File deleted successfully'
    }
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to delete file'
    })
  }
})
```

### Server Utils

```typescript
// server/utils/storage.ts

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || ''
}

/**
 * Get MIME type icon
 */
export function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'i-lucide-image'
  if (mimeType.startsWith('video/')) return 'i-lucide-video'
  if (mimeType === 'application/pdf') return 'i-lucide-file-text'
  if (mimeType.includes('word')) return 'i-lucide-file-text'
  if (mimeType.includes('sheet') || mimeType.includes('csv')) return 'i-lucide-table'
  if (mimeType.includes('zip') || mimeType.includes('archive')) return 'i-lucide-archive'
  return 'i-lucide-file'
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}
```

### Composables

#### `useImageUpload()` - Image Upload Logic

```typescript
// app/composables/useImageUpload.ts

export interface ImageUploadOptions {
  maxSize?: string // e.g., '2MB'
  onSuccess?: (url: string) => void
  onError?: (error: Error) => void
}

export function useImageUpload(options: ImageUploadOptions = {}) {
  const selectedFile = ref<File | null>(null)
  const previewUrl = ref<string | null>(null)
  const isUploading = ref(false)
  const uploadedUrl = ref<string | null>(null)
  const toast = useToast()

  /**
   * Select a file and create preview
   */
  const selectFile = (file: File) => {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!validTypes.includes(file.type)) {
      const error = new Error('Invalid file type. Please upload JPEG, PNG, GIF, or WebP.')
      options.onError?.(error)
      toast.add({
        title: 'Invalid file type',
        description: error.message,
        color: 'error'
      })
      return
    }

    // Validate file size
    const maxSizeBytes = parseSize(options.maxSize || '2MB')
    if (file.size > maxSizeBytes) {
      const error = new Error(`File too large. Maximum size is ${options.maxSize || '2MB'}.`)
      options.onError?.(error)
      toast.add({
        title: 'File too large',
        description: error.message,
        color: 'error'
      })
      return
    }

    selectedFile.value = file

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      previewUrl.value = e.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  /**
   * Upload the selected image
   */
  const upload = async () => {
    if (!selectedFile.value) return

    try {
      isUploading.value = true

      const formData = new FormData()
      formData.append('image', selectedFile.value)

      const response = await $fetch<{
        pathname: string
        url: string
        filename: string
      }>('/api/storage/upload-image', {
        method: 'POST',
        body: formData
      })

      uploadedUrl.value = response.url
      options.onSuccess?.(response.url)

      toast.add({
        title: 'Image uploaded',
        description: 'Your image has been uploaded successfully',
        color: 'success'
      })

      return response
    } catch (error) {
      const err = error as Error
      options.onError?.(err)
      toast.add({
        title: 'Upload failed',
        description: err.message || 'Failed to upload image',
        color: 'error'
      })
      throw error
    } finally {
      isUploading.value = false
    }
  }

  /**
   * Cancel the current selection
   */
  const cancel = () => {
    selectedFile.value = null
    previewUrl.value = null
  }

  /**
   * Remove uploaded image
   */
  const remove = async () => {
    if (!uploadedUrl.value) return

    try {
      // Extract pathname from URL
      const url = new URL(uploadedUrl.value)
      const pathname = url.pathname.replace('/blob/', '')

      await $fetch(`/api/storage/${pathname}`, {
        method: 'DELETE'
      })

      uploadedUrl.value = null
      cancel()

      toast.add({
        title: 'Image removed',
        color: 'success'
      })
    } catch (error) {
      toast.add({
        title: 'Failed to remove image',
        color: 'error'
      })
      throw error
    }
  }

  return {
    selectedFile: readonly(selectedFile),
    previewUrl: readonly(previewUrl),
    isUploading: readonly(isUploading),
    uploadedUrl: readonly(uploadedUrl),
    selectFile,
    upload,
    cancel,
    remove
  }
}

// Helper function to parse size strings
function parseSize(size: string): number {
  const match = size.match(/^(\d+)(kb|mb|gb)$/i)
  if (!match) return 2 * 1024 * 1024 // Default 2MB

  const [, amount, unit] = match
  const multipliers = {
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024
  }

  return parseInt(amount) * multipliers[unit.toLowerCase() as keyof typeof multipliers]
}
```

#### `useFileUpload()` - Generic File Upload

```typescript
// app/composables/useFileUpload.ts

export interface FileUploadOptions {
  maxSize?: string
  allowedTypes?: string[]
  multiple?: boolean
  onSuccess?: (url: string | string[]) => void
  onError?: (error: Error) => void
}

export function useFileUpload(options: FileUploadOptions = {}) {
  const selectedFiles = ref<File[]>([])
  const isUploading = ref(false)
  const uploadedUrls = ref<string[]>([])
  const toast = useToast()

  const selectFiles = (files: File[]) => {
    if (!options.multiple && files.length > 1) {
      files = [files[0]]
    }

    selectedFiles.value = files
  }

  const upload = async () => {
    if (selectedFiles.value.length === 0) return

    try {
      isUploading.value = true

      const uploads = selectedFiles.value.map(async (file) => {
        const formData = new FormData()
        formData.append('file', file)

        const response = await $fetch<{
          pathname: string
          url: string
          filename: string
        }>('/api/storage/upload-file', {
          method: 'POST',
          body: formData
        })

        return response.url
      })

      const urls = await Promise.all(uploads)
      uploadedUrls.value = urls

      options.onSuccess?.(options.multiple ? urls : urls[0])

      toast.add({
        title: 'Files uploaded',
        color: 'success'
      })

      return urls
    } catch (error) {
      const err = error as Error
      options.onError?.(err)
      toast.add({
        title: 'Upload failed',
        description: err.message,
        color: 'error'
      })
      throw error
    } finally {
      isUploading.value = false
    }
  }

  const cancel = () => {
    selectedFiles.value = []
  }

  return {
    selectedFiles: readonly(selectedFiles),
    isUploading: readonly(isUploading),
    uploadedUrls: readonly(uploadedUrls),
    selectFiles,
    upload,
    cancel
  }
}
```

### Components

#### `ImageUpload.vue` - Full Image Upload UI

```vue
<script setup lang="ts">
const model = defineModel<string | null>({ default: null })

const props = defineProps<{
  maxSize?: string
  label?: string
  description?: string
}>()

const fileInput = ref<HTMLInputElement>()

const {
  previewUrl,
  isUploading,
  selectFile,
  upload,
  cancel,
  remove
} = useImageUpload({
  maxSize: props.maxSize,
  onSuccess: (url) => {
    model.value = url
  }
})

const triggerFileSelect = () => fileInput.value?.click()

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    selectFile(file)
  }
}

const handleUpload = async () => {
  await upload()
  cancel()
}

const handleRemove = async () => {
  await remove()
  model.value = null
}
</script>

<template>
  <div class="space-y-4">
    <div v-if="label || description" class="space-y-1">
      <label v-if="label" class="font-medium">{{ label }}</label>
      <p v-if="description" class="text-sm text-muted">{{ description }}</p>
    </div>

    <div class="flex items-center gap-4">
      <!-- Preview -->
      <div class="flex-shrink-0">
        <img
          v-if="previewUrl || model"
          :src="previewUrl || model || undefined"
          alt="Preview"
          class="w-24 h-24 object-cover rounded-lg ring-2 ring-gray-200 dark:ring-gray-700"
        />
        <div
          v-else
          class="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center"
        >
          <UIcon name="i-lucide-image" class="w-8 h-8 text-gray-400" />
        </div>
      </div>

      <!-- Actions -->
      <div class="flex-1 space-y-2">
        <input
          ref="fileInput"
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          class="hidden"
          @change="handleFileChange"
          :disabled="isUploading"
        />

        <div class="flex items-center gap-2">
          <UButton
            v-if="!previewUrl"
            size="sm"
            variant="outline"
            @click="triggerFileSelect"
            :loading="isUploading"
          >
            Choose Image
          </UButton>

          <UButton
            v-if="previewUrl"
            size="sm"
            color="primary"
            @click="handleUpload"
            :loading="isUploading"
          >
            Upload
          </UButton>

          <UButton
            v-if="previewUrl"
            size="sm"
            variant="ghost"
            @click="cancel"
            :disabled="isUploading"
          >
            Cancel
          </UButton>

          <UButton
            v-if="model && !previewUrl"
            size="sm"
            variant="ghost"
            color="error"
            @click="handleRemove"
            :disabled="isUploading"
          >
            Remove
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>
```

#### `AvatarUpload.vue` - Circular Avatar Uploader

```vue
<script setup lang="ts">
const model = defineModel<string | null>({ default: null })

const fileInput = ref<HTMLInputElement>()

const {
  previewUrl,
  isUploading,
  selectFile,
  upload,
  cancel
} = useImageUpload({
  maxSize: '1MB',
  onSuccess: (url) => {
    model.value = url
  }
})

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    selectFile(file)
    upload().then(() => cancel())
  }
}
</script>

<template>
  <div class="relative inline-block">
    <UAvatar
      :src="previewUrl || model || undefined"
      size="2xl"
      class="ring-2 ring-gray-300 dark:ring-gray-600"
    />

    <input
      ref="fileInput"
      type="file"
      accept="image/jpeg,image/png,image/webp"
      class="hidden"
      @change="handleFileChange"
      :disabled="isUploading"
    />

    <UButton
      color="neutral"
      variant="outline"
      size="xs"
      icon="i-lucide-camera"
      class="absolute bottom-0 right-0"
      @click="fileInput?.click()"
      :loading="isUploading"
    />
  </div>
</template>
```

### Dependencies

```json
{
  "name": "@friendlyinternet/nuxt-crouton-storage",
  "version": "1.0.0",
  "peerDependencies": {
    "nuxt": "^4.0.0",
    "@nuxthub/core": "^0.7.0"
  }
}
```

---

## Migration Path

### For Existing `nuxt-crouton` Users

1. **Install new layers:**
   ```bash
   pnpm add @friendlyinternet/nuxt-crouton-teams
   pnpm add @friendlyinternet/nuxt-crouton-storage
   ```

2. **Update `nuxt.config.ts`:**
   ```typescript
   export default defineNuxtConfig({
     extends: [
       '@friendlyinternet/nuxt-crouton',
       '@friendlyinternet/nuxt-crouton-teams',    // 🆕
       '@friendlyinternet/nuxt-crouton-storage',  // 🆕
       '@friendlyinternet/nuxt-crouton-i18n'
     ]
   })
   ```

3. **Run database migrations:**
   ```bash
   pnpm db:generate
   pnpm db:migrate
   ```

4. **Update collection generator:**
   - Collections automatically get `teamId` field
   - Update API endpoints to use `resolveTeamAndCheckMembership()`

### Breaking Changes

None - these are new, additive layers.

---

## Testing Strategy

### Unit Tests

- Composable logic (useTeam, useTeams, useImageUpload)
- Server utilities (team-auth, team-queries)
- Validation schemas

### Integration Tests

- API endpoints (create team, invite member, upload image)
- Team membership validation
- File upload/delete flows

### E2E Tests (Playwright)

- Team creation and switching
- Member invitation flow
- Image upload and preview
- Avatar upload

---

## Documentation Requirements

### README Files

Each package needs:
- Installation instructions
- Quick start guide
- API reference
- Component documentation
- Examples

### Migration Guides

- From custom team logic to nuxt-crouton-teams
- From custom file uploads to nuxt-crouton-storage

### Best Practices

- Team-scoped data patterns
- Permission checking strategies
- File organization conventions

---

## Timeline Estimate

### `nuxt-crouton-storage` (1-2 days)
- ✅ Already 80% complete
- Day 1: Extract and package existing upload-image.post.ts
- Day 1-2: Add generic file upload, components, composables
- Day 2: Documentation and examples

### `nuxt-crouton-teams` (3-4 days)
- Day 1: Database schema and server utils
- Day 2: API endpoints and composables
- Day 3: Components (TeamSwitcher, MemberList, etc.)
- Day 4: Documentation, testing, examples

### Total: 4-6 days for both packages

---

## Success Criteria

### For `nuxt-crouton-teams`:
- ✅ Teams can be created with unique slugs
- ✅ Members can be invited via email
- ✅ Roles (owner/admin/member) work correctly
- ✅ Team-scoped collections filter data properly
- ✅ Team switching works seamlessly

### For `nuxt-crouton-storage`:
- ✅ Images upload to NuxtHub Blob
- ✅ Client-side preview works
- ✅ File validation (size, type) works
- ✅ Delete operation works
- ✅ Components integrate with v-model

---

## Next Steps

1. **Create package directories** in `packages/`
2. **Start with `nuxt-crouton-storage`** (easier, fewer dependencies)
3. **Extract SuperSaaS code** for teams functionality
4. **Write documentation** as we build
5. **Create example projects** showing integration
6. **Publish to npm** when stable

---

## References

- SuperSaaS project: `/Users/pmcp/Projects/supersaas-next`
- Nuxt Crouton base: `/Users/pmcp/Projects/nuxt-crouton/packages/nuxt-crouton`
- Better Auth docs: https://better-auth.com
- NuxtHub Blob docs: https://hub.nuxt.com/docs/features/blob

---

**End of Brief**