# Using Crouton - Learnings & Issues Log

A running log of issues discovered while setting up a NuxtHub project with multiple crouton packages.

**Goal**: Document a fluent workflow for setting up NuxtHub + Crouton from scratch.

---

## Session Log

### Session: December 20, 2024

#### Step 1: Create Fresh NuxtHub v0.10 Project

```bash
cd apps
npx nuxi@latest init test-nuxthub --template minimal
npx nuxi module add @nuxthub/core
pnpm add drizzle-orm @libsql/client
pnpm add -D drizzle-kit
```

**nuxt.config.ts**:
```typescript
hub: { db: 'sqlite' }  // Multi-vendor mode, no wrangler needed
```

**Result**: Dev server runs at localhost:3001

---

#### Step 2: Add Crouton Dependencies

**package.json additions**:
```json
{
  "dependencies": {
    "@friendlyinternet/nuxt-crouton": "workspace:*",
    "@friendlyinternet/nuxt-crouton-auth": "workspace:*",
    "@nuxt/ui": "^4.0.0"
  },
  "devDependencies": {
    "@friendlyinternet/nuxt-crouton-cli": "workspace:*"
  },
  "scripts": {
    "crouton": "crouton"
  }
}
```

> **CRITICAL**: Use `@nuxt/ui@^4.0.0`, NOT v3. Auth pages use v4 components.

**Status**: Installed

**Run pnpm install from monorepo root** (not from app directory)

---

#### Step 3: Update nuxt.config.ts

```typescript
export default defineNuxtConfig({
  css: ['~/assets/css/main.css'],
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  extends: [
    '@friendlyinternet/nuxt-crouton',
    '@friendlyinternet/nuxt-crouton-auth'
  ],
  modules: [
    '@nuxthub/core',
    '@nuxt/ui'
  ],
  hub: { db: 'sqlite' }
})
```

**Result**: Dev server runs with auth plugin initialized

---

#### Step 4: Fix app.vue for Layers

The default `app.vue` uses `<NuxtWelcome />` which won't render pages from layers.

**Before** (broken):
```vue
<template>
  <div>
    <NuxtRouteAnnouncer />
    <NuxtWelcome />
  </div>
</template>
```

**After** (working):
```vue
<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
      <CroutonForm />
    </NuxtLayout>
  </UApp>
</template>
```

**Important**:
- The `<UApp>` wrapper is required for Nuxt UI v4 - it provides context for tooltips, toasts, and other components
- The `<CroutonForm />` component is required for the crouton modal forms (create/update/delete) to work. This component renders the global modal that displays forms when triggered via `useCrouton().open()`.

**Result**: Pages from crouton layers now render correctly, and modal forms work

---

#### Step 5: Create CSS with @source Directives

Create `app/assets/css/main.css`:

```css
@import "tailwindcss";
@import "@nuxt/ui";

/* Scan crouton layer components for Tailwind classes */
@source "../../../node_modules/@friendlyinternet/nuxt-crouton/app/components/**/*.vue";
@source "../../../node_modules/@friendlyinternet/nuxt-crouton-auth/app/components/**/*.vue";
```

**Result**: Tailwind classes from crouton components are included

---

#### Step 6: Add Environment Variables

```bash
echo "BETTER_AUTH_SECRET=$(openssl rand -base64 32)" > .env
```

**Result**: Auth warning resolved

---

#### Step 7: Generate a Collection

1. Create `crouton.config.js`:
```javascript
export default {
  collections: [
    { name: 'posts', fieldsFile: './schemas/posts.json' }
  ],
  targets: [
    { layer: 'blog', collections: ['posts'] }
  ],
  dialect: 'sqlite',
  flags: { useMetadata: true, force: true }
}
```

2. Create `schemas/posts.json` with field definitions

3. Run generator:
```bash
pnpm crouton config
```

**Result**:
- Collection generated at `layers/blog/collections/posts/`
- Schema index created at `server/db/schema.ts` (NuxtHub v0.10+ location)
- Database migration generated via `npx nuxt db generate`

---

#### Step 8: Verify Database Setup

```bash
npx nuxt db generate  # Generate migrations
npx nuxt db migrate   # Apply migrations
```

**Result**: Database tables created successfully

---

#### Step 9: Start Dev Server and Test

```bash
pnpm dev
```

**Result**:
- Dev server starts at `http://localhost:300X` (port may vary)
- Navigate to `/login` or `/register`
- Create account and login
- Dashboard at `/dashboard` is accessible

✅ **Full workflow complete!**

---

## Issues Found

### BLOCKING

| # | Issue | Status | Notes |
|---|-------|--------|-------|
| 16 | **Schema location mismatch** | ✅ FIXED | Generator now creates `server/db/schema.ts` for NuxtHub v0.10+ compatibility |
| 25 | **NuxtHub v0.10+ config syntax** | ✅ FIXED | Use `hub: { db: 'sqlite' }` NOT `hub: { database: true }` - this is a v0.10 breaking change |

### HIGH PRIORITY

| # | Issue | Status | Fix Required |
|---|-------|--------|--------------|
| 1 | Wrangler/Zod v4 incompatibility | WORKAROUND | Use NuxtHub v0.10+ with `hub: { db: 'sqlite' }` instead of D1 bindings |
| 2 | Schema export path for drizzle-kit | OPEN | Package import fails (`ERR_PACKAGE_PATH_NOT_EXPORTED`), need direct relative path |
| 3 | Drizzle version mismatch | FIXED | Use `drizzle-orm@^0.45.1` and `drizzle-kit@^0.31.4` |

### MEDIUM PRIORITY

| # | Issue | Status | Fix Required |
|---|-------|--------|--------------|
| 4 | `BETTER_AUTH_SECRET` not documented | ✅ FIXED | Created `.env.example` in nuxt-crouton-auth package |
| 5 | Seed file uses non-existent import | ✅ FIXED | Generator now creates standalone db connection for seeds |
| 6 | NuxtLayout warning with auth package | ✅ DOCUMENTED | app.vue must use `<NuxtLayout><NuxtPage /></NuxtLayout>` instead of `<NuxtWelcome />` |
| 7 | `useDB` auto-import conflicts | OPEN | Auth layer's `useDB` overrides local ones, use different name |

### LOW PRIORITY

| # | Issue | Status | Fix Required |
|---|-------|--------|--------------|
| 8 | Crouton MCP not connected by default | OPEN | Add to settings.json |
| 9 | Workspace install location confusing | OPEN | Document: run `pnpm install` from monorepo root |
| 10 | drizzle-seed incompatibility | OPEN | Use direct inserts instead |
| 11 | CroutonCollection requires full auth | DOCUMENTED | Needs NuxtHub + logged in user + team context |
| 23 | CroutonForm must be in app.vue | ✅ DOCUMENTED | Add `<CroutonForm />` to app.vue template for modal forms to work |
| 24 | UApp wrapper required for Nuxt UI v4 | ✅ DOCUMENTED | Wrap app.vue template with `<UApp>` for tooltips/toasts to work |

### IMPROVEMENT IDEAS

| # | Idea | Notes |
|---|------|-------|
| 12 | `crouton init` should do full Nuxt app setup | Currently just creates example schema - could scaffold entire NuxtHub + Crouton project |
| 13 | CSS setup should be part of `crouton init` | Creating main.css with @source directive, proper nuxt.config css path |
| 14 | Generator writes wrong CSS path for Nuxt 4 | ✅ FIXED | Now correctly writes `~/assets/css/main.css` |
| 15 | ~~Generator tries `pnpm db:generate`~~ | ✅ FIXED | Generator now uses `npx nuxt db generate` for NuxtHub v0.10+ |
| 17 | Queries import path wrong | ✅ FIXED | Generator now imports from `~~/server/db/schema` instead of `~~/server/database/schema` |
| 18 | No default index page | OPEN | Fresh Nuxt project has no `/` route - need either: (1) `crouton init` creates `pages/index.vue`, or (2) nuxt-crouton provides a `<CroutonWelcome />` component users can use |
| 19 | Auth uses `hubDatabase()` not `useDB()` | ✅ FIXED | nuxt-crouton-auth now uses `db` from `hub:db` (NuxtHub v0.10+ multi-vendor mode) |
| 20 | Auth pages link to /terms and /privacy | ✅ FIXED | AuthRegisterForm now has `showTerms`, `termsUrl`, `privacyUrl` props |
| 21 | Better Auth origin mismatch on dynamic ports | ✅ FIXED | useServerAuth now uses `getRequestURL(event)` to get actual origin when no `BETTER_AUTH_URL` is set |
| 22 | Multi-tenant: no redirect for users with no teams | ✅ FIXED | Added `/onboarding/create-team` page and middleware redirect. Configurable via `crouton.auth.ui.redirects.noTeams` |
| 26 | Login/register ignore redirect config | ✅ FIXED | login.vue and register.vue now use `useAuthRedirects()` instead of hardcoded `/dashboard` |
| 27 | Auth config location confusing | ✅ DOCUMENTED | Use `croutonAuth: {}` in nuxt.config.ts, NOT `runtimeConfig.public.crouton.auth`. Module writes to runtimeConfig internally. |
| 28 | Redirect options not obvious | ✅ DOCUMENTED | Five redirect options: `afterLogin` (post-login), `afterRegister` (post-signup), `afterLogout` (post-logout), `authenticated` (logged-in users visiting /auth/* pages), `unauthenticated` (non-logged-in users visiting protected pages). All default to `/dashboard`. |
| 29 | Route transformation for personal/single-tenant mode | ✅ FIXED | Vue Router 4 uses `:team()` syntax (with parentheses) for optional params. The regex in `transformTeamRoutes` was only matching `:team` without parentheses. Fixed by adding `/:team\(\)` pattern to the regex. Routes now correctly transform from `/dashboard/:team()` to `/dashboard`. |
| 30 | Stale .nuxt cache causes component resolution issues | ✅ DOCUMENTED | When changing package versions (e.g., Nuxt UI v3→v4), delete `.nuxt` folder and run `nuxt prepare`. The `.nuxt/components.d.ts` can cache old component paths. |

---

## Previous Session Notes (Dec 18-19, 2024)

### What Worked Well

1. **Config-based generation** - `crouton.config.js` format is clean
2. **Dependency detection** - Generator correctly identifies missing packages
3. **Schema index management** - Auto-updates `server/database/schema/index.ts`
4. **CSS source directive** - Auto-adds Tailwind `@source` for layer components
5. **Layer extension** - Auto-updates `nuxt.config.ts` extends array

### Key Learnings

1. **NuxtHub v0.10 multi-vendor mode** avoids wrangler/Zod v4 compatibility issues
2. **D1 bindings require wrangler** which has Zod v3 dependency (conflicts with monorepo Zod v4 override)
3. **SQLite via libsql** works for local dev without any Cloudflare dependencies
4. **Team-scoped APIs** (`/api/teams/[id]/...`) require full auth flow

### Recommended CLI Testing Workflow

For testing crouton generator without full auth:

1. Generate collection: `pnpm crouton config`
2. Run dev server: `pnpm dev`
3. Create simple test API: Bypass auth for local testing
4. View generated code: Check `layers/[name]/collections/[collection]/`
5. Run typecheck: `npx nuxt typecheck`

---

## Quick Reference

### NuxtHub v0.10+ Setup (Recommended)

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@nuxthub/core'],
  hub: {
    db: 'sqlite'  // Uses libsql, no wrangler needed
  }
})
```

### Required Packages

```json
{
  "dependencies": {
    "@friendlyinternet/nuxt-crouton": "workspace:*",
    "@friendlyinternet/nuxt-crouton-auth": "workspace:*",
    "@nuxthub/core": "^0.10.0",
    "@nuxt/ui": "^4.0.0",
    "@libsql/client": "^0.15.0",
    "drizzle-orm": "^0.45.0"
  },
  "devDependencies": {
    "@friendlyinternet/nuxt-crouton-cli": "workspace:*",
    "drizzle-kit": "^0.31.0"
  }
}
```

> **IMPORTANT**: Must use `@nuxt/ui@^4.0.0` or later. The auth pages use v4 components (`UAuthForm`, `UPageCard`) that don't exist in v3.

### Environment Variables

```bash
BETTER_AUTH_SECRET=<generate-with-openssl-rand-base64-32>
```

### Crouton Config Example

```javascript
// crouton.config.js
export default {
  collections: [
    { name: 'posts', fieldsFile: './schemas/posts.json' }
  ],
  targets: [
    { layer: 'blog', collections: ['posts'] }
  ],
  dialect: 'sqlite',
  flags: { useMetadata: true }
}
```
