# CLI Testing Learnings - December 18, 2024

Testing the crouton-cli from scratch using `apps/test` revealed several issues and improvement opportunities.

## Test Setup

- **App**: `apps/test` (fresh Nuxt app)
- **Collection**: Simple blog with posts (id, title, slug, content, published, publishedAt, authorName)
- **Method**: Config-based generation using `crouton.config.js`

## Issues Found

### 1. Documentation Not Discoverable for AI

**Problem**: The AI assistant searched the codebase looking for config file examples instead of checking the comprehensive docs first.

**Root Cause**: The crouton skill file (`.claude/skills/crouton.md`) didn't emphasize docs-first workflow.

**Fix Applied**: Added "CRITICAL: Documentation First" section to skill file with:
- Documentation tool examples (`crouton_list_docs`, `crouton_search_docs`, `crouton_get_doc`)
- Key documentation sections
- When to use docs (before creating config, for field types, etc.)

**Recommendation**: Ensure MCP tools for docs are prominently featured in skill files.

---

### 2. Crouton MCP Server Not Connected

**Problem**: The Crouton MCP server exists but wasn't available in the AI session.

**Location**: `packages/nuxt-crouton-mcp-server/`

**Impact**: AI couldn't use structured tools like `design_schema`, `validate_schema`, `generate_collection`.

**Fix Required**: Add to Claude Code settings:
```json
{
  "mcpServers": {
    "crouton": {
      "command": "node",
      "args": ["./packages/nuxt-crouton-mcp-server/dist/index.js"]
    }
  }
}
```

---

### 3. Drizzle ORM Version Mismatch

**Problem**: Type errors in generated code due to mismatched drizzle-orm versions.

**Symptoms**:
```
Type 'SQLiteColumn<...drizzle-orm@0.38.4...>' is not assignable to type 'SQLiteColumn<...drizzle-orm@0.45.1...>'
```

**Root Cause**:
- Test app had `drizzle-orm@0.38.4`
- Auth package uses `drizzle-orm@0.45.1`

**Fix Applied**: Updated test app to use `drizzle-orm@^0.45.1` and `drizzle-kit@^0.31.4`

**Recommendation**:
- Document required drizzle versions in getting-started docs
- Consider having generator check/warn about version mismatches
- Add drizzle versions to dependency check in CLI

---

### 4. Schema Index Export Path Issue

**Problem**: Generator writes package import that doesn't work with drizzle-kit:
```typescript
// Generated (doesn't work)
export * from '@friendlyinternet/nuxt-crouton-auth/server/database/schema/auth'
```

**Error**:
```
ERR_PACKAGE_PATH_NOT_EXPORTED: Package subpath './server/database/schema/auth'
is not defined by "exports" in package.json
```

**Workaround**: Playground uses direct relative path:
```typescript
// Works
export * from '../../../../../packages/nuxt-crouton-auth/server/database/schema/auth'
```

**Recommendation**:
- Update generator to use direct path for monorepo setups
- Or add the export to nuxt-crouton-auth package.json exports field

---

### 5. Workspace Install Location

**Problem**: Running `pnpm install` from `apps/test/` fails with:
```
ERR_PNPM_WORKSPACE_PKG_NOT_FOUND: "@friendlyinternet/nuxt-crouton@workspace:*"
is in the dependencies but no package named "@friendlyinternet/nuxt-crouton"
is present in the workspace
```

**Fix**: Must run `pnpm install` from monorepo root (`/Users/pmcp/Projects/nuxt-crouton/`)

**Recommendation**: Add note to test app README or getting-started docs.

---

### 6. NuxtLayout Required When Using Layouts

**Problem**: Warning during dev server startup:
```
[nuxt] Your project has layouts but the <NuxtLayout /> component has not been used.
```

**Root Cause**: The `@crouton/auth` package provides layouts (e.g., for auth pages), but the test app's `app.vue` doesn't wrap content in `<NuxtLayout>`.

**Fix Required**: Update `app.vue` to use layouts:
```vue
<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
```

**Recommendation**:
- Add this to getting-started docs
- Consider having generator check/create proper `app.vue` structure
- Document which layouts are provided by each crouton package

---

## What Worked Well

1. **Config-based generation** - `crouton.config.js` format is clean and documented
2. **Dependency detection** - Generator correctly identified missing `nuxt-crouton` and `nuxt-crouton-auth`
3. **Schema index management** - Auto-updates `server/database/schema/index.ts`
4. **CSS source directive** - Auto-adds Tailwind `@source` for layer components
5. **Layer extension** - Auto-updates `nuxt.config.ts` extends array

---

## Files Modified During Testing

| File | Change |
|------|--------|
| `.claude/skills/crouton.md` | Added docs-first guidance |
| `apps/test/package.json` | Added workspace deps, drizzle versions |
| `apps/test/nuxt.config.ts` | Added extends array, hub config |
| `apps/test/drizzle.config.ts` | Created for db migrations |
| `apps/test/server/database/schema/index.ts` | Fixed auth schema path |

---

## Action Items

- [ ] Add Crouton MCP to project `.claude/settings.json`
- [ ] Document drizzle version requirements in getting-started
- [ ] Fix generator to use direct path for auth schema export
- [ ] Add workspace install note to docs
- [ ] Consider version mismatch warning in CLI
- [ ] Document NuxtLayout requirement when using crouton-auth layouts
- [ ] Consider generator creating/updating app.vue with proper layout structure

---

## Session 2: Seeding & Database Issues (December 19, 2024)

### 7. BETTER_AUTH_SECRET Not Set

**Problem**: Warning on startup:
```
[@crouton/auth] BETTER_AUTH_SECRET is not set. Authentication will not work properly in production.
```

**Fix Applied**: Created `.env` file with generated secret:
```bash
BETTER_AUTH_SECRET=<random-base64-string>
```

**Recommendation**:
- Add `.env.example` to test app with placeholder
- Document in getting-started that auth secret is required

---

### 8. Seed File Uses Non-Existent `useDB` Import

**Problem**: Generated `seed.ts` imports from path that doesn't exist:
```typescript
import { useDB } from '~~/server/utils/db'
```

**Error**:
```
ENOENT: no such file or directory, open '.../server/utils/db'
```

**Root Cause**: Generator assumes `server/utils/db.ts` exists, but it's provided by the auth layer as an auto-import.

**Fix Applied**: Removed explicit import, rely on auto-import.

**Recommendation**:
- Generator should not add explicit import for `useDB`
- Or generator should create the `server/utils/db.ts` file

---

### 9. hubDatabase Not Available Without NuxtHub Link

**Problem**: `hubDatabase()` function is undefined at runtime:
```
hubDatabase is not defined
```

**Root Cause**: NuxtHub requires either:
1. `npx nuxthub link` to connect to remote
2. `npx nuxthub dev` to run with local D1 bindings

Regular `nuxt dev` doesn't provide D1 database bindings.

**Workaround Applied**: Created `server/utils/db.ts` with local SQLite fallback:
```typescript
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'

export function useLocalDB() {
  const sqlite = new Database('.data/db.sqlite')
  return drizzleSqlite(sqlite)
}
```

**Recommendation**:
- Document that `nuxthub dev` or `nuxthub link` is required for D1
- Consider providing a local SQLite fallback in the auth package for dev
- Add this to getting-started docs

---

### 10. drizzle-seed Incompatibility with Schema

**Problem**: `drizzle-seed` throws error:
```
Cannot create property 'isUnique' on boolean 'true'
```

**Root Cause**: drizzle-seed library has compatibility issues with certain schema column definitions.

**Workaround Applied**: Use direct inserts instead of drizzle-seed:
```typescript
const posts = Array.from({ length: 10 }, (_, i) => ({
  id: crypto.randomUUID(),
  title: `Sample Post ${i + 1}`,
  // ...
}))
await db.insert(blogPosts).values(posts)
```

**Recommendation**:
- Investigate drizzle-seed compatibility with our schema
- Consider generating simpler seed files that use direct inserts
- Or fix the schema to be compatible with drizzle-seed

---

### 11. Duplicate `useDB` Auto-Import Conflict

**Problem**: When creating local `server/utils/db.ts`, Nuxt warns:
```
Duplicated imports "useDB", the one from ".../test/server/utils/db.ts" has been ignored
and ".../nuxt-crouton-auth/server/utils/database.ts" is used
```

**Root Cause**: The auth layer exports `useDB`, so local `useDB` is ignored.

**Fix Applied**: Renamed local function to `useLocalDB()`.

**Recommendation**:
- Document that `useDB` is reserved by auth layer
- Consider using different naming for local db utilities

---

## Updated Action Items

- [ ] Add Crouton MCP to project `.claude/settings.json`
- [ ] Document drizzle version requirements in getting-started
- [ ] Fix generator to use direct path for auth schema export
- [ ] Add workspace install note to docs
- [ ] Consider version mismatch warning in CLI
- [ ] Document NuxtLayout requirement when using crouton-auth layouts
- [ ] Add `.env.example` with BETTER_AUTH_SECRET placeholder
- [ ] Fix seed.ts generator to not use explicit useDB import
- [ ] Document `nuxthub dev` requirement for local D1 database
- [ ] Investigate drizzle-seed compatibility issues
- [ ] Consider local SQLite fallback for dev without NuxtHub

---

### 12. Generated CroutonCollection Requires Full Auth Stack

**Problem**: The generated `BlogPostsList` component (and all CroutonCollection components) fail without:
1. NuxtHub running (`hubDatabase()` needed)
2. Authenticated session (logged in user)
3. Team context (organization/workspace)

**Error**:
```
[useCollectionQuery] Team context required but not available
GET /api/teams/undefined/blog-posts → 500 hubDatabase is not defined
```

**Root Cause**: Generated APIs are team-scoped by default:
- API path: `/api/teams/[id]/collection-name`
- Uses `resolveTeamAndCheckMembership()` which requires auth
- Auth uses `hubDatabase()` which needs NuxtHub bindings

**Workaround Applied**: Created parallel simple API for testing:
```typescript
// server/api/posts/index.get.ts - bypasses auth
export default defineEventHandler(async () => {
  const db = useLocalDB()
  return await db.select().from(blogPosts).all()
})
```

And a simple test page at `/posts` that uses `useFetch('/api/posts')` instead of `useCollectionQuery`.

**To use generated components properly**:
1. Run `npx nuxthub dev` (not `nuxt dev`)
2. Run migrations: `npx drizzle-kit push`
3. Register at `/register`
4. Login at `/login`
5. Visit `/dashboard/posts` (uses generated CroutonCollection)

**Recommendation**:
- Document that CroutonCollection requires NuxtHub + Auth
- Consider a "simple mode" generator flag that creates non-team-scoped APIs
- Add auth pages to getting-started or provide example pages
- Document the dev workflow: `nuxthub dev` → register → use collections

---

## Updated Action Items

- [ ] Add Crouton MCP to project `.claude/settings.json`
- [ ] Document drizzle version requirements in getting-started
- [ ] Fix generator to use direct path for auth schema export
- [ ] Add workspace install note to docs
- [ ] Consider version mismatch warning in CLI
- [ ] Document NuxtLayout requirement when using crouton-auth layouts
- [ ] Add `.env.example` with BETTER_AUTH_SECRET placeholder
- [ ] Fix seed.ts generator to not use explicit useDB import
- [ ] Document `nuxthub dev` requirement for local D1 database
- [ ] Investigate drizzle-seed compatibility issues
- [ ] Consider local SQLite fallback for dev without NuxtHub
- [ ] Document CroutonCollection requirements (NuxtHub + Auth + Team)
- [ ] Consider "simple mode" generator for non-team-scoped APIs
- [ ] Add example auth pages to docs or generator

---

### 13. Local NuxtHub Preview Has Cloudflare Worker Compatibility Issues

**Problem**: Running `npx wrangler pages dev dist` fails with:
```
Uncaught Error: tsyringe requires a reflect polyfill.
Please add 'import "reflect-metadata"' to the top of your entry point.
```

**Root Cause**: Better Auth or its dependencies use `tsyringe` for dependency injection, which requires `reflect-metadata`. This works in Node.js but fails in Cloudflare Workers runtime.

**Impact**: Cannot run full local preview with D1 database bindings without deploying to Cloudflare.

**Recommendation for CLI Testing**:
1. Use `pnpm dev` (regular Nuxt dev) for testing generated code structure
2. Create simple bypass APIs for local data testing (like `/api/posts`)
3. Full CroutonCollection testing requires deployed NuxtHub project or `nuxthub link`
4. Consider this an "integration" concern, not CLI testing concern

**For full auth testing**: Deploy to Cloudflare or use `nuxthub link` to connect to a remote D1.

---

## Summary: Recommended CLI Testing Workflow

For testing the crouton-cli generator without full NuxtHub/Auth:

1. **Generate collection**: `pnpm crouton generate`
2. **Run dev server**: `pnpm dev` (regular Nuxt)
3. **Create simple test API**: Bypass auth for local testing
4. **View generated code**: Check structure in `layers/[name]/collections/[collection]/`
5. **Run typecheck**: `npx nuxt typecheck`

Full CroutonCollection/Auth testing requires:
- NuxtHub account + `nuxthub link`, OR
- Deployed Cloudflare Pages project