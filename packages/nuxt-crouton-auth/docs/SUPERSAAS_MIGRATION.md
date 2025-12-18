# Migrating from SuperSaaS to @crouton/auth

This guide helps you migrate from SuperSaaS (or similar auth solutions) to @crouton/auth.

## Overview

@crouton/auth replaces SuperSaaS with a Better Auth-based solution that offers:
- Modern authentication (passkeys, 2FA, magic links)
- Built-in organization/team support
- Stripe billing integration
- Three operational modes (multi-tenant, single-tenant, personal)

## Migration Checklist

### Pre-Migration

- [ ] Backup existing database
- [ ] Export user data (emails, hashed passwords)
- [ ] Export team/organization data
- [ ] Export subscription data (if using billing)
- [ ] Document current OAuth configurations
- [ ] Review custom auth logic for porting

### Installation

- [ ] Install `@crouton/auth` package
- [ ] Add to `nuxt.config.ts` extends
- [ ] Configure environment variables
- [ ] Export auth schema
- [ ] Generate and apply migrations
- [ ] Run test suite

### Code Migration

- [ ] Update composable imports
- [ ] Update component usage
- [ ] Update API route handlers
- [ ] Update middleware
- [ ] Test all auth flows

### Data Migration

- [ ] Migrate user records
- [ ] Migrate team/organization records
- [ ] Migrate memberships
- [ ] Migrate subscriptions
- [ ] Verify data integrity

---

## Breaking Changes

### Composables

| SuperSaaS | @crouton/auth | Notes |
|-----------|---------------|-------|
| `useUser()` | `useAuth()` | Returns `{ user, ... }` |
| `useTeams()` | `useTeam()` | Singular, more features |
| `useSubscription()` | `useBilling()` | More comprehensive |
| `useSession()` | `useSession()` | Similar API |

### Components

| SuperSaaS | @crouton/auth | Notes |
|-----------|---------------|-------|
| `<AuthLogin />` | `<AuthLoginForm />` | More customizable |
| `<AuthRegister />` | `<AuthRegisterForm />` | More customizable |
| `<TeamSwitcher />` | `<TeamSwitcher />` | Same name |
| `<BillingPlans />` | `<BillingPricingTable />` | Enhanced features |

### API Routes

| SuperSaaS | @crouton/auth | Notes |
|-----------|---------------|-------|
| `/api/auth/*` | `/api/auth/[...all]` | Better Auth catch-all |
| `/api/teams/*` | Server utilities | Use `resolveTeamAndCheckMembership()` |
| `/api/billing/*` | `/api/auth/[...all]` | Handled by Stripe plugin |

### Database Tables

| SuperSaaS | @crouton/auth | Notes |
|-----------|---------------|-------|
| `users` | `user` | Singular naming |
| `teams` | `organization` | Better Auth naming |
| `team_members` | `member` | Better Auth naming |
| `sessions` | `session` | Singular naming |
| `subscriptions` | `subscription` | Singular naming |

---

## Code Transformation Examples

### Configuration Migration

**SuperSaaS:**
```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@supersaas/nuxt'],

  supersaas: {
    providers: ['email', 'github', 'google'],
    teams: true,
    billing: {
      stripe: true
    }
  }
})
```

**@crouton/auth:**
```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  extends: ['@crouton/auth'],

  croutonAuth: {
    mode: 'multi-tenant',
    methods: {
      password: true,
      oauth: {
        github: {
          clientId: process.env.GITHUB_CLIENT_ID!,
          clientSecret: process.env.GITHUB_CLIENT_SECRET!
        },
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!
        }
      }
    },
    billing: {
      enabled: true,
      stripe: {
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY!,
        secretKey: process.env.STRIPE_SECRET_KEY!,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
        plans: [/* ... */]
      }
    }
  }
})
```

### Composable Migration

**SuperSaaS:**
```vue
<script setup lang="ts">
const { user, signIn, signOut } = useUser()
const { teams, currentTeam, switchTeam } = useTeams()
const { subscription, subscribe } = useSubscription()

const isLoggedIn = computed(() => !!user.value)

async function login(email: string, password: string) {
  await signIn({ email, password })
}
</script>
```

**@crouton/auth:**
```vue
<script setup lang="ts">
const { user, loggedIn, login, logout } = useAuth()
const { teams, currentTeam, switchTeam } = useTeam()
const { subscription, checkout, portal } = useBilling()

async function handleLogin(email: string, password: string) {
  await login({ email, password })
}
</script>
```

### Component Migration

**SuperSaaS:**
```vue
<template>
  <div>
    <!-- Login form -->
    <AuthLogin @success="onLogin" />

    <!-- Team switcher -->
    <TeamSwitcher v-if="teams.length > 1" />

    <!-- Billing -->
    <BillingPlans :plans="plans" @select="onSelectPlan" />
  </div>
</template>
```

**@crouton/auth:**
```vue
<template>
  <div>
    <!-- Login form -->
    <AuthLoginForm @submit="handleLogin" />

    <!-- Team switcher (mode-aware, auto-hides in single/personal) -->
    <TeamSwitcher v-if="showTeamSwitcher" />

    <!-- Billing -->
    <BillingPricingTable @select="handlePlanSelect" />
  </div>
</template>

<script setup lang="ts">
const { showTeamSwitcher } = useTeam()

async function handleLogin(credentials: { email: string; password: string }) {
  const { login } = useAuth()
  await login(credentials)
}

async function handlePlanSelect(planId: string) {
  const { checkout } = useBilling()
  await checkout(planId)
}
</script>
```

### Server-Side Migration

**SuperSaaS:**
```typescript
// server/api/projects.get.ts
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const team = await getTeamFromContext(event)

  if (!team) {
    throw createError({ statusCode: 400, message: 'Team required' })
  }

  const projects = await db.query.projects.findMany({
    where: eq(schema.projects.teamId, team.id)
  })

  return projects
})
```

**@crouton/auth:**
```typescript
// server/api/projects.get.ts
import { resolveTeamAndCheckMembership } from '#crouton/team-auth'

export default defineEventHandler(async (event) => {
  // Handles auth check + team resolution + membership verification
  const { user, team, member } = await resolveTeamAndCheckMembership(event)

  const projects = await db.query.projects.findMany({
    where: eq(schema.projects.teamId, team.id)
  })

  return projects
})
```

### Middleware Migration

**SuperSaaS:**
```typescript
// middleware/auth.ts
export default defineNuxtRouteMiddleware(async (to) => {
  const { user } = useUser()

  if (!user.value && to.path.startsWith('/dashboard')) {
    return navigateTo('/login')
  }
})
```

**@crouton/auth:**
```typescript
// No need! Just use the built-in middleware:
definePageMeta({
  middleware: 'auth'  // Provided by @crouton/auth
})
```

---

## Data Migration

### User Migration Script

```typescript
// scripts/migrate-users.ts
import { db } from './database'

async function migrateUsers() {
  // Fetch users from old system
  const oldUsers = await oldDb.query('SELECT * FROM users')

  for (const oldUser of oldUsers) {
    await db.insert(schema.user).values({
      id: oldUser.id, // Keep same ID if possible
      name: oldUser.name,
      email: oldUser.email,
      emailVerified: oldUser.email_verified,
      image: oldUser.avatar_url,
      createdAt: new Date(oldUser.created_at),
      updatedAt: new Date(oldUser.updated_at)
    })

    // Migrate password account if exists
    if (oldUser.password_hash) {
      await db.insert(schema.account).values({
        id: generateId(),
        userId: oldUser.id,
        accountId: oldUser.id,
        providerId: 'credential',
        password: oldUser.password_hash, // Better Auth uses same hashing
        createdAt: new Date(),
        updatedAt: new Date()
      })
    }
  }

  console.log(`Migrated ${oldUsers.length} users`)
}
```

### Team/Organization Migration Script

```typescript
// scripts/migrate-teams.ts
async function migrateTeams() {
  const oldTeams = await oldDb.query('SELECT * FROM teams')

  for (const oldTeam of oldTeams) {
    await db.insert(schema.organization).values({
      id: oldTeam.id,
      name: oldTeam.name,
      slug: oldTeam.slug,
      logo: oldTeam.logo_url,
      metadata: JSON.stringify(oldTeam.metadata || {}),
      createdAt: new Date(oldTeam.created_at),
    })
  }

  // Migrate memberships
  const oldMembers = await oldDb.query('SELECT * FROM team_members')

  for (const oldMember of oldMembers) {
    await db.insert(schema.member).values({
      id: generateId(),
      organizationId: oldMember.team_id,
      userId: oldMember.user_id,
      role: mapRole(oldMember.role), // owner, admin, or member
      createdAt: new Date(oldMember.created_at),
    })
  }

  console.log(`Migrated ${oldTeams.length} teams and ${oldMembers.length} memberships`)
}

function mapRole(oldRole: string): 'owner' | 'admin' | 'member' {
  switch (oldRole) {
    case 'owner':
    case 'creator':
      return 'owner'
    case 'admin':
    case 'manager':
      return 'admin'
    default:
      return 'member'
  }
}
```

### Subscription Migration Script

```typescript
// scripts/migrate-subscriptions.ts
async function migrateSubscriptions() {
  const oldSubs = await oldDb.query('SELECT * FROM subscriptions')

  for (const oldSub of oldSubs) {
    await db.insert(schema.subscription).values({
      id: generateId(),
      // Use organizationId for team billing, userId for personal billing
      referenceId: oldSub.team_id || oldSub.user_id,
      stripeSubscriptionId: oldSub.stripe_subscription_id,
      stripeCustomerId: oldSub.stripe_customer_id,
      status: oldSub.status,
      plan: oldSub.plan_id,
      priceId: oldSub.stripe_price_id,
      periodStart: new Date(oldSub.current_period_start),
      periodEnd: new Date(oldSub.current_period_end),
      cancelAtPeriodEnd: oldSub.cancel_at_period_end || false,
      seats: oldSub.seats || null,
    })
  }

  console.log(`Migrated ${oldSubs.length} subscriptions`)
}
```

---

## Environment Variables

### Variable Mapping

| SuperSaaS | @crouton/auth | Notes |
|-----------|---------------|-------|
| `AUTH_SECRET` | `BETTER_AUTH_SECRET` | Min 32 chars |
| `APP_URL` | `BETTER_AUTH_URL` | Full URL |
| `GITHUB_ID` | `GITHUB_CLIENT_ID` | Same value |
| `GITHUB_SECRET` | `GITHUB_CLIENT_SECRET` | Same value |
| `GOOGLE_ID` | `GOOGLE_CLIENT_ID` | Same value |
| `GOOGLE_SECRET` | `GOOGLE_CLIENT_SECRET` | Same value |
| `STRIPE_KEY` | `STRIPE_SECRET_KEY` | Same value |
| `STRIPE_PUBLIC_KEY` | `STRIPE_PUBLISHABLE_KEY` | Same value |
| `STRIPE_WEBHOOK_SECRET` | `STRIPE_WEBHOOK_SECRET` | Same value |

---

## Testing Migration

### Verification Checklist

1. **Authentication Flows**
   - [ ] Email/password login works
   - [ ] OAuth login works (all providers)
   - [ ] Password reset works
   - [ ] Email verification works (if enabled)

2. **Team/Organization**
   - [ ] Users see correct teams
   - [ ] Team switching works
   - [ ] Member roles preserved
   - [ ] Invitations work

3. **Billing**
   - [ ] Existing subscriptions load
   - [ ] Stripe webhooks work
   - [ ] Portal access works
   - [ ] New subscriptions work

4. **Data Integrity**
   - [ ] User count matches
   - [ ] Team count matches
   - [ ] Membership count matches
   - [ ] Subscription count matches

### Test Script

```bash
# Run after migration
pnpm test

# Check specific migration scenarios
pnpm test:unit tests/migration/
```

---

## Rollback Plan

If migration fails, follow these steps:

1. **Stop the application**
   ```bash
   # Kill running processes
   pkill -f "nuxt"
   ```

2. **Restore database backup**
   ```bash
   # For D1/SQLite
   cp backup.sqlite local.sqlite

   # For Postgres
   pg_restore -d your_database backup.sql
   ```

3. **Revert code changes**
   ```bash
   git checkout main
   pnpm install
   pnpm dev
   ```

4. **Document issues**
   - Note any errors encountered
   - Check logs for specific failures
   - Plan fixes before retry

---

## Getting Help

- **Issues**: [GitHub Issues](https://github.com/crouton-digital/crouton-auth/issues)
- **Discussions**: [GitHub Discussions](https://github.com/crouton-digital/crouton-auth/discussions)
- **Documentation**: [README](../README.md)

When reporting migration issues, include:
- SuperSaaS version you're migrating from
- @crouton/auth version
- Error messages and stack traces
- Database type (D1, PostgreSQL, etc.)
