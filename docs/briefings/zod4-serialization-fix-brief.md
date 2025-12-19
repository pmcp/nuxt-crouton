# Zod 4 Serialization Fix Briefing

## Overview

**Priority**: High - Blocking development
**Estimated Complexity**: Medium
**Affected Packages**: `nuxt-crouton-cli` (generator), generated collection code

## Problem Statement

When running Nuxt apps that use crouton-generated collections with Zod 4.2.1, the following error occurs during SSR:

```
Cannot read properties of undefined (reading 'checks')
at /node_modules/zod@4.2.1/node_modules/zod/v4/core/schemas.js:14:39
at klona (klona/dist/index.mjs:8:10)
```

## Root Cause

1. **Crouton generator** creates composables that export Zod schemas inside config objects:
   ```typescript
   // Generated file: useBlogPosts.ts
   export const blogPostsConfig = {
     name: 'blogPosts',
     schema: blogPostSchema,  // <-- Zod schema in serializable object
     defaultValues: {...},
     columns: [...],
   }
   ```

2. **Nuxt SSR** uses `klona` library to deep-clone state during hydration

3. **Zod 4** objects have complex internal structures (`_zod.def.checks`, etc.) that don't survive naive deep cloning

4. When klona tries to clone the config object containing a Zod schema, it fails because it can't properly reconstruct the Zod internals

## What Works (Confirmed)

- Zod 4.2.1 + better-auth 1.4.7 works fine in isolation (tested with minimal repro)
- The override in root `package.json` correctly forces Zod 4.2.1
- better-auth initializes and handles requests correctly

## What Needs to Be Fixed

### 1. Generator Template: `useCOLLECTION.ts.ejs`

**Location**: `packages/nuxt-crouton-cli/lib/templates/useCOLLECTION.ts.ejs`

**Current Pattern** (problematic):
```typescript
export const <%= collectionName %>Config = {
  name: '<%= collectionName %>',
  schema: <%= collectionName %>Schema,  // Schema included in config
  defaultValues: {...},
  columns: <%= collectionName %>Columns,
}
```

**Fixed Pattern** (Option A - Recommended):
```typescript
import { markRaw } from 'vue'

export const <%= collectionName %>Schema = markRaw(z.object({...}))

export const <%= collectionName %>Config = {
  name: '<%= collectionName %>',
  schema: <%= collectionName %>Schema,  // Now wrapped with markRaw
  defaultValues: {...},
  columns: <%= collectionName %>Columns,
}
```

**Fixed Pattern** (Option B - Alternative):
```typescript
// Don't include schema in config, export separately
export const <%= collectionName %>Schema = z.object({...})

export const <%= collectionName %>Config = {
  name: '<%= collectionName %>',
  // schema removed from config
  defaultValues: {...},
  columns: <%= collectionName %>Columns,
}

// Consumers use schema directly:
// import { blogPostSchema, blogPostsConfig } from './useBlogPosts'
```

### 2. Existing Generated Files

After fixing the generator, regenerate test app collections:
```bash
cd apps/test
pnpm generate --force
```

## Recommended Approach: Option A with `markRaw`

Using `markRaw()` is preferred because:
1. Minimal change to existing API
2. Consumers can still access `config.schema`
3. Vue/Nuxt won't attempt to make the schema reactive or clone it
4. Works with existing components that expect `config.schema`

## Files to Modify

| File | Change |
|------|--------|
| `packages/nuxt-crouton-cli/lib/templates/useCOLLECTION.ts.ejs` | Wrap schema with `markRaw()` |
| `apps/test/layers/blog/collections/posts/app/composables/useBlogPosts.ts` | Regenerate or manually fix |

## Testing Verification

After fix, verify:

1. **Start test app dev server**:
   ```bash
   cd apps/test
   pnpm dev
   ```

2. **Visit homepage**: Should load without errors

3. **Visit auth pages**: `/auth/login` should work

4. **Test collection CRUD**: If database is set up, test create/read operations

5. **Run typecheck**:
   ```bash
   npx nuxt typecheck
   ```

## Context Files

- **Minimal repro** (works, for reference): `/Users/pmcp/Projects/zod-better-auth-repro/`
- **Test app with error**: `apps/test/`
- **Generator templates**: `packages/nuxt-crouton-cli/lib/templates/`
- **Example generated file**: `apps/test/layers/blog/collections/posts/app/composables/useBlogPosts.ts`

## Configuration Confirmed Working

Root `package.json` override (keep this):
```json
{
  "pnpm": {
    "overrides": {
      "zod": "4.2.1"
    }
  }
}
```

## Success Criteria

- [ ] Test app starts without Zod/klona errors
- [ ] Homepage loads successfully
- [ ] Auth routes work (better-auth functional)
- [ ] Generated collections can be used without SSR errors
- [ ] `npx nuxt typecheck` passes
- [ ] Generator produces fixed code for new collections

## Notes

- The error only manifests during SSR when Nuxt tries to hydrate state
- Client-side only usage might work, but SSR is required for production
- This fix is backward compatible - existing collection functionality unchanged
