# CLAUDE.md - @crouton/auth

## Package Purpose

Authentication layer for Nuxt applications using Better Auth. Provides teams/organizations, passkeys (WebAuthn), 2FA, and OAuth support. This is the **canonical source** for team authentication in the nuxt-crouton ecosystem.

## Configuration Patterns

URLs always include `[team]` param (industry standard: Linear, Notion, Vercel, GitHub).

| Pattern | Configuration | Use Case |
|---------|---------------|----------|
| Team Creation | `teams: { allowCreate: true, showSwitcher: true }` | SaaS platforms |
| Default Team | `teams: { defaultTeamSlug: 'acme', allowCreate: false, showSwitcher: false }` | Company apps |
| Personal Workspace | `teams: { autoCreateOnSignup: true, allowCreate: false, showSwitcher: false }` | Personal apps |

### TeamsConfig Flags

| Flag | Purpose | Default |
|------|---------|---------|
| `autoCreateOnSignup` | Auto-create personal workspace on signup | false |
| `defaultTeamSlug` | Everyone joins this team on signup | undefined |
| `allowCreate` | Can users create additional teams | true |
| `showSwitcher` | Show team switcher UI | true |
| `showManagement` | Show team management UI | true |
| `limit` | Max teams per user (0 = unlimited) | 0 |

## Key Files

| File | Purpose |
|------|---------|
| `module.ts` | Nuxt module entry point |
| `nuxt.config.ts` | Layer configuration |
| `server/lib/auth.ts` | Better Auth factory (`createAuth`) |
| `server/utils/team-auth.ts` | Team auth utilities (exported via `@crouton/auth/server`) |
| `server/utils/team.ts` | Core team resolution logic |
| `types/config.ts` | `CroutonAuthConfig` configuration type |
| `types/connector.ts` | `BetterAuthConnector` interface |

## Composables

| Composable | Purpose |
|------------|---------|
| `useAuth()` | Authentication methods (login, register, logout, OAuth, passkeys, 2FA) |
| `useSession()` | Reactive session state |
| `useTeam()` | Team/organization management |
| `useTeamContext()` | Current team context |
| `useTeamState()` | Team state management |

## Components

### Auth Components
- `LoginForm`, `RegisterForm`, `ForgotPasswordForm`
- `OAuthButtons`, `PasskeyButton`, `MagicLinkForm`
- `TwoFactorForm`

### Account Components
- `ProfileForm`, `PasswordForm`, `Settings`
- `TwoFactorSetup`, `PasskeyManager`
- `LinkedAccounts`, `DeleteAccount`

### Team Components
- `CreateForm`, `Switcher`, `Settings`
- `Members`, `MemberRow`, `MemberInviteForm`
- `Invitations`, `DeleteConfirm`

### Sidebar Components
- `AuthSidebar`, `TeamSection`, `UserMenu`

## Server Utilities

### Team Auth Functions (from `@crouton/auth/server`)

```typescript
// Preferred: Direct import from @crouton/auth/server
import { resolveTeamAndCheckMembership } from '@crouton/auth/server'

// In API handlers
export default defineEventHandler(async (event) => {
  const { team, member, user } = await resolveTeamAndCheckMembership(event)
  // team is the resolved organization
  // member is the user's membership
  // user is the authenticated user
})
```

### Authorization Helpers

```typescript
import { requireTeamMember, requireTeamAdmin, requireTeamOwner } from '@crouton/auth/server'

// Require specific roles
await requireTeamMember(event)  // Any team member
await requireTeamAdmin(event)   // Admin or owner
await requireTeamOwner(event)   // Owner only
```

### Query Functions

```typescript
import {
  getTeamById,
  getTeamBySlug,
  getUserTeams,
  isTeamMemberWithEvent,
  canUserCreateTeam,
  getOrganizationMembershipDirect
} from '@crouton/auth/server'
```

## Middleware

| Middleware | Purpose |
|------------|---------|
| `auth` | Requires authentication (redirect to login) |
| `guest` | Requires NO authentication (redirect to home) |
| `team-context.global` | Sets team context from route params |

## Configuration

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@crouton/auth'],

  croutonAuth: {
    // Team configuration (see Configuration Patterns above)
    teams: {
      allowCreate: true,     // Can create additional teams
      showSwitcher: true,    // Show team switcher UI
      showManagement: true,  // Show team management settings
      // autoCreateOnSignup: true,  // For personal workspace pattern
      // defaultTeamSlug: 'acme',   // For default team pattern
    },

    // Enable/disable features
    emailPassword: true,
    magicLink: false,
    passkeys: true,
    twoFactor: true,

    // OAuth providers
    oauth: {
      google: true,
      github: true
    }
  }
})
```

## Environment Variables

```bash
# Required
BETTER_AUTH_SECRET=your-secret-key
BETTER_AUTH_URL=http://localhost:3000

# OAuth (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

## Database Schema

Located in `server/database/schema/auth.ts`:

- `user` - User accounts
- `session` - Active sessions
- `account` - OAuth linked accounts
- `verification` - Email verification tokens
- `organization` - Teams/organizations
- `member` - Organization memberships
- `invitation` - Pending invitations
- `passkey` - WebAuthn credentials
- `twoFactor` - 2FA settings
- `teamSettings` - Team-specific settings (translations, AI keys, theme)

### Team Settings Table

The `teamSettings` table stores team-level configuration:

| Field | Type | Purpose |
|-------|------|---------|
| `translations` | JSON | Team-specific translation overrides by locale |
| `aiSettings` | JSON | AI API keys (Anthropic, OpenAI) - **server-only** |
| `themeSettings` | JSON | Visual theme (primary color, neutral color, radius) |

```typescript
// Theme settings type
interface TeamThemeSettings {
  primary?: 'red' | 'orange' | ... | 'rose'  // Tailwind colors
  neutral?: 'slate' | 'gray' | 'zinc' | 'neutral' | 'stone'
  radius?: 0 | 0.125 | 0.25 | 0.375 | 0.5  // rem
}
```

## CLI Commands

```bash
# Database migrations
pnpm migrate:status    # Check migration status
pnpm migrate:generate  # Generate migrations
pnpm migrate:push      # Apply migrations
pnpm migrate:check     # Validate schema
pnpm migrate:reset     # Reset database

# Seeding
pnpm seed              # Seed all
pnpm seed:users        # Seed test users
pnpm seed:orgs         # Seed organizations
pnpm seed:clear        # Clear all data
```

## Common Tasks

### Add a new OAuth provider

1. Add provider config in `server/lib/auth.ts`
2. Add environment variables
3. Update `types/config.ts` if needed
4. Add button in `OAuthButtons.vue` component

### Customize auth pages

1. Pages are in `app/pages/auth/`
2. Override by creating same path in your app
3. Use components from `app/components/Auth/`

### Integrate with nuxt-crouton collections

Generated collections automatically import from `@crouton/auth/server`. Ensure:

1. `@crouton/auth` is installed as a dependency in your project
2. Export schema from main schema index:
   ```typescript
   // server/database/schema/index.ts
   export * from '@crouton/auth/server/database/schema/auth'
   ```

**Note**: The collection generator uses `@crouton/auth/server` directly (not the `#crouton/team-auth` alias).

## Rate Limiting (Recommended)

Authentication endpoints are prime targets for abuse. We recommend using `nuxthub-ratelimit` for rate limiting.

### Installation

```bash
pnpm add nuxthub-ratelimit
```

### Configuration

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@crouton/auth', 'nuxthub-ratelimit'],

  rateLimit: {
    routes: {
      // Strict limits for auth endpoints
      '/api/auth/*': {
        maxRequests: 15,
        intervalSeconds: 60
      },
      // More lenient for general API
      '/api/*': {
        maxRequests: 150,
        intervalSeconds: 60
      }
    }
  }
})
```

### Recommended Limits by Endpoint

| Endpoint Pattern | Max Requests | Interval | Reason |
|-----------------|--------------|----------|--------|
| `/api/auth/sign-in/*` | 10 | 60s | Prevent brute force |
| `/api/auth/sign-up/*` | 5 | 60s | Prevent account spam |
| `/api/auth/forgot-password` | 3 | 60s | Prevent email abuse |
| `/api/auth/verify-email` | 5 | 60s | Prevent verification spam |
| `/api/auth/*` | 15 | 60s | General auth fallback |
| `/api/*` | 150 | 60s | General API |

### Requirements

- Requires NuxtHub with KV enabled
- Minimum TTL is 60 seconds (NuxtHub KV limitation)
- See [nuxthub-ratelimit docs](https://github.com/fayazara/nuxthub-ratelimit)

## Scoped Access Tokens

Provides lightweight, resource-scoped authentication for scenarios where full user accounts aren't needed:
- Event helpers (POS/sales)
- Guest access to bookings
- Temporary attendee access

### Server Utilities

```typescript
import {
  createScopedToken,
  validateScopedToken,
  validateScopedTokenFromEvent,
  requireScopedAccess,
  requireScopedAccessToResource,
  revokeScopedToken,
  revokeScopedTokensForResource,
  listScopedTokensForResource
} from '@crouton/auth/server'

// Create a helper token
const { token, expiresAt } = await createScopedToken({
  organizationId: 'team-123',
  resourceType: 'event',
  resourceId: 'event-456',
  displayName: 'John Helper',
  role: 'helper',
  expiresIn: 8 * 60 * 60 * 1000 // 8 hours
})

// Validate in API handler
export default defineEventHandler(async (event) => {
  const access = await requireScopedAccess(event, 'pos-helper-token')
  // access.displayName, access.resourceId, etc.
})
```

### Client Composable

```typescript
// For POS helpers
const {
  isAuthenticated,
  displayName,
  resourceId,
  login,
  logout
} = useEventAccess()

// Generic scoped access
const access = useScopedAccess('booking')
```

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/scoped-access/validate` | POST | Validate a token |
| `/api/auth/scoped-access/logout` | POST | Revoke a token |
| `/api/auth/scoped-access/refresh` | POST | Extend token expiration |

### Database Schema

The `scopedAccessToken` table stores:
- `token`: Unique authentication token
- `organizationId`: Team the token belongs to
- `resourceType`: Type of resource (e.g., 'event', 'booking')
- `resourceId`: ID of the specific resource
- `displayName`: Name of the token holder
- `role`: Authorization role (e.g., 'helper', 'guest')
- `expiresAt`: Token expiration timestamp

## Dependencies

- **Extends**: None (standalone module/layer)
- **Used by**: `@fyit/crouton` and all crouton packages (canonical team auth)
- **Core deps**: better-auth, @better-auth/passkey
- **Recommended**: nuxthub-ratelimit (optional peer dependency for rate limiting)

## Testing

```bash
pnpm test              # Run all tests
pnpm test:unit         # Unit tests only
pnpm test:integration  # Integration tests only
```

## Naming Conventions

```
Component: AuthLoginForm, TeamSwitcher, AccountSettings
Composable: useAuth, useTeam, useSession
API: /api/auth/[...all] (Better Auth handles routing)
Middleware: auth, guest, team-context
```
