# Setting Up a Crouton Project

A guide for setting up NuxtHub + Crouton from scratch, based on real-world testing.

---

## Quick Start (9 Steps)

### 1. Create Fresh Nuxt Project

```bash
npx nuxi@latest init my-app --template minimal --no-install --git-init false
cd my-app
```

> **Note**: The `--no-install` and `--git-init false` flags make nuxi non-interactive.

### 2. Add Crouton Dependencies

Update `package.json`:

```json
{
  "dependencies": {
    "@fyit/crouton": "workspace:*",
    "@fyit/crouton-auth": "workspace:*",
    "@nuxthub/core": "^0.10.0",
    "@nuxt/ui": "^4.0.0",
    "@libsql/client": "^0.15.0",
    "drizzle-orm": "^0.45.0"
  },
  "devDependencies": {
    "@fyit/crouton-cli": "workspace:*",
    "drizzle-kit": "^0.31.0"
  },
  "scripts": {
    "crouton": "crouton"
  }
}
```

> **CRITICAL**: Use `@nuxt/ui@^4.0.0`, NOT v3. Auth pages require v4 components.

Run `pnpm install` from **monorepo root** (not app directory).

### 3. Configure nuxt.config.ts

```typescript
export default defineNuxtConfig({
  css: ['~/assets/css/main.css'],
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  extends: [
    '@fyit/crouton',
    '@fyit/crouton-auth'
  ],
  modules: ['@nuxthub/core', '@nuxt/ui'],
  hub: { db: 'sqlite' }
})
```

> **CRITICAL: `hub: { db: 'sqlite' }` NOT `hub: { database: true }`**
>
> Using `database: true` causes: `Cannot resolve entry module .nuxt/hub/db/schema.entry.ts`
>
> See CLAUDE.md "Critical Gotchas" section for details.

### 4. app.vue and index.vue (NOW PROVIDED BY CROUTON)

Replace `<NuxtWelcome />` with proper structure:

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

- `<UApp>` - Required for Nuxt UI v4 (tooltips, toasts)
- `<CroutonForm />` - Required for modal forms to work

### 5. Create CSS File

Create `app/assets/css/main.css`:

```css
@import "tailwindcss";
@import "@nuxt/ui";

@source "../../../node_modules/@fyit/crouton/app/components/**/*.vue";
@source "../../../node_modules/@fyit/crouton-auth/app/components/**/*.vue";
```

> **Note**: The crouton CLI now auto-adds @source directives, but creating the file first avoids issues.

### 6. Add Environment Variables

```bash
echo "BETTER_AUTH_SECRET=$(openssl rand -base64 32)" > .env
```

Or for testing, use a simple value:
```bash
echo "BETTER_AUTH_SECRET=test-secret-for-local-dev-only" > .env
```

### 7. Generate a Collection

Create `crouton.config.js`:

```javascript
export default {
  collections: [
    {
      name: 'posts',
      fieldsFile: './schemas/posts.json',
      sortable: true,
      seed: { count: 10 }  // Optional: generate seed data
    }
  ],
  targets: [
    { layer: 'blog', collections: ['posts'] }
  ],
  dialect: 'sqlite',
  flags: {
    useMetadata: true,
    force: true  // Overwrite existing files
  }
}
```

Create `schemas/posts.json`:
```json
{
  "id": { "type": "uuid", "meta": { "primaryKey": true } },
  "title": { "type": "string", "meta": { "required": true, "maxLength": 200 } },
  "slug": { "type": "string", "meta": { "required": true, "maxLength": 200 } },
  "content": { "type": "text" },
  "published": { "type": "boolean", "meta": { "default": false } }
}
```

Run generation:
```bash
pnpm crouton config
```

The generator now:
- Creates collection files
- Updates nuxt.config.ts to extend the layer
- Generates database migrations
- Adds CSS @source directives

### 8. Run Database Migrations

```bash
npx nuxt db migrate
```

> **Note**: `crouton config` runs `npx nuxt db generate` automatically, so you only need to migrate.

### 9. Start and Test

```bash
pnpm dev
```

- Navigate to `/auth/register` to create an account
- Login at `/auth/login`
- Access dashboard at `/dashboard`

---

## What Still Requires Manual Work

| Step | Manual Work Required | Could Be Automated |
|------|---------------------|-------------------|
| app.vue setup | Replace `<NuxtWelcome />` with proper structure | `crouton init` could scaffold this |
| CSS file creation | Create main.css before running generator | Generator could create if missing |
| Environment variables | Generate and add BETTER_AUTH_SECRET | CLI could generate .env with secrets |
| Schema JSON files | Define field structures manually | Could add interactive schema builder |
| Index page | Create `/` route (fresh project has none) | Could provide welcome component |
| Collection pages | Create pages to render collection List components | Could auto-generate dashboard pages |

---

## What Was Difficult

### 1. Nuxt UI Version Confusion
The auth pages use Nuxt UI v4 components (`UAuthForm`, `UPageCard`) that don't exist in v3. Easy to accidentally install v3 and get cryptic component resolution errors.

**Solution**: Always specify `@nuxt/ui@^4.0.0` explicitly.

### 2. Stale .nuxt Cache
When switching package versions, `.nuxt/components.d.ts` caches old component paths, causing resolution failures even after updating package.json.

**Solution**: Delete `.nuxt` folder and run `nuxt prepare` when changing major versions.

### 3. Trusted Origins / Port Conflicts
When port 3000 is in use and Nuxt starts on 3006, Better Auth rejects requests with "Invalid origin" because only ports 3000-3003, 4000, 5000 are trusted by default.

**Solution**: Kill other dev servers before starting, or add more ports to trusted origins in crouton-auth.

### 4. Route Transformation for Personal Mode
In personal/single-tenant mode, routes should transform from `/dashboard/:team/...` to `/dashboard/...`. Vue Router 4 uses `:team()` syntax (with parentheses) which the regex wasn't handling.

**Solution**: Fixed in crouton-auth module - now handles both `:team` and `:team()` patterns.

### 5. Understanding Auth Modes
The difference between multi-tenant, single-tenant, and personal modes wasn't immediately clear:
- **Multi-tenant**: Multiple teams, user switches between them
- **Single-tenant**: One shared team for all users
- **Personal**: Each user gets their own private workspace

**Solution**: Default is personal mode, which works for most simple apps.

### 6. Collection Pages Not Auto-Generated
The generator creates components (`BlogPostsList.vue`, `BlogPostsForm.vue`) but not the dashboard pages to use them. You need to manually create pages like `/dashboard/posts.vue`:

```vue
<script setup lang="ts">
definePageMeta({ title: 'Blog Posts' })
</script>

<template>
  <div>
    <BlogPostsList />
  </div>
</template>
```

**Solution**: Consider auto-generating basic pages or providing a CroutonViewer component.

### 7. Team Context in Personal Mode
The `useCollectionQuery` composable needs team context to build API URLs. In personal mode, this comes from the session's active organization. If the middleware hasn't resolved the team context yet, API calls fail.

**Solution**: Added `getTeamId()` function to `useTeamContext` composable.

---

## Key Learnings

1. **Use NuxtHub v0.10+ with `hub: { db: 'sqlite' }`** - Avoids wrangler/Cloudflare dependencies for local dev

2. **Layer-based architecture works well** - Collections generate into layers, keeping concerns separated

3. **The generator is reliable** - Config-based generation with `pnpm crouton config` handles schema, components, API routes, and migrations

4. **Personal mode is the simplest auth setup** - Auto-creates one team per user, no team switching needed

5. **Kill port 3000 processes** - Before starting dev server to avoid trusted origin issues

6. **Create the CSS file first** - Even though the generator adds @source directives, having the file ready avoids race conditions

---

## Auth Configuration Reference

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  croutonAuth: {
    mode: 'personal',  // 'multi-tenant' | 'single-tenant' | 'personal'
    ui: {
      redirects: {
        afterLogin: '/dashboard',
        afterRegister: '/dashboard',
        afterLogout: '/',
        unauthenticated: '/auth/login'
      }
    }
  }
})
```

---

## Seed Data

Enable seeding in your collection config:

```javascript
collections: [
  {
    name: 'posts',
    fieldsFile: './schemas/posts.json',
    seed: true  // or seed: { count: 50 }
  }
]
```

After generation, run the seed:
```bash
npx tsx ./layers/blog/collections/posts/server/database/seed.ts
```

Or import in a server route:
```typescript
import { seedBlogPosts } from '~/layers/blog/collections/posts/server/database/seed'
await seedBlogPosts({ count: 50, teamId: 'your-team-id' })
```

---

## Multi-Tenant Setup

Testing a multi-tenant app with multiple collections across different layers.

### Configuration

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  extends: [
    '@fyit/crouton',
    '@fyit/crouton-auth'
  ],
  croutonAuth: {
    mode: 'multi-tenant',  // Enable multi-team support
    debug: true,
    teams: {
      allowCreate: true,
      limit: 10
    }
  }
})
```

### Multi-Collection Config

```javascript
// crouton.config.js
export default {
  collections: [
    { name: 'projects', fieldsFile: './schemas/projects.json', sortable: true, seed: { count: 5 } },
    { name: 'tasks', fieldsFile: './schemas/tasks.json', sortable: true, seed: { count: 15 } },
    { name: 'notes', fieldsFile: './schemas/notes.json', sortable: true, seed: { count: 10 } }
  ],
  targets: [
    { layer: 'project-management', collections: ['projects', 'tasks'] },
    { layer: 'knowledge-base', collections: ['notes'] }
  ],
  dialect: 'sqlite',
  flags: { useMetadata: true, force: true }
}
```

### What Worked

1. **One-command generation** - `crouton config ./crouton.config.js` generates all collections, migrations, and configs in one run
2. **Multi-layer generation** - Generator correctly creates multiple layers with nested collections
3. **Schema index auto-update** - All collection schemas are correctly added to `server/db/schema.ts`
4. **nuxt.config.ts auto-update** - All layers added to `extends` array automatically
5. **Seed file generation** - Each collection gets its own seed.ts file
6. **Type registry generation** - `types/crouton-collections.d.ts` generated with all collection types
7. **CSS @source detection** - Generator detects existing CSS file and skips duplicate directives
8. **Multi-word layer names** - After casing bug fix, layers like `project-management` work correctly

### What Needed Manual Work

| Step | Manual Work | Notes |
|------|-------------|-------|
| Dashboard pages | Create `/dashboard/[team]/projects.vue`, etc. | Generator creates List/Form components, not pages |
| Team switcher UI | Add `<TeamSwitcher />` component | Multi-tenant needs team selection UI |
| Navigation | Add links to collection pages in sidebar | No auto-navigation generation |

### Known Issues Found

#### 1. Auth Mode Config Bug (FIXED)

**Symptom**: Server log showed `mode: personal` even when `croutonAuth.mode: 'multi-tenant'` was set.

**Cause**: The auth module used `defu()` incorrectly - it preserved existing config values instead of respecting the app's explicit config.

**Fix**: Changed from `defu()` merge to spread operator in `packages/nuxt-crouton-auth/module.ts:178`:
```typescript
// Before (bug): defu preserved existing values
nuxt.options.runtimeConfig.public.crouton = defu(
  nuxt.options.runtimeConfig.public.crouton,
  { auth: config }
)

// After (fixed): spread preserves other props, auth always uses resolved config
nuxt.options.runtimeConfig.public.crouton = {
  ...nuxt.options.runtimeConfig.public.crouton,
  auth: config
}
```

**Status**: Fixed - auth mode config now works correctly.

#### 2. Duplicate Collection Registry Warning

**Symptom**: Warning `Collection "projectManagementProjects" already in registry` during generation.

**Cause**: Generator runs multiple times or the registry persists between runs.

**Impact**: Harmless warning, generation still works.

#### 3. Layer Names with Hyphens Cause Collection Name Mismatch (FIXED - Multiple Times)

**Symptom**: TypeScript error like `'"../layers/project-management/collections/projects/app/composables/useProjectManagementProjects"' has no exported member named 'projectmanagementProjectsConfig'`.

**Root Cause**: Inconsistent casing methods used across the generator codebase. The composable correctly exported `projectManagementProjectsConfig`, but `app.config.ts` tried to import `projectmanagementProjectsConfig` (all lowercase).

The bug only manifested with **multi-word layer names** like `"project-management"` or `"knowledge-base"`:
- Single-word layers: `"Blog".toLowerCase()` = `"blog"` ✅ (works by coincidence)
- Multi-word layers: `"ProjectManagement".toLowerCase()` = `"projectmanagement"` ❌ (wrong!)
- Correct approach: `layerCamelCase` = `"projectManagement"` ✅

**The Specific Bug**: Code used `layerPascalCase.toLowerCase()` instead of the existing `layerCamelCase` variable:
```javascript
// WRONG: produces "projectmanagement"
const configExportName = `${layerPascalCase.toLowerCase()}${cases.pascalCasePlural}Config`

// CORRECT: produces "projectManagement"
const configExportName = `${layerCamelCase}${cases.pascalCasePlural}Config`
```

**Files Fixed** (commit `384f1a7`):
- `packages/nuxt-crouton-cli/lib/generate-collection.mjs` - app.config.ts registry
- `packages/nuxt-crouton-cli/lib/rollback-collection.mjs` - cleanup consistency
- `packages/nuxt-crouton-cli/lib/generators/types.mjs` - prefixedSingular export
- `packages/nuxt-crouton-cli/lib/generators/form-component.mjs` - 4 reference collection names
- `packages/nuxt-crouton-cli/lib/generators/list-component.mjs` - reference/dependent collections
- `packages/nuxt-crouton-cli/lib/generators/field-components.mjs` - dependent collection names

**Key Learning**: The `layerCamelCase` variable already existed and was used in some places, but other places independently computed a lowercase version incorrectly. This inconsistency went unnoticed because tests only used single-word layer names.

**Prevention**: Add test cases with multi-word layer names (e.g., `"my-layer"`) to catch casing issues.

**Status**: Fixed - layers with hyphens now work correctly.

#### 4. Port Conflict Causes "Worker Exited" Errors

**Symptom**: Registration/login fails with "worker exited with code 0" error in browser console.

**Cause**: Multiple Nuxt dev servers running. Nuxt picks an alternative port (e.g., 3002) but browser/client still targets original port (3000/3001), causing connection failures.

**Solution**: Kill all dev servers before starting:
```bash
pkill -f "nuxt dev" && pnpm dev
```

Or check the terminal output for the actual port the server is running on.

#### 5. Team Must Exist Before Accessing Collections

**Symptom**: 404 error with `Organization not found` when accessing `/api/teams/{teamId}/...`

**Cause**: In multi-tenant mode, API endpoints require a valid team. If you navigate directly to a URL with a non-existent team slug (e.g., `/dashboard/test1/crouton/knowledgeBaseNotes`), the team resolution fails.

**Solution**:
1. Register/login at `/auth/register` or `/auth/login`
2. The system auto-creates a team in personal mode, or prompts to create one in multi-tenant mode
3. Navigate to dashboard through the UI rather than direct URLs
4. Use the actual team slug from your session

#### 6. activeOrganization Null After Login (FIXED)

**Symptom**: User with existing teams gets redirected to `/onboarding/create-team` instead of `/dashboard/{team}` when clicking "go to dashboard".

**Cause**: The team-context middleware checked `teams.value.length === 0` before the Better Auth nanostore was populated. The nanostore (via `useListOrganizations`) returns an empty array initially until it syncs with the server, causing a race condition.

**Fix**: Updated `packages/nuxt-crouton-auth/app/middleware/team-context.global.ts` to explicitly fetch teams from the API if the nanostore returns empty:

```typescript
// Before checking if user has no teams, try fetching directly
let userTeams: Array<{ id: string; slug: string; name: string }> = teams.value
if (userTeams.length === 0) {
  // Try fetching teams directly from the API (client-side only)
  try {
    const authClient = useAuthClientSafe()
    if (authClient?.organization?.list) {
      const result = await authClient.organization.list()
      if (result.data && result.data.length > 0) {
        userTeams = result.data
      }
    }
  } catch (e) {
    console.error('[@crouton/auth] Failed to fetch teams:', e)
  }
}
```

**Key changes**:
- Added import for `useAuthClientSafe` (safe for SSR, returns null on server)
- Uses minimal type annotation to handle both Team[] and raw API response
- Only redirects to create-team if API also confirms no teams

**Status**: Fixed in commit with the middleware update.

---

## Remaining Open Issues

| Issue | Notes |
|-------|-------|
| `useDB` auto-import conflicts | Auth layer's `useDB` can override local ones |
| No default index page | Fresh project has no `/` route - create one or use a welcome component |
| Collection pages need manual creation | Generator creates components but not pages |
| Port conflicts cause auth failures | Better Auth trusted origins limited to specific ports |
| Hydration mismatches on auth state | SSR shows unauthenticated, client shows authenticated - expected behavior |
| **Multi-tenant needs manual UI** | Team switcher, navigation, and collection pages must be created manually |

## Fixed Issues

| Issue | Fix Location |
|-------|--------------|
| Auth mode config not applied | `packages/nuxt-crouton-auth/module.ts:178` - Changed from `defu()` to spread operator |
| Layer hyphen naming mismatch (casing bug) | 6 CLI generator files (commit `384f1a7`) - Use `layerCamelCase` instead of `layerPascalCase.toLowerCase()` |
| activeOrganization null after login | `packages/nuxt-crouton-auth/app/middleware/team-context.global.ts` - Fetch teams from API before checking |
