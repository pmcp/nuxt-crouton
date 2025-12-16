# @crouton/auth

Authentication layer for Nuxt applications using Better Auth with teams, billing, passkeys, and 2FA support.

## Features

- **Authentication** - Email/password, OAuth, passkeys, 2FA, magic links
- **Teams** - Multi-tenant team management via Better Auth's Organization plugin
- **Billing** - Subscription management via Better Auth's Stripe plugin
- **Three Modes** - Multi-tenant SaaS, single-tenant app, personal app

## Installation

```bash
pnpm add @crouton/auth
```

## Quick Start

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  extends: ['@crouton/auth'],

  croutonAuth: {
    mode: 'multi-tenant',
    methods: {
      password: true,
      oauth: {
        github: { clientId: '...', clientSecret: '...' }
      },
      passkeys: true,
      twoFactor: true
    },
    billing: {
      enabled: true,
      provider: 'stripe'
    }
  }
})
```

## Environment Variables

```bash
# Required
BETTER_AUTH_SECRET=your-secret-key
BETTER_AUTH_URL=http://localhost:3000

# OAuth (optional, per provider)
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Billing (optional)
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
```

## Modes

### Multi-Tenant
Users can create and join multiple organizations. Ideal for SaaS applications.

### Single-Tenant
One organization with multiple users. Ideal for team/company applications.

### Personal
One organization per user. Ideal for personal productivity applications.

## Composables

### useAuth()

```vue
<script setup>
const { user, loggedIn, login, logout, hasOAuth, oauthProviders } = useAuth()

async function handleLogin() {
  await login({ email: 'user@example.com', password: 'password' })
}
</script>
```

### useTeam()

```vue
<script setup>
const { currentTeam, teams, switchTeam, createTeam, canCreateTeam } = useTeam()
</script>
```

### useBilling()

```vue
<script setup>
const { subscription, isPro, checkout, portal } = useBilling()
</script>
```

## Server Utilities

```typescript
// In API routes
export default defineEventHandler(async (event) => {
  // Require authentication
  const user = await requireAuth(event)

  // Require team membership
  const { user, team, member } = await requireTeamMember(event)

  // Require admin role
  const { user, team, member } = await requireTeamAdmin(event)

  // Require owner role
  const { user, team } = await requireTeamOwner(event)
})
```

## Development Status

**Phase 1 Complete** - Package structure and configuration schema

Remaining phases:
- Phase 2: Better Auth integration
- Phase 3: Mode implementation
- Phase 4: Composables & utilities
- Phase 5: UI components
- Phase 6: Database & migrations
- Phase 7: Testing & documentation
- Phase 8: Integration & polish
- Phase 9: Release preparation

## License

MIT
