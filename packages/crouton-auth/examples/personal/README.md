# Personal Workspace Example

This example demonstrates `@crouton/auth` in **personal mode** - ideal for personal productivity applications where each user has their own private workspace.

## Features

- One workspace per user (auto-created on signup)
- No team management UI (personal use only)
- Google OAuth + Magic Link authentication
- User-based Stripe billing (not organization-based)
- Passkey support for passwordless login
- 14-day free trial

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Copy environment variables
cp .env.example .env

# 3. Add your secrets to .env
# - Generate a random BETTER_AUTH_SECRET (min 32 chars)
# - Add Google OAuth credentials (optional)
# - Add Stripe keys (optional)

# 4. Run development server
pnpm dev
```

## URL Structure

Personal mode uses simplified URLs (no team context):

- `/auth/login` - Login page
- `/auth/register` - Registration page
- `/dashboard/` - Personal dashboard
- `/dashboard/settings` - Account settings
- `/dashboard/billing` - Subscription management

## Key Composables

```vue
<script setup lang="ts">
// Authentication
const {
  user,
  login,
  logout,
  loginWithOAuth,
  loginWithMagicLink
} = useAuth()

// Billing (user-based)
const {
  subscription,
  isPro,
  isTrialing,
  checkout,
  portal
} = useBilling()

// Team exists but is auto-managed
const { currentTeam } = useTeam() // User's personal workspace
</script>
```

## Configuration Highlights

```typescript
// nuxt.config.ts
croutonAuth: {
  mode: 'personal',
  methods: {
    password: true,
    oauth: { google: {...} },
    magicLink: { enabled: true }
  },
  billing: {
    enabled: true,
    stripe: {
      trialDays: 14,
      plans: [...]
    }
  }
}
```

## How Personal Mode Works

1. User signs up (via email, Google, or magic link)
2. Personal workspace is auto-created: "[Name]'s Workspace"
3. User is automatically set as owner of their workspace
4. Billing is attached to the user (not the workspace)
5. No team switching or management needed

## Ideal Use Cases

- Note-taking apps
- Task managers
- Personal finance tools
- Journal/diary apps
- Any personal productivity tool

## Learn More

See the main [@crouton/auth README](../../README.md) for complete documentation.
