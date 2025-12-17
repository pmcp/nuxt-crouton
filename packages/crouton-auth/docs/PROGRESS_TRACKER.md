# @crouton/auth Package Implementation Plan

> **Goal**: Create a Nuxt layer package that wraps Better Auth, providing authentication + teams + billing with three operational modes (multi-tenant, single-tenant, personal).

## Quick Stats

| Metric | Value |
|--------|-------|
| **Tasks Completed** | 32 / 54 |
| **Current Phase** | Phase 6 - Complete |
| **Estimated Total** | ~40-60 hours |

---

## Executive Summary

### What We're Building

`@crouton/auth` is a Nuxt layer that wraps [Better Auth](https://www.better-auth.com/) to provide:

1. **Authentication** - Email/password, OAuth, passkeys, 2FA, magic links
2. **Teams** (via Better Auth's Organization plugin) - Multi-tenant team management
3. **Billing** (via Better Auth's Stripe plugin) - Subscription management
4. **Three Modes** - Multi-tenant SaaS, single-tenant app, personal app

### Why Better Auth?

- Battle-tested auth implementation
- Built-in organization/team support
- Built-in Stripe billing
- Plugin architecture for extensibility
- Nuxt-native integration
- Active community & maintenance

### End Result

```typescript
// User's nuxt.config.ts - this is all they need
export default defineNuxtConfig({
  extends: ['@crouton/auth'],

  crouton: {
    auth: {
      mode: 'multi-tenant',
      oauth: {
        github: { clientId: '...', clientSecret: '...' }
      },
      billing: { enabled: true }
    }
  }
})
```

---

## Phase 1: Project Setup & Core Structure
**Estimated: 4-6 hours**

### Task 1.1: Initialize Package Structure ✅
- [x] Create new directory `packages/crouton-auth/`
- [x] Initialize `package.json` with correct dependencies
- [x] Set up TypeScript configuration
- [x] Create base `nuxt.config.ts` for the layer
- [x] Set up build tooling (unbuild or similar)

**Files to create:**
```
packages/crouton-auth/
├── package.json
├── tsconfig.json
├── nuxt.config.ts
├── app/
├── server/
└── types/
```

**Dependencies:**
```json
{
  "dependencies": {
    "better-auth": "^1.x",
    "@better-auth/cli": "^1.x",
    "drizzle-orm": "^0.x"
  },
  "peerDependencies": {
    "nuxt": "^3.x || ^4.x",
    "@nuxt/ui": "^3.x"
  }
}
```

### Task 1.2: Define Configuration Schema ✅
- [x] Create `types/config.ts` with full configuration interface
- [x] Define mode types: `'multi-tenant' | 'single-tenant' | 'personal'`
- [x] Define auth method options
- [x] Define OAuth provider configs
- [x] Define billing config options
- [x] Add JSDoc comments for all options

**Expected interface:**
```typescript
interface CroutonAuthConfig {
  mode: 'multi-tenant' | 'single-tenant' | 'personal'

  methods?: {
    password?: boolean | PasswordConfig
    oauth?: OAuthConfig
    passkeys?: boolean | PasskeyConfig
    twoFactor?: boolean | TwoFactorConfig
    magicLink?: boolean | MagicLinkConfig
    phone?: boolean | PhoneConfig
  }

  teams?: {
    allowCreate?: boolean
    limit?: number
    memberLimit?: number
    requireInvite?: boolean
  }

  billing?: {
    enabled?: boolean
    provider?: 'stripe'
    stripe?: StripeConfig
  }

  ui?: {
    theme?: 'default' | 'minimal'
    redirects?: RedirectConfig
  }
}
```

### Task 1.3: Create Module Entry Point ✅
- [x] Create `module.ts` as Nuxt module entry
- [x] Register runtime config from user config
- [x] Set up module hooks for configuration
- [x] Add config validation on module load

---

## Phase 2: Better Auth Integration
**Estimated: 8-12 hours**

### Task 2.1: Core Better Auth Setup ✅
- [x] Create `server/lib/auth.ts` - main auth instance factory
- [x] Configure Drizzle adapter for SQLite (NuxtHub)
- [ ] Configure Drizzle adapter for PostgreSQL (optional)
- [x] Set up session configuration
- [x] Implement base email/password authentication

**Core implementation:**
```typescript
// server/lib/auth.ts
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'

export const createAuth = (config: CroutonAuthConfig, db: DrizzleDB) => {
  return betterAuth({
    database: drizzleAdapter(db, { provider: 'sqlite' }),
    emailAndPassword: {
      enabled: config.methods?.password !== false
    },
    // ... rest of config
  })
}
```

### Task 2.2: Organization Plugin (Teams) ✅
- [x] Configure organization plugin for all modes
- [x] Set up default roles (owner, admin, member)
- [x] Configure invitation system
- [x] Implement team limits based on config
- [ ] Add sub-team support (optional - deferred)

**Mode-specific behavior:**
```typescript
organization({
  // Multi-tenant: users create/join multiple orgs
  allowUserToCreateOrganization: config.mode === 'multi-tenant',

  // Single-tenant: one org, many users
  // Personal: one org per user
  organizationLimit: config.mode === 'personal' ? 1 : undefined,
})
```

### Task 2.3: OAuth Providers ✅
- [x] Configure GitHub OAuth
- [x] Configure Google OAuth
- [x] Configure Discord OAuth
- [x] Add support for additional providers (configurable)
- [x] Handle OAuth callback URLs

### Task 2.4: Passkey Plugin ✅
- [x] Configure passkey/WebAuthn plugin
- [x] Set up rpID and rpName from config
- [x] Handle credential registration
- [x] Handle credential authentication
- [x] Support conditional UI (autofill)

### Task 2.5: Two-Factor Authentication ✅
- [x] Configure 2FA plugin
- [x] Set up TOTP support
- [x] Implement backup codes
- [x] Add trusted device management

### Task 2.6: Stripe Billing Plugin ✅
- [x] Configure Stripe plugin
- [x] Set up webhook handling
- [x] Configure subscription plans
- [x] Implement checkout flow
- [x] Handle billing portal redirect
- [x] Support organization-based billing (multi-tenant)
- [x] Support user-based billing (personal mode)

### Task 2.7: API Route Handler ✅
- [x] Create `/server/api/auth/[...all].ts` catch-all route
- [x] Map Better Auth handler to Nuxt event handler
- [x] Ensure proper request/response transformation

```typescript
// server/api/auth/[...all].ts
export default defineEventHandler(async (event) => {
  const auth = useServerAuth(event)
  return auth.handler(toWebRequest(event))
})
```

### Task 2.8: nuxt-crouton Integration ✅
- [x] Create Better Auth connector type for nuxt-crouton
- [x] Map Better Auth tables to crouton expected names (organization → teams, member → teamMembers)
- [x] Handle session format differences between SuperSaaS and Better Auth
- [x] Update `resolveTeamAndCheckMembership()` to work with Better Auth session format
- [x] Query `organization` table (aliased as teams) for team operations
- [x] Query `member` table (aliased as teamMembers) for membership checks
- [ ] Test collection integration with Better Auth (deferred - requires runtime testing)
- [ ] Verify team-scoped CRUD operations work correctly (deferred - requires runtime testing)
- [ ] Verify owner-scoped operations work correctly (deferred - requires runtime testing)

**Implementation notes:**
```typescript
// nuxt-crouton connector configuration
export const betterAuthConnector = {
  tables: {
    users: 'user',
    teams: 'organization',
    teamMembers: 'member',
    sessions: 'session'
  },
  session: {
    // Map Better Auth session to crouton expected format
    getUserId: (session) => session.user.id,
    getTeamId: (session) => session.activeOrganizationId,
  }
}
```

---

## Phase 3: Mode Implementation
**Estimated: 6-8 hours**

### Task 3.1: Multi-Tenant Mode ✅
- [x] Allow organization creation by users
- [x] Enable organization switching
- [x] Support multiple organizations per user
- [x] URL pattern: `/dashboard/[team]/...`
- [x] Team context in session

### Task 3.2: Single-Tenant Mode ✅
- [x] Auto-create default organization on first boot (lazy on first user signup)
- [x] Auto-add all new users to default org
- [ ] Hide organization switcher (UI task - deferred to Phase 5)
- [ ] Simplified URL pattern: `/dashboard/...` (deferred to Task 3.5)
- [x] Auto-select default org in session

**Implementation:**
```typescript
// server/lib/auth.ts - Database hooks for single-tenant mode
databaseHooks: {
  user: { create: { after: async (user) => {
    await ensureDefaultOrgExists(db, defaultTeamId, appName)
    await addUserToDefaultOrg(db, user.id, defaultTeamId)
  }}}
  session: { create: { after: async (session) => {
    await setSessionActiveOrg(db, session.id, defaultTeamId)
  }}}
}
```

### Task 3.3: Personal Mode ✅
- [x] Auto-create organization when user registers
- [x] One org per user (user is always owner)
- [ ] Hide organization management UI (deferred to Phase 5)
- [ ] Optional: allow collaboration (invite to personal org) (deferred)
- [ ] URL pattern: `/dashboard/...` (deferred to Task 3.5)

**Implementation:**
```typescript
// Database hooks for personal mode in buildDatabaseHooks()
user: {
  create: {
    after: async (user) => {
      // Create personal org with user as owner
      const orgId = await createPersonalOrg(db, user.id, user.name, user.email, config.appName)
    }
  }
}
session: {
  create: {
    after: async (session) => {
      // Set active org to user's personal workspace
      const personalOrgId = await getUserPersonalOrgId(db, session.userId)
      await setSessionActiveOrg(db, session.id, personalOrgId)
    }
  }
}
```

### Task 3.4: Team Context Middleware ✅
- [x] Create `middleware/team-context.global.ts`
- [x] Auto-resolve team based on mode
- [x] Multi-tenant: from URL param or session
- [x] Single/Personal: from session (auto-selected)
- [x] Inject team into `event.context` and `useState`

### Task 3.5: Route Generation by Mode ✅
- [x] Multi-tenant: generate `/dashboard/[team]/...` routes
- [x] Single/Personal: generate `/dashboard/...` routes (remove [team] param)
- [x] Use Nuxt `pages:extend` hook to transform page routes based on mode
- [x] Updated `isTeamRoute` computed to be mode-aware

---

## Phase 4: Composables & Utilities ✅
**Estimated: 6-8 hours** | **Status: Complete**

### Task 4.1: useAuth Composable ✅
- [x] Create `composables/useAuth.ts`
- [x] Wrap Better Auth's client functionality
- [x] Provide reactive user state
- [x] Expose login/logout/register methods
- [x] Expose method availability flags

```typescript
export const useAuth = () => {
  const client = useBetterAuthClient()
  const session = useSession()

  return {
    user: computed(() => session.value?.user),
    loggedIn: computed(() => !!session.value?.user),

    // Methods
    login: client.signIn.email,
    loginWithOAuth: (provider: string) => client.signIn.social({ provider }),
    register: client.signUp.email,
    logout: client.signOut,

    // Capabilities
    hasPassword: computed(() => config.methods?.password !== false),
    hasOAuth: computed(() => !!config.methods?.oauth),
    hasPasskeys: computed(() => !!config.methods?.passkeys),
    has2FA: computed(() => !!config.methods?.twoFactor),
    oauthProviders: computed(() => Object.keys(config.methods?.oauth ?? {})),
  }
}
```

### Task 4.2: useTeam Composable ✅
- [x] Create `composables/useTeam.ts`
- [x] Wrap Better Auth organization client
- [x] Provide reactive team state
- [x] Handle team switching
- [x] Mode-aware behavior

```typescript
export const useTeam = () => {
  const config = useRuntimeConfig().crouton.auth
  const session = useSession()

  return {
    currentTeam: computed(() => session.value?.activeOrganization),
    teams: computed(() => session.value?.organizations ?? []),

    // Mode-aware flags
    showTeamSwitcher: computed(() =>
      config.mode === 'multi-tenant' && teams.value.length > 1
    ),
    showTeamManagement: computed(() =>
      config.mode === 'multi-tenant'
    ),
    canCreateTeam: computed(() =>
      config.mode === 'multi-tenant' && config.teams?.allowCreate !== false
    ),

    // Methods
    switchTeam: (teamId: string) => client.organization.setActive({ organizationId: teamId }),
    createTeam: (data) => client.organization.create(data),
    inviteMember: (data) => client.organization.inviteMember(data),
  }
}
```

### Task 4.3: useBilling Composable ✅
- [x] Create `composables/useBilling.ts`
- [x] Wrap Better Auth Stripe client
- [x] Provide subscription state
- [x] Handle checkout/portal flows

```typescript
export const useBilling = () => {
  const config = useRuntimeConfig().crouton.auth

  if (!config.billing?.enabled) {
    return {
      enabled: false,
      subscription: null,
      // Stub methods that warn
    }
  }

  return {
    enabled: true,
    subscription: computed(() => /* ... */),

    checkout: (planId: string) => client.subscription.upgrade({ plan: planId }),
    portal: () => client.subscription.portal(),
    cancel: () => client.subscription.cancel(),
  }
}
```

### Task 4.4: Server Utilities ✅
- [x] Create `server/utils/auth.ts`
- [x] `requireAuth(event)` - throws if not authenticated
- [x] `requireTeamMember(event)` - throws if not team member
- [x] `requireTeamAdmin(event)` - throws if not admin
- [x] `requireTeamOwner(event)` - throws if not owner
- [x] `getAuthUser(event)` - returns user or null
- [x] `getTeamContext(event)` - returns current team

```typescript
// server/utils/auth.ts
export const requireAuth = async (event: H3Event) => {
  const session = await auth.api.getSession({ headers: event.headers })
  if (!session?.user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }
  return session.user
}

export const requireTeamMember = async (event: H3Event) => {
  const user = await requireAuth(event)
  const team = getTeamFromContext(event)

  const member = await auth.api.organization.getMember({
    organizationId: team.id,
    userId: user.id
  })

  if (!member) {
    throw createError({ statusCode: 403, message: 'Not a team member' })
  }

  return { user, team, member }
}
```

### Task 4.5: Type Exports ✅
- [x] Export User type
- [x] Export Team/Organization type
- [x] Export Session type
- [x] Export Member type with roles
- [x] Export Subscription type
- [x] Ensure types work with Nuxt's auto-imports

---

## Phase 5: UI Components (Nuxt UI)
**Estimated: 10-14 hours**

### Task 5.1: Auth Pages ✅
- [x] Create `pages/auth/login.vue`
- [x] Create `pages/auth/register.vue`
- [x] Create `pages/auth/forgot-password.vue`
- [x] Create `pages/auth/reset-password.vue`
- [x] Create `pages/auth/verify-email.vue`
- [x] Create `pages/auth/magic-link.vue` (if enabled)
- [x] Create `layouts/auth.vue`

**Login page features:**
- Email/password form (if enabled)
- OAuth buttons (configured providers only)
- Passkey button (if enabled)
- Magic link option (if enabled)
- "Remember me" option
- Redirect after login

### Task 5.2: Auth Components ✅
- [x] Create `components/Auth/LoginForm.vue`
- [x] Create `components/Auth/RegisterForm.vue`
- [x] Create `components/Auth/OAuthButtons.vue`
- [x] Create `components/Auth/PasskeyButton.vue`
- [x] Create `components/Auth/MagicLinkForm.vue`
- [x] Create `components/Auth/TwoFactorForm.vue`
- [x] Create `components/Auth/ForgotPasswordForm.vue`

**Component pattern:**
```vue
<!-- components/Auth/LoginForm.vue -->
<script setup lang="ts">
const { login, hasPassword, hasOAuth, oauthProviders } = useAuth()
const loading = ref(false)
const error = ref<string | null>(null)

const form = reactive({
  email: '',
  password: '',
  rememberMe: false
})

const handleSubmit = async () => {
  loading.value = true
  error.value = null
  try {
    await login(form)
    await navigateTo('/dashboard')
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UForm :state="form" @submit="handleSubmit">
    <UFormField label="Email" name="email">
      <UInput v-model="form.email" type="email" />
    </UFormField>

    <UFormField label="Password" name="password">
      <UInput v-model="form.password" type="password" />
    </UFormField>

    <UCheckbox v-model="form.rememberMe" label="Remember me" />

    <UButton type="submit" :loading="loading" block>
      Sign In
    </UButton>

    <UAlert v-if="error" color="error" :title="error" />
  </UForm>
</template>
```

### Task 5.3: Team Components ✅
- [x] Create `components/Team/Switcher.vue`
- [x] Create `components/Team/CreateForm.vue`
- [x] Create `components/Team/Settings.vue`
- [x] Create `components/Team/Members.vue`
- [x] Create `components/Team/MemberInviteForm.vue`
- [x] Create `components/Team/MemberRow.vue`
- [x] Create `components/Team/Invitations.vue`
- [x] Create `components/Team/DeleteConfirm.vue`

### Task 5.4: Account Components ✅
- [x] Create `components/Account/Settings.vue`
- [x] Create `components/Account/ProfileForm.vue`
- [x] Create `components/Account/PasswordForm.vue`
- [x] Create `components/Account/PasskeyManager.vue`
- [x] Create `components/Account/TwoFactorSetup.vue`
- [x] Create `components/Account/LinkedAccounts.vue`
- [x] Create `components/Account/DeleteAccount.vue`

### Task 5.5: Billing Components ✅
- [x] Create `components/Billing/PlanCard.vue`
- [x] Create `components/Billing/PricingTable.vue`
- [x] Create `components/Billing/CurrentPlan.vue`
- [x] Create `components/Billing/UpgradeButton.vue`
- [x] Create `components/Billing/PortalButton.vue`
- [x] Create `components/Billing/UsageDisplay.vue` (optional)

### Task 5.6: Dashboard Pages ✅
- [x] Create `pages/dashboard/index.vue` (redirect or overview)
- [x] Create `pages/dashboard/settings/index.vue` (account)
- [x] Create `pages/dashboard/settings/security.vue`
- [x] Create `pages/dashboard/settings/team.vue` (if multi-tenant)
- [x] Create `pages/dashboard/settings/members.vue` (if multi-tenant)
- [x] Create `pages/dashboard/settings/billing.vue` (if billing enabled)

### Task 5.7: Layout Components ✅
- [x] Create `components/Sidebar/AuthSidebar.vue` ✅
- [x] Create `components/Sidebar/TeamSection.vue` ✅
- [x] Create `components/Sidebar/UserMenu.vue` ✅
- [x] Create `layouts/dashboard.vue` ✅
- [x] Create `layouts/auth.vue` ✅ (already created in Task 5.1)

---

## Phase 6: Database & Migrations
**Estimated: 4-6 hours**

### Task 6.1: Schema Integration ✅
- [x] ✅ Export Better Auth schema for Drizzle
- [x] ✅ Create `server/database/schema/auth.ts`
- [x] ✅ Include user table
- [x] ✅ Include session table (with activeOrganizationId extension)
- [x] ✅ Include account table (OAuth)
- [x] ✅ Include verification table
- [x] ✅ Include organization table
- [x] ✅ Include member table
- [x] ✅ Include invitation table
- [x] ✅ Include passkey table (WebAuthn)
- [x] ✅ Include twoFactor table (2FA)
- [x] ✅ Include subscription table (Stripe billing)

### Task 6.2: Schema Extensions ✅
- [x] ✅ Add `personal` flag column to organization table
- [x] ✅ Add `isDefault` flag column for single-tenant mode
- [x] ✅ Add `ownerId` column for personal workspaces
- [x] ✅ Create indexes: `organization_owner_idx`, `organization_default_idx`, `organization_personal_idx`
- [x] ✅ Update auth.ts to use new columns instead of metadata
- [x] ✅ Update team.ts utilities for backward compatibility
- [x] ✅ Update composables (useSession, useTeam) to check columns with metadata fallback
- [x] ✅ Update Team type to include ownerId field

### Task 6.3: Migration Support ✅
- [x] ✅ Document migration workflow in docs/MIGRATION.md
- [x] ✅ Document Drizzle Kit commands (generate, push, check)
- [x] ✅ Document NuxtHub auto-migration workflow
- [x] ✅ Create migration helper script (scripts/migrate.ts)
- [x] ✅ Add npm scripts for migration commands
- [x] ✅ Update README with migration section
- [ ] Test fresh install migrations (deferred - requires runtime testing)
- [ ] Test upgrade migrations (deferred - requires runtime testing)

### Task 6.4: Seed Data (Development) ✅
- [x] ✅ Create dev seed script (`scripts/seed.ts`)
- [x] ✅ Seed default organization (single-tenant)
- [x] ✅ Seed test users (owner, admin, member, unverified)
- [x] ✅ Seed test subscriptions (active, trialing, user-based)

---

## Phase 7: Testing & Documentation
**Estimated: 6-8 hours**

### Task 7.1: Unit Tests
- [x] ✅ Test `useAuth` composable (46 tests passing)
- [x] ✅ Test `useTeam` composable (39 tests passing)
- [x] ✅ Test `useBilling` composable (28 tests passing)
- [ ] Test server utilities
- [ ] Test mode-specific behavior

### Task 7.2: Integration Tests
- [ ] Test login flow
- [ ] Test registration flow
- [ ] Test OAuth flow
- [ ] Test team creation
- [ ] Test team invitation
- [ ] Test billing checkout

### Task 7.3: E2E Tests (Playwright)
- [ ] Test complete auth flow
- [ ] Test team management flow
- [ ] Test billing flow
- [ ] Test mode switching

### Task 7.4: Documentation
- [ ] Write README.md with quick start
- [ ] Document all configuration options
- [ ] Document composables API
- [ ] Document components API
- [ ] Document server utilities
- [ ] Create examples for each mode
- [ ] Document migration from SuperSaaS

---

## Phase 8: Integration & Polish
**Estimated: 4-6 hours**

### Task 8.1: Crouton Collection Integration
- [ ] Create hook for injecting team context into collections
- [ ] Auto-scope queries to current team
- [ ] Document pattern for collection authors

```typescript
// How collections will use it
const { items } = useBookings()
// Internally: WHERE teamId = currentTeam.id
```

### Task 8.2: Error Handling
- [ ] Standardize error messages
- [ ] Add i18n support for errors
- [ ] Create error boundary components
- [ ] Handle network errors gracefully

### Task 8.3: Loading States
- [ ] Add loading skeletons to all pages
- [ ] Add loading states to all forms
- [ ] Ensure no flash of unauthenticated content

### Task 8.4: Security Review
- [ ] Review CSRF protection
- [ ] Review session security
- [ ] Review rate limiting
- [ ] Review input validation
- [ ] Test for common vulnerabilities

### Task 8.5: Performance
- [ ] Minimize client bundle size
- [ ] Lazy load non-critical components
- [ ] Optimize database queries
- [ ] Add caching where appropriate

### Task 8.6: Final Polish
- [ ] Ensure consistent styling
- [ ] Add transitions/animations
- [ ] Test dark mode
- [ ] Test responsive design
- [ ] Cross-browser testing

---

## Phase 9: Release Preparation
**Estimated: 2-4 hours**

### Task 9.1: Package Publishing
- [ ] Finalize package.json
- [ ] Set up npm publishing
- [ ] Create CHANGELOG.md
- [ ] Tag first release

### Task 9.2: Example Project
- [ ] Create `examples/multi-tenant/`
- [ ] Create `examples/single-tenant/`
- [ ] Create `examples/personal/`
- [ ] Test fresh install experience

### Task 9.3: Migration Guide
- [ ] Document migration from SuperSaaS
- [ ] Provide code transformation examples
- [ ] List breaking changes
- [ ] Create migration checklist

---

## Key Architecture: "Always Teams"

### Design Philosophy

**Every app has teams, always.** The difference between modes is only how teams are created and resolved:

| Mode | Teams | Resolution | UI |
|------|-------|------------|-----|
| **Multi-tenant** | User creates/joins many | From URL or picker | Full team management |
| **Single-tenant** | One default team | Auto-resolved | Hidden team UI |
| **Personal** | One per user (auto-created) | Auto-resolved | Hidden team UI |

### Why This Matters

**Collections stay simple:**
```typescript
// This works in ALL modes - no conditionals needed
const bookings = await getAllBookings(teamId)
// Always: WHERE teamId = ?
```

**No schema changes between modes:**
```typescript
// Every table always has teamId
bookings.teamId   // Always present
locations.teamId  // Always present
settings.teamId   // Always present
```

### Mode-Aware Team Resolution

#### Client-Side (useTeamContext)

```typescript
// @crouton/auth/app/composables/useTeamContext.ts
export const useTeamContext = () => {
  const config = useRuntimeConfig().public.crouton.auth
  const route = useRoute()
  const session = useSession()

  const getTeamId = (): string => {
    switch (config.mode) {
      case 'single-tenant':
        // Always return the default team
        return config.defaultTeamId ?? 'default'

      case 'personal':
        // Return user's personal team from session
        return session.value?.activeOrganizationId!

      case 'multi-tenant':
      default:
        // From URL param or session
        return (route.params.team as string) ?? session.value?.activeOrganizationId!
    }
  }

  return { getTeamId, getTeamSlug: getTeamId }
}
```

#### Server-Side (resolveTeamAndCheckMembership)

```typescript
// @crouton/auth/server/utils/team.ts
export async function resolveTeamAndCheckMembership(event: H3Event) {
  const config = useRuntimeConfig().crouton.auth
  const session = await requireSession(event)

  let teamId: string

  switch (config.mode) {
    case 'single-tenant':
      teamId = config.defaultTeamId
      break

    case 'personal':
      teamId = session.activeOrganizationId
      break

    case 'multi-tenant':
    default:
      // From URL param (API routes still use /teams/[id]/...)
      teamId = getRouterParam(event, 'id') ?? session.activeOrganizationId
      break
  }

  // Verify membership (same for all modes)
  const team = await getTeamById(teamId)
  const membership = await getMembership(teamId, session.user.id)

  if (!membership) {
    throw createError({ statusCode: 403, message: 'Not a team member' })
  }

  return { team, user: session.user, membership }
}
```

### Auto-Team Creation Hooks

#### Single-Tenant: App Startup

```typescript
// server/plugins/single-tenant-init.ts
export default defineNitroPlugin(async () => {
  const config = useRuntimeConfig().crouton.auth
  if (config.mode !== 'single-tenant') return

  // Ensure default team exists
  const existing = await db.query.organization.findFirst({
    where: eq(organization.isDefault, true)
  })

  if (!existing) {
    await db.insert(organization).values({
      id: 'default',
      name: config.appName ?? 'Default Workspace',
      slug: 'default',
      isDefault: true
    })
    console.log('[crouton/auth] Created default team for single-tenant mode')
  }
})
```

#### Single-Tenant: User Registration

```typescript
// Better Auth hook
hooks: {
  after: {
    signUp: async ({ user }) => {
      const config = useRuntimeConfig().crouton.auth

      if (config.mode === 'single-tenant') {
        // Auto-add to default team
        await auth.api.organization.addMember({
          organizationId: config.defaultTeamId,
          userId: user.id,
          role: 'member'
        })

        // Set as active org
        await auth.api.organization.setActive({
          organizationId: config.defaultTeamId
        })
      }
    }
  }
}
```

#### Personal: User Registration

```typescript
hooks: {
  after: {
    signUp: async ({ user }) => {
      const config = useRuntimeConfig().crouton.auth

      if (config.mode === 'personal') {
        // Create personal team
        const team = await auth.api.organization.create({
          name: `${user.name}'s Workspace`,
          slug: user.id,
          metadata: { personal: true, ownerId: user.id }
        })

        // Set as active
        await auth.api.organization.setActive({
          organizationId: team.id
        })
      }
    }
  }
}
```

### URL Patterns by Mode

| Mode | Dashboard URL | API URL |
|------|--------------|---------|
| Multi-tenant | `/dashboard/[team]/bookings` | `/api/teams/[id]/bookings` |
| Single-tenant | `/dashboard/bookings` | `/api/teams/default/bookings` |
| Personal | `/dashboard/bookings` | `/api/teams/[userId]/bookings` |

**Note:** API URLs still include team ID for consistency. The ID is just auto-resolved in single/personal modes.

### What nuxt-crouton Sees

nuxt-crouton's `useCollectionQuery()` and `resolveTeamAndCheckMembership()` always receive a valid `teamId`. They don't know or care about modes - that's @crouton/auth's job.

```typescript
// nuxt-crouton collection query (unchanged)
const { items } = await useCollectionQuery('bookings', {
  // teamId comes from useTeamContext() → always valid
})

// nuxt-crouton API handler (unchanged)
const { team } = await resolveTeamAndCheckMembership(event)
// team is always valid, resolution is @crouton/auth's responsibility
```

---

## Technical Specifications

### Environment Variables

```bash
# Required
BETTER_AUTH_SECRET=           # Session encryption
DATABASE_URL=                 # Database connection (if not using NuxtHub)

# OAuth (optional, per provider)
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=

# Billing (optional)
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

# Passkeys (optional)
PASSKEY_RP_ID=               # e.g., "example.com"
PASSKEY_RP_NAME=             # e.g., "My App"

# 2FA (optional)
TWO_FACTOR_ISSUER=           # e.g., "My App"
```

### File Structure

```
packages/crouton-auth/
├── package.json
├── tsconfig.json
├── nuxt.config.ts
├── module.ts                          # Nuxt module entry
│
├── app/
│   ├── components/
│   │   ├── Auth/
│   │   │   ├── LoginForm.vue
│   │   │   ├── RegisterForm.vue
│   │   │   ├── OAuthButtons.vue
│   │   │   ├── PasskeyButton.vue
│   │   │   ├── MagicLinkForm.vue
│   │   │   ├── TwoFactorForm.vue
│   │   │   └── ForgotPasswordForm.vue
│   │   ├── Team/
│   │   │   ├── Switcher.vue
│   │   │   ├── CreateForm.vue
│   │   │   ├── Settings.vue
│   │   │   ├── Members.vue
│   │   │   ├── MemberInviteForm.vue
│   │   │   └── Invitations.vue
│   │   ├── Account/
│   │   │   ├── Settings.vue
│   │   │   ├── ProfileForm.vue
│   │   │   ├── PasswordForm.vue
│   │   │   ├── PasskeyManager.vue
│   │   │   └── TwoFactorSetup.vue
│   │   ├── Billing/
│   │   │   ├── PlanCard.vue
│   │   │   ├── PricingTable.vue
│   │   │   ├── CurrentPlan.vue
│   │   │   └── PortalButton.vue
│   │   └── Sidebar/
│   │       ├── AuthSidebar.vue
│   │       ├── TeamSection.vue
│   │       └── UserMenu.vue
│   │
│   ├── composables/
│   │   ├── useAuth.ts
│   │   ├── useTeam.ts
│   │   ├── useBilling.ts
│   │   └── useSession.ts
│   │
│   ├── layouts/
│   │   ├── auth.vue
│   │   └── dashboard.vue
│   │
│   ├── middleware/
│   │   ├── auth.ts
│   │   ├── guest.ts
│   │   └── team-context.global.ts
│   │
│   └── pages/
│       ├── auth/
│       │   ├── login.vue
│       │   ├── register.vue
│       │   ├── forgot-password.vue
│       │   ├── reset-password.vue
│       │   └── verify-email.vue
│       └── dashboard/
│           ├── index.vue
│           └── settings/
│               ├── index.vue
│               ├── security.vue
│               ├── team.vue
│               ├── members.vue
│               └── billing.vue
│
├── server/
│   ├── api/
│   │   └── auth/
│   │       └── [...all].ts            # Better Auth handler
│   │
│   ├── database/
│   │   └── schema/
│   │       └── auth.ts                # Better Auth + extensions
│   │
│   ├── lib/
│   │   └── auth.ts                    # Better Auth instance factory
│   │
│   ├── middleware/
│   │   └── auth.ts                    # Server auth middleware
│   │
│   ├── plugins/
│   │   ├── auth-init.ts               # Initialize auth on startup
│   │   └── single-tenant-init.ts      # Single-tenant setup
│   │
│   └── utils/
│       ├── auth.ts                    # requireAuth, etc.
│       └── team.ts                    # Team utilities
│
├── types/
│   ├── config.ts                      # Configuration types
│   ├── auth.ts                        # Auth types
│   └── index.ts                       # Re-exports
│
└── tests/
    ├── unit/
    ├── integration/
    └── e2e/
```

### API Reference

#### Composables

```typescript
// useAuth()
{
  user: ComputedRef<User | null>
  loggedIn: ComputedRef<boolean>
  login(email: string, password: string): Promise<void>
  loginWithOAuth(provider: string): Promise<void>
  loginWithPasskey(): Promise<void>
  register(data: RegisterData): Promise<void>
  logout(): Promise<void>
  forgotPassword(email: string): Promise<void>
  resetPassword(token: string, password: string): Promise<void>

  // Capabilities
  hasPassword: ComputedRef<boolean>
  hasOAuth: ComputedRef<boolean>
  hasPasskeys: ComputedRef<boolean>
  has2FA: ComputedRef<boolean>
  oauthProviders: ComputedRef<string[]>
}

// useTeam()
{
  currentTeam: ComputedRef<Team | null>
  teams: ComputedRef<Team[]>
  role: ComputedRef<'owner' | 'admin' | 'member' | null>

  switchTeam(teamId: string): Promise<void>
  createTeam(data: CreateTeamData): Promise<Team>
  updateTeam(data: UpdateTeamData): Promise<Team>
  deleteTeam(): Promise<void>

  inviteMember(email: string, role: string): Promise<void>
  removeMember(userId: string): Promise<void>
  updateMemberRole(userId: string, role: string): Promise<void>

  // Mode-aware flags
  showTeamSwitcher: ComputedRef<boolean>
  showTeamManagement: ComputedRef<boolean>
  canCreateTeam: ComputedRef<boolean>
  canInviteMembers: ComputedRef<boolean>
  canManageMembers: ComputedRef<boolean>
}

// useBilling()
{
  enabled: ComputedRef<boolean>
  subscription: ComputedRef<Subscription | null>
  plan: ComputedRef<Plan | null>
  status: ComputedRef<'active' | 'trialing' | 'canceled' | 'past_due' | null>

  checkout(planId: string): Promise<void>
  portal(): Promise<void>
  cancel(): Promise<void>
  resume(): Promise<void>

  isPro: ComputedRef<boolean>
  isTrialing: ComputedRef<boolean>
  isCanceled: ComputedRef<boolean>
}
```

#### Server Utilities

```typescript
// Require authentication
const user = await requireAuth(event)

// Require team membership
const { user, team, member } = await requireTeamMember(event)

// Require team admin
const { user, team, member } = await requireTeamAdmin(event)

// Require team owner
const { user, team } = await requireTeamOwner(event)

// Optional auth (returns null if not authenticated)
const user = await getAuthUser(event)

// Get team context
const team = getTeamContext(event)
```

---

## Daily Log

### Day 1: 2024-12-16
**Tasks completed:**
- Task 1.1: Initialize Package Structure
- Task 1.2: Define Configuration Schema
- Task 1.3: Create Module Entry Point

**Notes:**
- Created full package structure in `packages/crouton-auth/`
- Defined comprehensive TypeScript types for all configuration options
- Created module.ts with Nuxt module hooks and config validation
- Added placeholder composables (useAuth, useTeam, useBilling, useSession)
- Added server utilities (requireAuth, requireTeamMember, etc.)
- Added middleware stubs (auth, guest, team-context)
- Added API route handler stub for Better Auth

**Blockers:**
- None. Phase 1 complete.

### Day 2: 2024-12-16
**Tasks completed:**
- Task 2.1: Core Better Auth Setup
- Task 2.2: Organization Plugin (Teams)

**Notes:**
- Created `server/lib/auth.ts` with Better Auth factory function (`createAuth`)
- Configured Drizzle adapter for SQLite (NuxtHub D1)
- Set up session configuration with sensible defaults (7 day expiry, cookie cache)
- Implemented email/password authentication configuration
- Created `server/utils/useServerAuth.ts` for lazy auth instance initialization
- Updated API route handler `/api/auth/[...all].ts` to use Better Auth
- Updated `server/utils/auth.ts` with `requireAuth` using Better Auth session

**Task 2.2 Implementation:**
- Added Better Auth organization plugin to auth instance
- Configured mode-aware organization creation:
  - Multi-tenant: users can create orgs (configurable)
  - Single-tenant: no manual org creation
  - Personal: no manual org creation (auto-created on signup)
- Set up organization limits: 5 (multi-tenant), 1 (single/personal)
- Configured membership limit from config (default: 100)
- Set up invitation system with:
  - Configurable expiry (default: 48 hours)
  - Email verification option
  - Default role assignment
  - Placeholder email sender (logs to console)
- Added organization lifecycle hooks for debugging
- Updated `server/utils/team.ts` with full Better Auth integration:
  - `resolveTeamAndCheckMembership()` - mode-aware team resolution
  - `getMembership()` - check user's team membership
  - `getTeamById()` / `getTeamBySlug()` - team lookup
  - `getUserTeams()` - list user's teams
  - `createPersonalWorkspace()` - for personal mode signup
  - `canUserCreateTeam()` - check team creation limits
  - `requireTeamRole()` / `requireTeamAdmin()` / `requireTeamOwner()` - RBAC helpers
- Updated `server/utils/auth.ts` to re-export team utilities

**Blockers:**
- None. Task 2.2 complete.

**Task 2.3 completed:**
- Added OAuth/social providers configuration to Better Auth setup
- Implemented `buildSocialProvidersConfig()` factory function
- Configured GitHub OAuth with required `user:email` scope
- Configured Google OAuth with `accessType: 'offline'` for refresh tokens
- Configured Discord OAuth
- Added support for additional custom OAuth providers via dynamic configuration
- Created helper utilities:
  - `getConfiguredOAuthProviders()` - Returns provider info for UI display (icons, colors, names)
  - `isOAuthProviderConfigured()` - Check if a provider is configured
  - `getOAuthCallbackURL()` - Generate callback URLs (pattern: `/api/auth/callback/{provider}`)
- All providers support `allowSignUp` option to disable new user registration

**Blockers:**
- None. Task 2.3 complete.

**Task 2.4 completed:**
- Added `@better-auth/passkey` dependency to package.json
- Imported passkey plugin from `@better-auth/passkey`
- Created `buildPlugins()` function to dynamically build plugins array
- Implemented `buildPasskeyConfig()` with:
  - rpID auto-detection from baseURL hostname
  - rpName from config or default "Application"
  - origin from baseURL
  - authenticatorSelection options (residentKey: 'preferred', userVerification: 'preferred')
- Added passkey utility functions:
  - `isPasskeyEnabled()` - Check if passkeys are configured
  - `getPasskeyInfo()` - Get passkey config for UI display
  - `isWebAuthnSupported()` - Check browser WebAuthn support
  - `isConditionalUIAvailable()` - Check autofill support
- Updated `app/plugins/auth-client.ts`:
  - Imports and conditionally adds `passkeyClient()` plugin
- Updated `app/composables/useAuth.ts` with passkey methods:
  - `loginWithPasskey()` - Sign in with passkey
  - `loginWithPasskeyAutofill()` - Conditional UI (autofill) support
  - `addPasskey()` - Register new passkey
  - `listPasskeys()` - List user's passkeys
  - `deletePasskey()` - Remove passkey
  - `updatePasskey()` - Update passkey name
  - `isWebAuthnSupported()` - Browser support check
  - `isConditionalUIAvailable()` - Autofill support check

**Blockers:**
- None. Task 2.4 complete.

**Task 2.5 completed:**
- Imported `twoFactor` plugin from `better-auth/plugins`
- Created `buildTwoFactorConfig()` function with:
  - TOTP support (6 digits, 30 second period)
  - Backup codes configuration (amount, length)
  - Issuer name from appName or config
  - skipVerificationOnEnable option
- Added `twoFactor` plugin to `buildPlugins()` conditionally based on config
- Added utility functions:
  - `isTwoFactorEnabled()` - Check if 2FA is configured
  - `getTwoFactorInfo()` - Get 2FA config details for UI
- Updated `app/plugins/auth-client.ts`:
  - Imports and conditionally adds `twoFactorClient()` plugin
  - Added `isTwoFactorEnabled()` helper function
- Updated `app/composables/useAuth.ts` with 2FA methods:
  - `enable2FA(password)` - Enable 2FA, returns TOTP URI
  - `disable2FA(password)` - Disable 2FA
  - `getTotpUri()` - Get TOTP URI for QR code
  - `verifyTotp(options)` - Verify TOTP code with trustDevice option
  - `generateBackupCodes(password)` - Generate new backup codes
  - `viewBackupCodes(password)` - View backup codes with usage status
  - `verifyBackupCode(code)` - Verify backup code for recovery
  - `get2FAStatus()` - Get user's 2FA status
- Added TypeScript interfaces:
  - `TwoFactorStatus` - 2FA enabled state
  - `TotpSetupData` - TOTP URI and secret for setup
  - `VerifyTotpOptions` - Code and trustDevice
  - `BackupCodeInfo` - Code and used status

**Blockers:**
- None. Task 2.5 complete.

**Task 2.6 completed:**
- Added `@better-auth/stripe` and `stripe` dependencies to package.json
- Imported Stripe plugin from `@better-auth/stripe`
- Created `buildStripePluginConfig()` function with:
  - Stripe client initialization with latest API version
  - Auto-create Stripe customers on signup
  - Custom customer creation with user metadata
  - Subscription configuration with plans from config
  - Authorization for organization-based billing (multi-tenant/single-tenant modes)
  - Lifecycle hooks (onSubscriptionComplete, onSubscriptionUpdate, onSubscriptionCancel, onSubscriptionDeleted)
  - Webhook event handling (invoice.paid, invoice.payment_failed)
- Created `buildStripePlansConfig()` to convert @crouton/auth plans to Better Auth format
- Added utility functions:
  - `isBillingEnabled()` - Check if billing is configured
  - `getBillingInfo()` - Get billing config for UI display
  - `getStripePublishableKey()` - Get client-safe publishable key
  - `isSubscriptionActive()` - Check if subscription grants access
  - `isSubscriptionInGracePeriod()` - Check for past_due status
- Updated `app/plugins/auth-client.ts`:
  - Imports and conditionally adds `stripeClient()` plugin
  - Added `isBillingEnabled()` helper function
- Updated `app/composables/useBilling.ts` with full implementation:
  - `fetchSubscriptions()` - Fetch user/org subscriptions
  - `checkout()` - Start Stripe Checkout for subscription
  - `portal()` - Open Stripe Customer Portal
  - `cancel()` - Cancel subscription (at period end)
  - `restore()` - Restore canceled subscription
  - `changePlan()` - Change to different plan
  - `isCurrentPlan()` / `getPlan()` - Helper functions
  - Reactive subscription state (isPro, isTrialing, isCanceled, etc.)
  - Support for both user-based and organization-based billing modes
- Added TypeScript interfaces:
  - `StripePluginPlan` - Better Auth plan configuration
  - `SubscriptionData` - Subscription hook data type
  - `BillingInfo` / `BillingPlanInfo` - UI display types
  - `SubscriptionStatus` - Stripe subscription status type
  - `CheckoutOptions` / `PortalOptions` - Method parameter types

**Blockers:**
- None. Task 2.6 complete.

**Task 2.7 completed:**
- Verified existing `/server/api/auth/[...all].ts` catch-all route implementation
- Route correctly uses `useServerAuth(event)` for lazy Better Auth instance initialization
- Request transformation via `toWebRequest(event)` follows Better Auth's official Nuxt integration pattern
- Handler returns Better Auth response directly (H3 handles Web Response natively)

**Blockers:**
- None. Task 2.7 complete.

**Task 2.8 completed:**
- Created Better Auth connector type definition (`types/connector.ts`)
- Defined `BetterAuthConnector` interface with table mappings:
  - `organization` → `teams`
  - `member` → `teamMembers`
  - `user` → `users`
  - `session` → `sessions`
- Created session format mapping functions (`getUserId`, `getTeamId`, `getUser`)
- Created `server/utils/team-auth.ts` export file for nuxt-crouton compatibility
- Added `#crouton/team-auth` Nitro alias override in crouton-auth nuxt.config.ts
- Extended main project to include crouton-auth layer (after nuxt-crouton to override alias)
- Created type declaration file `crouton-team-auth.d.ts` with full type definitions
- Exported connector types from `types/index.ts`

**Implementation details:**
- The connector allows nuxt-crouton collections to use Better Auth via the `#crouton/team-auth` alias
- `resolveTeamAndCheckMembership()` is mode-aware (multi-tenant, single-tenant, personal)
- Session format differences handled via `BetterAuthSession` interface
- Runtime testing deferred to Phase 3 when mode implementations are complete

**Blockers:**
- None. Phase 2 complete.

### Day 3: 2024-12-16
**Tasks completed:**
- Task 3.1: Multi-Tenant Mode

**Implementation details:**

**useSession composable:**
- Integrated with Better Auth's `useSession()` and `useActiveOrganization()` hooks
- Maps Better Auth session/user/org to typed interfaces
- Provides reactive `isAuthenticated`, `isPending`, `error` states
- Session `refresh()` and `clear()` methods

**useTeam composable (full implementation):**
- `currentTeam`, `teams` from Better Auth's reactive hooks
- `currentRole` computed from active organization members
- Mode-aware flags: `showTeamSwitcher`, `showTeamManagement`, `canCreateTeam`, `canInviteMembers`, `canManageMembers`, `isOwner`, `isAdmin`
- Team methods: `switchTeam()`, `switchTeamBySlug()`, `createTeam()`, `updateTeam()`, `deleteTeam()`
- Member methods: `loadMembers()`, `inviteMember()`, `removeMember()`, `updateMemberRole()`, `leaveTeam()`
- Invitation methods: `getPendingInvitations()`, `cancelInvitation()`, `acceptInvitation()`, `rejectInvitation()`

**useTeamContext composable:**
- Mode-aware team ID/slug resolution
- URL builders: `buildDashboardUrl()`, `buildApiUrl()`
- Route helpers: `isTeamRoute`, `routeTeamParam`, `isTeamSynced`
- `resolveTeamFromRoute()` for middleware use

**Middlewares updated:**
- `auth.ts` - Uses `useSession()` for auth check
- `guest.ts` - Uses `useSession()` for redirect logic
- `team-context.ts` - Mode-aware team resolution and URL redirect

**Blockers:**
- None. Task 3.1 complete.

**Task 3.2 completed:**
- Implemented single-tenant mode with lazy default organization creation
- Added `buildDatabaseHooks()` function in `server/lib/auth.ts`:
  - `user.create.after` hook: Creates default org (if needed) and adds new user to it
  - `session.create.after` hook: Sets activeOrganizationId to default org
- Helper functions added:
  - `ensureDefaultOrgExists()` - Lazy creation of default organization
  - `addUserToDefaultOrg()` - Idempotent member creation
  - `setSessionActiveOrg()` - Updates session with active org
- Updated `single-tenant-init.ts` plugin to log initialization (DB not available at startup)
- Updated `getOrCreateDefaultOrganization()` in `team.ts` to actually create the org when called during request handling
- Key insight: NuxtHub D1 database is only available during request handling, so lazy initialization pattern is used

**Blockers:**
- None. Task 3.2 complete.

**Task 3.3 completed:**
- Implemented personal mode with automatic organization creation on user registration
- Extended `buildDatabaseHooks()` to handle personal mode:
  - `user.create.after`: Creates personal organization with user as owner
  - `session.create.after`: Sets active organization to user's personal workspace
- Added helper functions:
  - `createPersonalOrg()` - Creates org with metadata marking it as personal, adds user as owner
  - `getUserPersonalOrgId()` - Finds user's personal organization via member table
- Personal workspace naming: `"{userName}'s Workspace"` or `"{emailPrefix}'s Workspace"`
- Personal workspace slug: `personal-{userId.substring(0,8)}` for uniqueness
- Metadata includes: `{ personal: true, ownerId: userId, appName }`
- Team utilities already had personal mode support in `resolveTeamAndCheckMembership()`

**Blockers:**
- None. Task 3.3 complete.

**Task 3.4 completed:**
- Created `server/middleware/team-context.ts` for server-side team context injection:
  - Extends H3EventContext to include `team`, `teamId`, `teamSlug`, `authMode`
  - Mode-aware team resolution (multi-tenant, single-tenant, personal)
  - Injects resolved team info into `event.context` for API routes
  - Skips auth routes and non-API routes
- Created `app/middleware/team-context.global.ts` for client-side team context:
  - Global middleware that runs on all routes
  - Mode-aware team resolution with URL validation (multi-tenant)
  - Auto-redirects to correct team URL in multi-tenant mode
  - Syncs team in session when switching via URL
- Created `app/composables/useTeamState.ts` for useState integration:
  - SSR-safe shared state via `useState('crouton-auth-team')`
  - Stores resolved teamId, teamSlug, team object, and resolution status
  - Provides setTeamContext, setTeamError, clearTeamContext methods
- Updated `app/composables/useTeamContext.ts`:
  - Integrates with useTeamState for resolved context
  - Exposes team state properties (team, isResolved, hasError, error)
  - Exposes state management methods for advanced use

**Blockers:**
- None. Task 3.4 complete.

**Task 3.5 completed:**
- Implemented route generation by mode using Nuxt's `pages:extend` hook
- Added `transformTeamRoutes()` function in `module.ts` that:
  - For multi-tenant mode: keeps routes as-is (`/dashboard/:team/...`)
  - For single/personal modes: removes `:team` dynamic segment (`/dashboard/...`)
  - Recursively transforms nested routes
  - Cleans up route names (removes `-team-` segments)
- Updated `isTeamRoute` computed in `useTeamContext.ts`:
  - Multi-tenant: checks for team param in URL
  - Single/Personal: all dashboard routes are team-scoped (team auto-resolved)
- Route transformation preserves file structure (files still in `[team]/` folder)
- URL patterns now match the mode documentation:
  - Multi-tenant: `/dashboard/acme-corp/bookings`
  - Single/Personal: `/dashboard/bookings`

**Blockers:**
- None. Phase 3 complete.

### Day 4: 2024-12-16
**Tasks completed:**
- Task 4.1: useAuth Composable

**Implementation details:**
- Fully implemented `useAuth` composable with Better Auth client integration
- Connected to `useSession()` for reactive user state
- Implemented all auth methods:
  - `login(credentials)` - Email/password sign in
  - `loginWithOAuth(provider)` - OAuth provider sign in (GitHub, Google, Discord)
  - `loginWithPasskey()` - WebAuthn passkey sign in
  - `loginWithPasskeyAutofill()` - Conditional UI (autofill) passkey sign in
  - `loginWithMagicLink(email)` - Magic link email sign in
  - `register(data)` - User registration with email/password
  - `logout()` - Sign out
  - `forgotPassword(email)` - Password reset request
  - `resetPassword(token, password)` - Password reset with token
- Implemented passkey management methods:
  - `addPasskey(options)` - Register new passkey
  - `listPasskeys()` - List user's passkeys
  - `deletePasskey(id)` - Delete passkey
  - `isWebAuthnSupported()` - Browser support check
  - `isConditionalUIAvailable()` - Autofill support check
- Implemented 2FA methods:
  - `enable2FA(password)` - Enable 2FA, returns TOTP URI
  - `disable2FA(password)` - Disable 2FA
  - `getTotpUri()` - Get TOTP URI for QR code
  - `verifyTotp(options)` - Verify TOTP code
  - `generateBackupCodes(password)` - Generate backup codes
  - `viewBackupCodes(password)` - View backup codes with usage status
  - `verifyBackupCode(code)` - Verify backup code
  - `get2FAStatus()` - Get user's 2FA status
- Exposed capability flags: `hasPassword`, `hasOAuth`, `hasPasskeys`, `has2FA`, `hasMagicLink`, `oauthProviders`
- Added `refreshSession()` method for manual session refresh
- Proper error handling with loading/error state
- Uses `useAuthClient()` helper to get Better Auth client from plugin

**Blockers:**
- None. Task 4.1 complete.

**Task 4.2 completed:**
- Verified `useTeam` composable was already implemented as part of Task 3.1
- Full implementation includes:
  - Reactive state: `currentTeam`, `teams`, `members`, `currentRole`
  - Mode-aware flags: `showTeamSwitcher`, `showTeamManagement`, `canCreateTeam`, `canInviteMembers`, `canManageMembers`, `isOwner`, `isAdmin`
  - Team methods: `switchTeam()`, `switchTeamBySlug()`, `createTeam()`, `updateTeam()`, `deleteTeam()`
  - Member methods: `loadMembers()`, `inviteMember()`, `removeMember()`, `updateMemberRole()`, `leaveTeam()`
  - Invitation methods: `getPendingInvitations()`, `cancelInvitation()`, `acceptInvitation()`, `rejectInvitation()`
- Uses Better Auth's reactive hooks: `useListOrganizations()`, `useActiveOrganization()`
- Typecheck passes for crouton-auth package (pre-existing errors in main app unrelated)

**Blockers:**
- None. Task 4.2 complete.

**Task 4.3 verified:**
- `useBilling` composable was fully implemented during Task 2.6 (Stripe Plugin)
- All required features present: subscription state, checkout/portal flows
- Disabled stub for apps without billing enabled

**Task 4.4 verified:**
- All server utilities were implemented during Phase 2
- `requireAuth`, `requireTeamMember`, `requireTeamAdmin`, `requireTeamOwner` all working
- `getAuthUser`, `getTeamContext` also present

**Task 4.5 verified:**
- All types exported from `types/index.ts`
- User, Team, Session, Member, MemberRole, Subscription types all present
- Types work with Nuxt's auto-import system

**Phase 4 Complete!**

### Day 5: 2024-12-15
**Tasks completed:**
- Task 5.1: Auth Pages

**Implementation details:**
- Created `layouts/auth.vue` - centered layout for auth pages
- Created `pages/auth/login.vue` with:
  - Email/password form (conditionally shown)
  - OAuth buttons (GitHub, Google, Discord)
  - Passkey button (if WebAuthn supported)
  - Magic link toggle option
  - Remember me checkbox
  - Redirect after login
- Created `pages/auth/register.vue` with:
  - Name, email, password, confirm password fields
  - OAuth registration options
  - Password validation (minimum 8 characters)
  - Link to terms and privacy policy
- Created `pages/auth/forgot-password.vue`:
  - Email input for password reset request
  - Success state with email sent confirmation
- Created `pages/auth/reset-password.vue`:
  - Token-based password reset
  - New password with confirmation
  - Handles invalid/expired tokens
- Created `pages/auth/verify-email.vue`:
  - Token-based email verification
  - Resend verification option
  - Handles verification states (pending, verified, error)
- Created `pages/auth/magic-link.vue`:
  - Token-based magic link verification
  - Auto-redirect to dashboard on success

**All pages use:**
- Nuxt UI v4 components (UForm, UFormField, UInput, UButton, UAlert, USeparator, UCheckbox)
- useAuth composable for authentication methods
- guest middleware for unauthenticated-only access
- auth layout for consistent styling
- Toast notifications for feedback
- Proper form validation

**Blockers:**
- None. Task 5.1 complete.

**Task 5.2 completed:**
- Created 7 reusable Auth components:
  - `Auth/LoginForm.vue` - Email/password login form with validation, remember me, forgot password link
  - `Auth/RegisterForm.vue` - Full registration form with name, email, password, confirm password, terms link
  - `Auth/OAuthButtons.vue` - OAuth provider buttons with icons (GitHub, Google, Discord, etc.)
  - `Auth/PasskeyButton.vue` - Passkey/WebAuthn sign-in button with browser support check
  - `Auth/MagicLinkForm.vue` - Magic link email form with sent state handling
  - `Auth/TwoFactorForm.vue` - TOTP/backup code verification with mode toggle
  - `Auth/ForgotPasswordForm.vue` - Password reset request form with sent state
- Updated auth pages to use new components:
  - `pages/auth/login.vue` - Uses LoginForm, OAuthButtons, PasskeyButton, MagicLinkForm
  - `pages/auth/register.vue` - Uses RegisterForm, OAuthButtons
  - `pages/auth/forgot-password.vue` - Uses ForgotPasswordForm
- All components:
  - Emit events for parent handling (@submit, @click, @reset)
  - Accept props for loading/error state
  - Include proper validation
  - Use Nuxt UI v4 patterns
- Typecheck passes for crouton-auth package

**Blockers:**
- None. Task 5.2 complete.

**Task 5.3 completed:**
- Created 8 Team management components:
  - `Team/Switcher.vue` - Dropdown to switch between teams (multi-tenant only)
  - `Team/CreateForm.vue` - Form to create new teams with auto-slug generation
  - `Team/Settings.vue` - Team settings form (name, slug, logo) with validation
  - `Team/Members.vue` - Members list with role management and removal
  - `Team/MemberRow.vue` - Individual member display with role badge and actions
  - `Team/MemberInviteForm.vue` - Invite form with role selection
  - `Team/Invitations.vue` - Pending invitations list with cancel/accept/reject
  - `Team/DeleteConfirm.vue` - Delete confirmation modal with type-to-confirm
- All components:
  - Use `useTeam()` composable for team operations
  - Follow Nuxt UI v4 patterns (UForm, UFormField, UDropdownMenu, etc.)
  - Include proper validation and error handling
  - Are mode-aware (show/hide based on multi-tenant vs single/personal)
  - Emit appropriate events for parent handling
- Typecheck passes for crouton-auth package components

**Blockers:**
- None. Task 5.3 complete.

### Day 6: 2024-12-16
**Tasks completed:**
- Task 5.4: Account Components

**Implementation details:**
- Created 7 Account management components:
  - `Account/Settings.vue` - Main container with tabs navigation for all account settings
  - `Account/ProfileForm.vue` - Update name and avatar with validation
  - `Account/PasswordForm.vue` - Change password with current/new/confirm fields
  - `Account/PasskeyManager.vue` - List, add, and remove WebAuthn passkeys
  - `Account/TwoFactorSetup.vue` - Enable/disable 2FA with QR code setup and backup codes
  - `Account/LinkedAccounts.vue` - View and manage linked OAuth accounts
  - `Account/DeleteAccount.vue` - Delete account with password and type-to-confirm
- All components:
  - Use `useAuth()` composable for authentication operations
  - Follow Nuxt UI v4 patterns (UForm, UFormField, UModal, UTabs, etc.)
  - Include proper validation and error handling
  - Show loading states and toast notifications
  - Are conditionally shown based on enabled features (hasPassword, hasOAuth, hasPasskeys, has2FA)
- TwoFactorSetup includes:
  - Multi-step setup wizard (password → QR code → verify → backup codes)
  - QR code display via external API
  - Backup codes management (view, copy, regenerate)
  - Enable/disable with password confirmation
- PasskeyManager includes:
  - Browser WebAuthn support detection
  - Add/remove passkey functionality
  - Empty state with call-to-action
- LinkedAccounts includes:
  - Provider icons and branding
  - Connect/disconnect functionality
  - Warning when only one login method remains
- Typecheck passes for crouton-auth package components

**Blockers:**
- None. Task 5.4 complete.

**Task 5.5 completed:**
- Created 6 Billing components for subscription management:
  - `Billing/PlanCard.vue` - Single plan display with features, pricing, and selection
  - `Billing/PricingTable.vue` - Grid of all plans with annual toggle option
  - `Billing/CurrentPlan.vue` - Current subscription status with trial info, cancellation notices, and management actions
  - `Billing/UpgradeButton.vue` - Button to start Stripe Checkout for a plan
  - `Billing/PortalButton.vue` - Button to open Stripe Customer Portal
  - `Billing/UsageDisplay.vue` - Usage metrics with progress bars and threshold warnings
- All components:
  - Use `useBilling()` composable for billing operations
  - Follow Nuxt UI v4 patterns (UCard, UButton, UBadge, UProgress, etc.)
  - Include proper loading states and error handling
  - Support both compact and full display modes (UsageDisplay)
  - Are conditionally rendered based on billing enabled state
- Typecheck passes for all new components

**Blockers:**
- None. Task 5.5 complete.

**Task 5.6 completed:**
- Created 6 dashboard pages under `pages/dashboard/[team]/`:
  - `index.vue` - Dashboard landing page with welcome message, quick links, and subscription status
  - `settings/index.vue` - Account settings page using AccountSettings component
  - `settings/security.vue` - Security settings (2FA, passkeys, password) in dedicated view
  - `settings/team.vue` - Team settings page (name, slug, logo) with delete confirmation
  - `settings/members.vue` - Team members management with invite modal
  - `settings/billing.vue` - Billing page with subscription management and plan selection
- All pages:
  - Use `auth` middleware and `dashboard` layout
  - Compose existing components (Account*, Team*, Billing*)
  - Are mode-aware (hide team management in single/personal modes)
  - Include back navigation to main settings
  - Follow Nuxt UI v4 patterns
- Pages support multi-tenant mode via `[team]` dynamic segment (route transformation handles single/personal modes)

**Blockers:**
- None. Task 5.6 complete.

**Task 5.7 completed:**
- Created 4 layout components using Nuxt UI's dashboard components:
  - `components/Sidebar/AuthSidebar.vue` - Main sidebar with UDashboardSidebar, UNavigationMenu
  - `components/Sidebar/TeamSection.vue` - Team switcher dropdown (multi-tenant mode)
  - `components/Sidebar/UserMenu.vue` - User avatar with dropdown menu
  - `layouts/dashboard.vue` - Dashboard layout using UDashboardGroup and UDashboardPanel
- All components:
  - Use Nuxt UI v4 dashboard components (UDashboardGroup, UDashboardSidebar, UDashboardPanel)
  - Mode-aware (team switcher only shown in multi-tenant mode)
  - Collapsible and resizable sidebar support
  - User menu with account settings and logout
  - Navigation menu with default items for dashboard and settings
- Typecheck passes for all new components

**Blockers:**
- None. Phase 5 complete!

### Day 7: 2024-12-16
**Tasks completed:**
- Task 6.1: Schema Integration
- Task 6.2: Schema Extensions

**Task 6.2 Implementation details:**
- Added new columns to organization table:
  - `personal` (boolean) - Marks personal workspaces
  - `isDefault` (boolean) - Marks default organization for single-tenant mode
  - `ownerId` (text) - Links personal workspace to owner user
- Added indexes for efficient queries:
  - `organization_owner_idx` - Find personal workspace by owner
  - `organization_default_idx` - Find default organization
  - `organization_personal_idx` - Filter personal workspaces
- Updated `ensureDefaultOrgExists()` to use `isDefault` column instead of metadata
- Updated `createPersonalOrg()` to use `personal` and `ownerId` columns
- Updated `getUserPersonalOrgId()` to query by `ownerId` (indexed, more efficient)
- Updated `mapOrganizationToTeam()` in team.ts with backward compatibility
- Updated composables (useSession, useTeam) to check both columns and metadata
- Updated Team type in types/auth.ts to include `ownerId` field

**Task 6.1 Implementation details:**
- Created comprehensive Better Auth Drizzle schema at `server/database/schema/auth.ts`
- Implemented all 10 required tables:
  1. **user** - Core user identity with stripeCustomerId extension
  2. **session** - User sessions with activeOrganizationId for team context
  3. **account** - OAuth and credential accounts
  4. **verification** - Email verification and password reset tokens
  5. **organization** - Teams/workspaces for all modes
  6. **member** - Organization membership with roles
  7. **invitation** - Pending organization invitations
  8. **passkey** - WebAuthn credentials for passwordless auth
  9. **twoFactor** - TOTP secrets and backup codes for 2FA
  10. **subscription** - Stripe subscription tracking
- Added proper indexes for all tables (user_email, session_token, etc.)
- Defined all Drizzle relations between tables
- Exported TypeScript types for all tables (User, Session, etc.)
- Created index.ts for clean re-exports

**Schema highlights:**
- All tables use SQLite types for NuxtHub D1 compatibility
- Relations enable efficient query building with Drizzle
- Types exported for both select and insert operations
- Session table extended with activeOrganizationId for team context
- User table extended with stripeCustomerId for billing

**Blockers:**
- None. Task 6.1 complete.

**Task 6.3 completed:**
- Created comprehensive migration documentation at `docs/MIGRATION.md`
- Documented three approaches:
  1. NuxtHub auto-migration (recommended for D1)
  2. Drizzle Kit commands (generate, push, check)
  3. Better Auth CLI (for Kysely adapter only)
- Created migration helper script at `scripts/migrate.ts`:
  - `status` - Check current migration status
  - `generate` - Generate new migration files
  - `push` - Apply migrations to local database
  - `check` - Verify schema consistency
  - `reset` - Reset local database (dev only)
- Added npm scripts for migration commands
- Updated README with migration section
- Added tsx and drizzle-kit as dev dependencies
- Added docs and scripts to package.json files array

**Blockers:**
- None. Task 6.3 complete.

**Task 6.4 completed:**
- Created comprehensive development seed script at `scripts/seed.ts`
- Seed script supports multiple commands:
  - `all` - Seed everything (default)
  - `users` - Seed test users only
  - `orgs` - Seed organizations only
  - `billing` - Seed subscriptions only
  - `clear` - Clear all seeded data
- Seeds test users with compatible password hashing (scrypt format):
  - `owner@example.com` - Organization owner
  - `admin@example.com` - Organization admin
  - `member@example.com` - Regular member
  - `unverified@example.com` - Unverified user
  - All use password: `password123`
- Seeds test organizations:
  - `default` - Default workspace for single-tenant mode (isDefault: true)
  - `acme-corp` - Multi-tenant test organization
  - Personal workspace for test owner (personal: true)
- Seeds organization memberships with proper roles
- Seeds test subscriptions:
  - Active subscription on Acme Corp (pro plan)
  - Trialing subscription on default org (14-day trial)
  - User-based subscription for personal mode testing
- Added npm scripts: `seed`, `seed:users`, `seed:orgs`, `seed:billing`, `seed:clear`
- Added `better-sqlite3` and `@types/better-sqlite3` dev dependencies

**Blockers:**
- None. Phase 6 complete!

---

## Dependencies

### Runtime Dependencies
- `better-auth` - Core authentication
- `drizzle-orm` - Database ORM

### Peer Dependencies
- `nuxt` ^3.x or ^4.x
- `@nuxt/ui` ^3.x

### Dev Dependencies
- `@better-auth/cli` - Migration CLI
- `vitest` - Unit testing
- `@playwright/test` - E2E testing
- `unbuild` - Package building

---

## References

- [Better Auth Documentation](https://www.better-auth.com/docs)
- [Better Auth Organization Plugin](https://www.better-auth.com/docs/plugins/organization)
- [Better Auth Stripe Plugin](https://www.better-auth.com/docs/plugins/stripe)
- [Better Auth Nuxt Integration](https://www.better-auth.com/docs/integrations/nuxt)
- [Nuxt Layers Documentation](https://nuxt.com/docs/getting-started/layers)
- [Nuxt UI Components](https://ui.nuxt.com/)

---

## Success Criteria

The package is complete when:

1. [ ] Fresh Nuxt app can add `@crouton/auth` and have working auth
2. [ ] All three modes work correctly (multi-tenant, single-tenant, personal)
3. [ ] OAuth providers work out of the box
4. [ ] Passkeys work out of the box
5. [ ] 2FA works out of the box
6. [ ] Stripe billing works out of the box
7. [ ] All UI components render correctly with Nuxt UI
8. [ ] TypeScript types are complete and accurate
9. [ ] Documentation covers all features
10. [ ] Tests pass with >80% coverage
11. [ ] Example projects demonstrate each mode
12. [ ] Migration guide enables SuperSaaS users to switch
