# Crouton Routing & Package Reorganization — Build Plan

## One-liner

Modular crouton architecture with three-tier routing (user/admin/super-admin) and auto-discoverable apps.

---

## The Problem

1. **Unclear routing hierarchy** — Dashboard, admin, and super-admin routes are scattered across packages with no clear tier separation.

2. **Too many packages to install** — Users must manually install and configure `nuxt-crouton`, `nuxt-crouton-auth`, `nuxt-crouton-admin`, `nuxt-crouton-i18n` separately.

3. **No modular app system** — Adding features like bookings requires manual sidebar/route integration. No auto-discovery.

4. **i18n gaps** — Auth forms and CRUD labels are hardcoded English. Team overrides exist but aren't connected to auth/admin components.

5. **Billing bloat** — Billing code is bundled in auth even when not needed.

---

## The Solution

**Three-tier route structure:**
- `/dashboard/[team]/*` — User-facing features (any team member)
- `/admin/[team]/*` — Team administration (team admins/owners)
- `/super-admin/*` — System-wide management (app owner only)

**Auto-included dependencies:**
- Install `nuxt-crouton` → get auth, admin, i18n automatically
- Each package maintains separation of concerns
- Single install, everything works

**App auto-discovery:**
- Apps like `crouton-bookings` register their routes via `app.config.ts`
- Core aggregates and renders sidebar automatically
- No manual integration needed

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         USER INSTALLS                                   │
│                                                                         │
│   pnpm add @friendlyinternet/nuxt-crouton                               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    AUTO-INCLUDED (dependencies)                         │
│                                                                         │
│   nuxt-crouton (core)                                                   │
│   ├── extends: ['@crouton/i18n', '@crouton/auth', '@crouton/admin']     │
│   │                                                                     │
│   │   ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐        │
│   │   │ crouton-i18n│  │ crouton-auth│  │ crouton-admin       │        │
│   │   │             │  │             │  │ (super-admin)       │        │
│   │   │ • common.*  │  │ • auth.*    │  │ • superAdmin.*      │        │
│   │   │ • forms.*   │  │ • account.* │  │ • /super-admin/*    │        │
│   │   │ • errors.*  │  │ • teams.*   │  │                     │        │
│   │   │ • useT()    │  │ • /auth/*   │  │                     │        │
│   │   └─────────────┘  └─────────────┘  └─────────────────────┘        │
│   │                                                                     │
│   └── Core provides:                                                    │
│       • CRUD collections, forms, tables                                 │
│       • /dashboard/[team]/* routes                                      │
│       • /admin/[team]/* routes                                          │
│       • App auto-discovery via useCroutonApps()                         │
│       • Sidebar aggregation                                             │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         OPTIONAL APPS                                   │
│                                                                         │
│   pnpm add @friendlyinternet/crouton-bookings                           │
│   pnpm add @friendlyinternet/crouton-maps                               │
│   pnpm add @friendlyinternet/crouton-editor                             │
│                                                                         │
│   Each app:                                                             │
│   • Provides its own translations (bookings.*, etc.)                    │
│   • Registers routes via app.config.ts (auto-discovered)                │
│   • Appears in sidebar automatically                                    │
│   • Has user-facing AND admin routes                                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Route Structure

### Three Tiers

| Tier | Route Pattern | Purpose | Access |
|------|---------------|---------|--------|
| **User** | `/dashboard/[team]/*` | User-facing features | Any team member |
| **Admin** | `/admin/[team]/*` | Team management | Team admins/owners |
| **Super Admin** | `/super-admin/*` | System management | App owner only |

### Complete Route Map

```
/auth/                              # AUTHENTICATION (from crouton-auth)
├── login
├── register
├── forgot-password
├── reset-password
├── magic-link
└── verify-email

/dashboard/                         # TEAM SELECTION
└── index                           # List teams, select one

/dashboard/[team]/                  # USER TIER (any team member)
├── index                           # User home/overview
├── profile                         # My profile
├── settings                        # My preferences
└── [app-user-routes]/              # Auto-discovered from apps
    ├── bookings                    # My bookings (from crouton-bookings)
    └── ...

/admin/[team]/                      # ADMIN TIER (team admins)
├── index                           # Admin dashboard
├── collections/                    # CRUD collection management
│   └── [collection]                # Individual collection
├── members/                        # Team member management
│   ├── index                       # Member list
│   └── invitations                 # Pending invitations
├── settings/                       # Team settings
│   ├── general                     # Basic team settings
│   ├── translations                # Team translation overrides
│   └── [app-settings]/             # Auto-discovered from apps
│       └── email-templates         # (from crouton-bookings)
└── [app-admin-routes]/             # Auto-discovered from apps
    ├── bookings/                   # Booking management (from crouton-bookings)
    └── ...

/super-admin/                       # SUPER ADMIN TIER (app owner)
├── index                           # System dashboard
├── users                           # All users management
├── teams                           # All teams management
└── impersonate                     # User impersonation
```

### Middleware Requirements

| Route | Middleware | Check |
|-------|------------|-------|
| `/auth/*` | `guest` | Must NOT be authenticated |
| `/dashboard/[team]/*` | `auth`, `team-member` | Must be authenticated + team member |
| `/admin/[team]/*` | `auth`, `team-admin` | Must be authenticated + team admin/owner |
| `/super-admin/*` | `auth`, `super-admin` | Must be authenticated + app owner |

---

## Package Structure

### Dependencies (package.json)

```json
{
  "name": "@friendlyinternet/nuxt-crouton",
  "dependencies": {
    "@friendlyinternet/nuxt-crouton-i18n": "workspace:*",
    "@friendlyinternet/nuxt-crouton-auth": "workspace:*",
    "@friendlyinternet/nuxt-crouton-admin": "workspace:*"
  }
}
```

### Layer Extension (nuxt.config.ts)

```typescript
// packages/nuxt-crouton/nuxt.config.ts
export default defineNuxtConfig({
  extends: [
    '@friendlyinternet/nuxt-crouton-i18n',   // Must be first (provides useT)
    '@friendlyinternet/nuxt-crouton-auth',   // Uses i18n
    '@friendlyinternet/nuxt-crouton-admin'   // Uses i18n + auth
  ]
})
```

**Order matters:** i18n provides translation system that auth/admin consume.

### Package Responsibilities

| Package | Provides | Routes | Translations |
|---------|----------|--------|--------------|
| **crouton-i18n** | `useT()`, DB translations, team overrides | None | `common.*`, `forms.*`, `errors.*`, `time.*` |
| **crouton-auth** | Auth, teams, sessions, OAuth, passkeys | `/auth/*` | `auth.*`, `account.*`, `teams.*` |
| **crouton-admin** | Super admin, user/team management, impersonation | `/super-admin/*` | `superAdmin.*` |
| **crouton (core)** | CRUD, collections, forms, tables, app discovery | `/dashboard/*`, `/admin/*` | Uses above |

---

## App Auto-Discovery

### Registration Convention

Apps register themselves via `app.config.ts`:

```typescript
// crouton-bookings/app/app.config.ts
export default defineAppConfig({
  croutonApp: {
    id: 'bookings',
    name: 'Bookings',
    icon: 'i-heroicons-calendar',

    // User-facing routes (appear in /dashboard/[team]/ sidebar)
    dashboardRoutes: [
      {
        path: 'bookings',
        label: 'bookings.myBookings.title',  // Translation key
        icon: 'i-heroicons-calendar'
      }
    ],

    // Admin routes (appear in /admin/[team]/ sidebar)
    adminRoutes: [
      {
        path: 'bookings',
        label: 'bookings.admin.title',
        icon: 'i-heroicons-calendar',
        children: [
          { path: 'calendar', label: 'bookings.calendar' },
          { path: 'locations', label: 'bookings.locations' }
        ]
      }
    ],

    // Settings pages (appear in /admin/[team]/settings/)
    settingsRoutes: [
      {
        path: 'email-templates',
        label: 'bookings.settings.emailTemplates',
        icon: 'i-heroicons-envelope'
      }
    ]
  }
})
```

### Discovery Composable

```typescript
// packages/nuxt-crouton/app/composables/useCroutonApps.ts
export function useCroutonApps() {
  const appConfig = useAppConfig()

  // Collect all croutonApp configs from all layers
  const apps = computed(() => {
    // Nuxt merges app.config from all layers
    return appConfig.croutonApps || []
  })

  const dashboardRoutes = computed(() =>
    apps.value.flatMap(app => app.dashboardRoutes || [])
  )

  const adminRoutes = computed(() =>
    apps.value.flatMap(app => app.adminRoutes || [])
  )

  const settingsRoutes = computed(() =>
    apps.value.flatMap(app => app.settingsRoutes || [])
  )

  return { apps, dashboardRoutes, adminRoutes, settingsRoutes }
}
```

### Sidebar Integration

```vue
<!-- packages/nuxt-crouton/app/components/AdminSidebar.vue -->
<script setup lang="ts">
const { adminRoutes, settingsRoutes } = useCroutonApps()
const { t } = useT()
const route = useRoute()
const teamSlug = computed(() => route.params.team)
</script>

<template>
  <nav>
    <!-- Core admin items -->
    <SidebarItem
      :to="`/admin/${teamSlug}`"
      :label="t('navigation.dashboard')"
      icon="i-heroicons-home"
    />
    <SidebarItem
      :to="`/admin/${teamSlug}/collections`"
      :label="t('navigation.collections')"
      icon="i-heroicons-folder"
    />
    <SidebarItem
      :to="`/admin/${teamSlug}/members`"
      :label="t('teams.members')"
      icon="i-heroicons-users"
    />

    <!-- Auto-discovered app routes -->
    <template v-for="appRoute in adminRoutes" :key="appRoute.path">
      <SidebarItem
        :to="`/admin/${teamSlug}/${appRoute.path}`"
        :label="t(appRoute.label)"
        :icon="appRoute.icon"
      />
    </template>

    <!-- Settings section -->
    <SidebarSection :label="t('navigation.settings')">
      <SidebarItem
        :to="`/admin/${teamSlug}/settings/general`"
        :label="t('settings.general')"
      />
      <SidebarItem
        :to="`/admin/${teamSlug}/settings/translations`"
        :label="t('settings.translations')"
      />

      <!-- Auto-discovered settings routes -->
      <template v-for="settingRoute in settingsRoutes" :key="settingRoute.path">
        <SidebarItem
          :to="`/admin/${teamSlug}/settings/${settingRoute.path}`"
          :label="t(settingRoute.label)"
          :icon="settingRoute.icon"
        />
      </template>
    </SidebarSection>
  </nav>
</template>
```

---

## i18n Integration

### Translation Namespace Convention

```
System (from nuxt-crouton-i18n):
├── common.*              # save, cancel, delete, edit, create, update...
├── forms.*               # Generic field labels: name, email, status, date...
├── errors.*              # error.generic, error.notFound, error.unauthorized...
├── success.*             # success.saved, success.created, success.deleted...
├── time.*                # time.now, time.today, time.yesterday, time.ago...
└── navigation.*          # navigation.dashboard, navigation.settings...

Auth (from nuxt-crouton-auth):
├── auth.*                # auth.signIn, auth.register, auth.forgotPassword...
├── account.*             # account.settings, account.profile, account.security...
└── teams.*               # teams.team, teams.members, teams.invite, teams.role...

Admin (from nuxt-crouton-admin):
└── superAdmin.*          # superAdmin.users, superAdmin.teams, superAdmin.impersonate...

Apps (from each app package):
├── bookings.*            # From crouton-bookings
├── sales.*               # From crouton-sales
└── [appName].*           # From any app
```

### Translation Lookup (useT)

```typescript
// 3-tier lookup with team overrides
const { t } = useT()

// Lookup order:
// 1. Team override (DB): translations_ui WHERE teamId = :team
// 2. System translation (DB): translations_ui WHERE teamId IS NULL
// 3. JSON locale files: Static fallback from i18n/locales/*.json
// 4. Key as fallback: Returns '[keyPath]' if not found

t('bookings.cart.title')  // "Cart" or team's override
```

### Translation File Structure

```
nuxt-crouton-i18n/
└── locales/
    ├── en.json           # common.*, forms.*, errors.*, success.*, time.*, navigation.*
    ├── nl.json
    └── fr.json

nuxt-crouton-auth/
└── i18n/locales/
    ├── en.json           # auth.*, account.*, teams.*
    └── nl.json

nuxt-crouton-admin/
└── i18n/locales/
    ├── en.json           # superAdmin.*
    └── nl.json

crouton-bookings/
└── i18n/locales/
    ├── en.json           # bookings.*
    └── nl.json
```

### Merging Behavior

Nuxt i18n automatically deep-merges locale files from all extended layers. No custom code needed.

```json
// Final merged en.json (in consuming app)
{
  "common": { "save": "Save", "cancel": "Cancel" },
  "forms": { "name": "Name", "email": "Email" },
  "auth": { "signIn": "Sign In", "register": "Register" },
  "teams": { "members": "Members", "invite": "Invite" },
  "superAdmin": { "users": "Users", "impersonate": "Impersonate" },
  "bookings": { "cart": { "title": "Cart" } }
}
```

### Team Override Management

Route: `/admin/[team]/settings/translations`

Features:
- View all overrideable translation keys
- Set team-specific values
- Preview changes
- Reset to default

---

## Changes Required

### Phase 1: Remove Billing from Auth

| File | Action |
|------|--------|
| `packages/nuxt-crouton-auth/app/components/Billing/*` | Delete entire folder |
| `packages/nuxt-crouton-auth/app/composables/useBilling.ts` | Delete |
| `packages/nuxt-crouton-auth/server/api/billing/*` | Delete |
| `packages/nuxt-crouton-auth/types/config.ts` | Remove billing config options |
| `packages/nuxt-crouton-auth/nuxt.config.ts` | Remove billing runtime config |
| `packages/nuxt-crouton-auth/package.json` | Remove `@better-auth/stripe`, `stripe` deps |

### Phase 2: Restructure Routes

#### 2.1 Auth Package Route Changes

| Current | New | Notes |
|---------|-----|-------|
| `/dashboard` | `/dashboard` | Keep - team selection |
| `/dashboard/[team]` | `/dashboard/[team]` | Keep - user home |

#### 2.2 Admin Package Route Changes

| Current | New | Notes |
|---------|-----|-------|
| `/admin` | `/super-admin` | Rename |
| `/admin/users` | `/super-admin/users` | Rename |
| `/admin/teams` | `/super-admin/teams` | Rename |

Files to update:
- `packages/nuxt-crouton-admin/app/pages/admin/*` → Move to `pages/super-admin/*`
- `packages/nuxt-crouton-admin/app/middleware/super-admin.ts` → Update route checks
- `packages/nuxt-crouton-admin/nuxt.config.ts` → Update routePrefix

#### 2.3 Core Package Route Changes

| Current | New | Notes |
|---------|-----|-------|
| `/dashboard/[team]/crouton` | `/admin/[team]/collections` | Rename + move |

New routes to add:
- `/admin/[team]/index.vue` - Admin dashboard
- `/admin/[team]/members/index.vue` - Team members
- `/admin/[team]/members/invitations.vue` - Invitations
- `/admin/[team]/settings/general.vue` - General settings
- `/admin/[team]/settings/translations.vue` - Translation overrides

Files to update:
- `packages/nuxt-crouton/app/pages/dashboard/[team]/crouton/*` → Move to `pages/admin/[team]/collections/*`

### Phase 3: Auto-Include Dependencies

#### 3.1 Core Package Changes

```typescript
// packages/nuxt-crouton/nuxt.config.ts
export default defineNuxtConfig({
  extends: [
    '@friendlyinternet/nuxt-crouton-i18n',
    '@friendlyinternet/nuxt-crouton-auth',
    '@friendlyinternet/nuxt-crouton-admin'
  ]
})
```

```json
// packages/nuxt-crouton/package.json
{
  "dependencies": {
    "@friendlyinternet/nuxt-crouton-i18n": "workspace:*",
    "@friendlyinternet/nuxt-crouton-auth": "workspace:*",
    "@friendlyinternet/nuxt-crouton-admin": "workspace:*"
  }
}
```

### Phase 4: Add i18n to Auth Components

#### 4.1 Auth Components to Update

| Component | Hardcoded Strings | Translation Keys |
|-----------|-------------------|------------------|
| `LoginForm.vue` | "Email", "Password", "Sign In" | `auth.email`, `auth.password`, `auth.signIn` |
| `RegisterForm.vue` | "Create Account", "Name" | `auth.register`, `forms.name` |
| `ForgotPasswordForm.vue` | "Reset Password", "Send Link" | `auth.resetPassword`, `auth.sendLink` |
| `OAuthButtons.vue` | "Continue with Google" | `auth.continueWith` |
| `TeamSwitcher.vue` | "Switch Team", "Create Team" | `teams.switch`, `teams.create` |
| ... | ... | ... |

#### 4.2 Auth Translation File

```json
// packages/nuxt-crouton-auth/i18n/locales/en.json
{
  "auth": {
    "signIn": "Sign In",
    "register": "Create Account",
    "forgotPassword": "Forgot Password?",
    "resetPassword": "Reset Password",
    "sendLink": "Send Reset Link",
    "email": "Email",
    "password": "Password",
    "confirmPassword": "Confirm Password",
    "rememberMe": "Remember me",
    "continueWith": "Continue with {provider}",
    "orContinueWith": "Or continue with",
    "noAccount": "Don't have an account?",
    "hasAccount": "Already have an account?",
    "signUp": "Sign up",
    "signInHere": "Sign in"
  },
  "account": {
    "settings": "Account Settings",
    "profile": "Profile",
    "security": "Security",
    "twoFactor": "Two-Factor Authentication",
    "passkeys": "Passkeys",
    "deleteAccount": "Delete Account"
  },
  "teams": {
    "team": "Team",
    "teams": "Teams",
    "members": "Members",
    "invite": "Invite Member",
    "invitations": "Invitations",
    "role": "Role",
    "owner": "Owner",
    "admin": "Admin",
    "member": "Member",
    "viewer": "Viewer",
    "switch": "Switch Team",
    "create": "Create Team",
    "settings": "Team Settings",
    "leave": "Leave Team",
    "delete": "Delete Team"
  }
}
```

### Phase 5: Implement App Auto-Discovery

#### 5.1 New Files in Core

| File | Purpose |
|------|---------|
| `app/composables/useCroutonApps.ts` | Aggregate app registrations |
| `app/components/DashboardSidebar.vue` | User tier sidebar |
| `app/components/AdminSidebar.vue` | Admin tier sidebar |
| `app/components/DashboardLayout.vue` | User tier layout |
| `app/components/AdminLayout.vue` | Admin tier layout |
| `app/layouts/dashboard.vue` | Uses DashboardLayout |
| `app/layouts/admin.vue` | Uses AdminLayout |

#### 5.2 Type Definitions

```typescript
// packages/nuxt-crouton/types/app.ts
export interface CroutonAppRoute {
  path: string
  label: string              // Translation key
  icon?: string
  children?: CroutonAppRoute[]
}

export interface CroutonAppConfig {
  id: string
  name: string
  icon?: string
  dashboardRoutes?: CroutonAppRoute[]
  adminRoutes?: CroutonAppRoute[]
  settingsRoutes?: CroutonAppRoute[]
}

declare module 'nuxt/schema' {
  interface AppConfig {
    croutonApps?: CroutonAppConfig[]
  }
}
```

### Phase 6: Update CLI

#### 6.1 Module Registry Updates

```javascript
// packages/nuxt-crouton-cli/lib/module-registry.mjs

// REMOVE these entries (now auto-included):
// - auth
// - admin
// - i18n

// Keep as optional:
// - maps
// - editor
// - email
```

#### 6.2 Generated API Paths

No changes needed - `/api/teams/[id]/*` pattern is correct and stays.

#### 6.3 Generated Page References

Update generated README files to reference new route structure:
- `/dashboard/[team]/crouton` → `/admin/[team]/collections`

### Phase 7: Update Apps (crouton-bookings)

#### 7.1 Route Changes

| Current | New |
|---------|-----|
| `/dashboard/[team]/bookings` (admin view) | `/admin/[team]/bookings` |
| `/dashboard/[team]/settings/email-templates` | `/admin/[team]/settings/email-templates` |

New user-facing route:
- `/dashboard/[team]/bookings` - Customer's own bookings

#### 7.2 App Registration

```typescript
// packages/crouton-bookings/app/app.config.ts
export default defineAppConfig({
  croutonApps: [{
    id: 'bookings',
    name: 'Bookings',
    icon: 'i-heroicons-calendar',

    dashboardRoutes: [
      {
        path: 'bookings',
        label: 'bookings.myBookings.title',
        icon: 'i-heroicons-calendar'
      }
    ],

    adminRoutes: [
      {
        path: 'bookings',
        label: 'bookings.admin.title',
        icon: 'i-heroicons-calendar'
      }
    ],

    settingsRoutes: [
      {
        path: 'email-templates',
        label: 'bookings.settings.emailTemplates',
        icon: 'i-heroicons-envelope'
      }
    ]
  }]
})
```

### Phase 8: Update Documentation

#### 8.1 Files to Update

| File | Changes |
|------|---------|
| `apps/docs/content/1.getting-started/4.adding-modules.md` | Remove auth/admin/i18n from module list |
| `apps/docs/content/6.features/14.admin.md` | Update for super-admin routes |
| `apps/docs/content/2.fundamentals/7.packages.md` | Update package structure diagram |
| `apps/docs/content/10.guides/1.troubleshooting.md` | Update route references |

### Phase 9: Update Test Apps

#### 9.1 test-bookings Changes

```typescript
// apps/test-bookings/nuxt.config.ts
export default defineNuxtConfig({
  extends: [
    // BEFORE:
    // '@friendlyinternet/nuxt-crouton',
    // '@friendlyinternet/nuxt-crouton-auth',
    // '@friendlyinternet/nuxt-crouton-i18n',
    // ...

    // AFTER:
    '@friendlyinternet/nuxt-crouton',           // Includes auth, admin, i18n
    '@friendlyinternet/crouton-bookings',
    '@friendlyinternet/nuxt-crouton-maps',
    './layers/bookings'
  ]
})
```

---

## Build Phases

### Phase 1: Remove Billing (0.5 day) ✅ COMPLETE

- [x] Delete billing components from auth
- [x] Delete billing composables
- [x] Delete billing API routes
- [x] Remove billing from types/config
- [x] Remove stripe dependencies
- [x] Test auth still works

### Phase 2: Restructure Routes (1 day) ✅ COMPLETE

- [x] Move admin pages to super-admin
- [x] Update super-admin middleware
- [x] Create admin tier layout
- [x] Create dashboard tier layout
- [x] Move collection pages to admin tier
- [x] Add new admin routes (members, settings)
- [x] Test all routes work

### Phase 3: Auto-Include Dependencies (0.5 day) ✅ COMPLETE

- [x] Update core package.json dependencies
- [x] Update core nuxt.config.ts extends
- [x] Test single-install workflow
- [x] Verify layer order is correct

### Phase 4: Add i18n to Auth (1 day) ✅ COMPLETE

- [x] Create auth translation files (en, nl)
- [x] Update all auth components to use $t()
- [x] Create admin translation files
- [x] Update admin components to use $t()
- [x] Test translations work
- [x] Test team overrides work

### Phase 5: Implement App Auto-Discovery (1 day) ✅ COMPLETE

- [x] Define CroutonAppConfig types
- [x] Create useCroutonApps composable
- [x] Create DashboardSidebar component
- [x] Create AdminSidebar component
- [x] Create layouts (dashboard, admin)
- [x] Test sidebar renders app routes

### Phase 6: Update CLI (0.5 day) ✅ COMPLETE

- [x] Remove auth/admin/i18n from module registry
- [x] Update generated README templates
- [x] Test `crouton add` command still works
- [x] Test `crouton generate` still works

### Phase 7: Update crouton-bookings (1 day) ✅ COMPLETE

- [x] Move admin pages to /admin/[team]
- [x] Create user-facing /dashboard/[team]/bookings
- [x] Add app.config.ts registration
- [x] Add translation keys (bookings.admin.title, bookings.settings.emailTemplates)
- [x] Test auto-discovery works

### Phase 8: Update Documentation (0.5 day) ✅ COMPLETE

- [x] Update getting started guide
- [x] Update packages documentation
- [x] Update troubleshooting guide
- [x] Update admin feature docs

### Phase 9: Update Test Apps (0.5 day) ✅ COMPLETE

- [x] Simplify test-bookings extends
- 
- [x] Manual testing of all tiers

---

## Success Criteria

1. **Single install** — `pnpm add @friendlyinternet/nuxt-crouton` gives you everything
2. **Clear tiers** — User, admin, super-admin routes are intuitive
3. **Auto-discovery** — Adding crouton-bookings automatically shows in sidebar
4. **Full i18n** — All UI is translatable, team overrides work
5. **Clean separation** — Each package has clear responsibility
6. **No billing** — Auth is leaner without unused billing code

---

## Migration Guide (For Existing Apps)

### Step 1: Update extends

```typescript
// BEFORE
extends: [
  '@friendlyinternet/nuxt-crouton',
  '@friendlyinternet/nuxt-crouton-auth',
  '@friendlyinternet/nuxt-crouton-admin',
  '@friendlyinternet/nuxt-crouton-i18n',
  '@friendlyinternet/crouton-bookings',
]

// AFTER
extends: [
  '@friendlyinternet/nuxt-crouton',
  '@friendlyinternet/crouton-bookings',
]
```

### Step 2: Update route references

| Old Route | New Route |
|-----------|-----------|
| `/admin/*` | `/super-admin/*` |
| `/dashboard/[team]/crouton` | `/admin/[team]/collections` |
| `/dashboard/[team]/bookings` (admin) | `/admin/[team]/bookings` |

### Step 3: Update navigation

If you have custom navigation, update to use `useCroutonApps()` for dynamic routes.

---

## Key Files Summary

### New Files

```
packages/nuxt-crouton/
├── app/
│   ├── composables/
│   │   └── useCroutonApps.ts           # App discovery
│   ├── components/
│   │   ├── DashboardSidebar.vue        # User tier sidebar
│   │   ├── AdminSidebar.vue            # Admin tier sidebar
│   │   ├── DashboardLayout.vue         # User tier layout
│   │   └── AdminLayout.vue             # Admin tier layout
│   ├── layouts/
│   │   ├── dashboard.vue               # User tier
│   │   └── admin.vue                   # Admin tier
│   └── pages/
│       └── admin/
│           └── [team]/
│               ├── index.vue           # Admin dashboard
│               ├── members/
│               │   ├── index.vue       # Member list
│               │   └── invitations.vue # Invitations
│               └── settings/
│                   ├── general.vue     # General settings
│                   └── translations.vue # Translation overrides
└── types/
    └── app.ts                          # CroutonAppConfig types

packages/nuxt-crouton-auth/
└── i18n/
    └── locales/
        ├── en.json                     # Auth translations
        └── nl.json

packages/nuxt-crouton-admin/
├── app/
│   └── pages/
│       └── super-admin/                # Renamed from admin/
│           ├── index.vue
│           ├── users.vue
│           └── teams.vue
└── i18n/
    └── locales/
        ├── en.json                     # Super admin translations
        └── nl.json
```

### Modified Files

```
packages/nuxt-crouton/
├── nuxt.config.ts                      # Add extends
└── package.json                        # Add dependencies

packages/nuxt-crouton-auth/
├── app/components/**/*.vue             # Add $t() calls
├── nuxt.config.ts                      # Add i18n config
└── package.json                        # Remove stripe deps

packages/nuxt-crouton-admin/
├── app/middleware/super-admin.ts       # Update route checks
└── nuxt.config.ts                      # Update route prefix

packages/nuxt-crouton-cli/
└── lib/module-registry.mjs             # Remove auth/admin/i18n

packages/crouton-bookings/
├── app/app.config.ts                   # Add croutonApps registration
└── app/pages/**/*.vue                  # Move routes

apps/test-bookings/
└── nuxt.config.ts                      # Simplify extends
```

---

*This plan was created to establish a clean, modular architecture for nuxt-crouton with clear separation of user/admin/super-admin tiers and automatic app discovery.*
