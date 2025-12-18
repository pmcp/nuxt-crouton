# Multi-Tenant SaaS Example

This example demonstrates `@crouton/auth` in **multi-tenant mode** - ideal for SaaS applications where users can create and join multiple organizations.

## Features

- Users can create multiple teams/organizations
- Team switching via URL (`/dashboard/[team-slug]/...`)
- Full team management (invite members, assign roles)
- Per-organization Stripe billing
- OAuth (GitHub, Google), Passkeys, and 2FA

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Copy environment variables
cp .env.example .env

# 3. Add your secrets to .env
# - Generate a random BETTER_AUTH_SECRET (min 32 chars)
# - Add OAuth credentials (optional)
# - Add Stripe keys (optional)

# 4. Run development server
pnpm dev
```

## URL Structure

Multi-tenant mode uses team slugs in URLs:

- `/auth/login` - Login page
- `/auth/register` - Registration page
- `/dashboard/acme-corp/` - Dashboard for "Acme Corp" team
- `/dashboard/acme-corp/settings` - Team settings
- `/dashboard/acme-corp/members` - Team members

## Key Composables

```vue
<script setup lang="ts">
// Authentication
const { user, login, logout, loginWithOAuth } = useAuth()

// Team management
const {
  currentTeam,
  teams,
  switchTeam,
  createTeam,
  inviteMember
} = useTeam()

// Billing
const { subscription, checkout, portal } = useBilling()
</script>
```

## Configuration Highlights

```typescript
// nuxt.config.ts
croutonAuth: {
  mode: 'multi-tenant',
  teams: {
    allowCreate: true,    // Users can create teams
    limit: 5,             // Max 5 teams per user
    memberLimit: 50       // Max 50 members per team
  }
}
```

## Learn More

See the main [@crouton/auth README](../../README.md) for complete documentation.
