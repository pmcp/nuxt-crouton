# Single-Tenant Team App Example

This example demonstrates `@crouton/auth` in **single-tenant mode** - ideal for team/company applications where there's one organization with multiple users.

## Features

- One default organization (auto-created on first boot)
- New users automatically join the default organization
- No team switching UI (only one team)
- Invite-only registration
- Passkeys and 2FA for enhanced security
- No billing (internal team app)

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Copy environment variables
cp .env.example .env

# 3. Add your secrets to .env
# - Generate a random BETTER_AUTH_SECRET (min 32 chars)

# 4. Run development server
pnpm dev
```

## URL Structure

Single-tenant mode uses simplified URLs (no team slug):

- `/auth/login` - Login page
- `/auth/register` - Registration page (requires invite)
- `/dashboard/` - Main dashboard
- `/dashboard/settings` - Account settings
- `/dashboard/members` - Team members (admin only)

## Key Composables

```vue
<script setup lang="ts">
// Authentication
const { user, login, logout } = useAuth()

// Team (auto-resolved, no switching needed)
const {
  currentTeam,
  members,
  inviteMember, // Admin only
  removeMember  // Admin only
} = useTeam()

// 2FA management
const { enable2FA, disable2FA, get2FAStatus } = useAuth()
</script>
```

## Configuration Highlights

```typescript
// nuxt.config.ts
croutonAuth: {
  mode: 'single-tenant',
  appName: 'Acme Corporation',
  defaultTeamId: 'acme-corp',
  teams: {
    allowCreate: false,   // Users cannot create teams
    requireInvite: true   // Invite-only access
  }
}
```

## First User Setup

The first user to register becomes the organization owner. They can then:
1. Invite other users via email
2. Assign roles (owner, admin, member)
3. Manage team settings

## Learn More

See the main [@crouton/auth README](../../README.md) for complete documentation.
