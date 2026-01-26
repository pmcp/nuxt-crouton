# Investigation Brief: Public Page Route SSR During Admin Save

## Problem Statement

When saving a page in the admin panel at `/admin/test2/pages`, the public page route `[team]/[locale]/[...slug].vue` is being SSR-rendered on the server, causing errors. This should not happen - admin operations should not trigger SSR of public routes.

## Symptoms

- Error: `$setup.t is not a function` at `[team]/[locale]/[...slug].vue:207`
- Error appears in **server console** (SSR error, not client-side)
- Only happens **when saving** a page, not on initial admin page load
- The error occurs even though the user is on `/admin/test2/pages`

## Current Workaround

Added try-catch around `useT()` in `packages/crouton-pages/app/pages/[team]/[locale]/[...slug].vue` (lines 39-52):

```typescript
let t: (key: string, options?: any) => string = (key: string) => `[${key}]`
try {
  const useTranslation = useT()
  if (typeof useTranslation?.t === 'function') {
    t = useTranslation.t
  }
} catch (error) {
  // useT failed during SSR - use fallback
  if (import.meta.dev) {
    console.warn('[crouton-pages] useT() failed, using fallback:', error)
  }
}
```

This is a **workaround**, not a fix. The root cause is still unknown.

## What We Know

1. **Route should not match**: The admin URL `/admin/test2/pages` could theoretically match `[team]/[locale]/[...slug]` as `team=admin, locale=test2, slug=pages`, BUT the route has a reserved prefix check that should throw 404 for "admin"

2. **Save flow**:
   - `Form.vue` calls `create()` or `update()` from `useCollectionMutation`
   - After save, `close()` is called (just sets `isOpen = false`, no navigation)
   - `invalidateCache()` calls `refreshNuxtData()` for collection cache keys

3. **Components checked** (not the culprit):
   - `BlockEditorWithPreview.vue` - only renders content locally, no API calls
   - `CroutonPagesNav` - only used in public layout, not admin

4. **The useT() composable** itself has try-catch around `useI18n()` and `useTeamContext()`, so it should be safe. But something is causing it to fail during SSR.

## Key Files to Investigate

| File | Purpose | Why Relevant |
|------|---------|--------------|
| `packages/crouton-pages/app/pages/[team]/[locale]/[...slug].vue` | Public page route | Where error occurs |
| `packages/crouton-pages/app/pages/[team]/[...slug].vue` | Redirect route | Might be triggering locale route |
| `packages/crouton-core/app/composables/useCollectionMutation.ts` | Save logic | Triggers after save |
| `packages/crouton-i18n/app/composables/useT.ts` | Translation | Fails during SSR |
| `packages/crouton-pages/app/layouts/public.vue` | Public layout | Uses CroutonPagesNav |

## Hypotheses to Investigate

### 1. Cache Invalidation Triggering Route Render
- `refreshNuxtData()` is called after save
- Could this somehow trigger SSR of routes that use the invalidated data?
- Check if any `useFetch` in the public route is keyed to the same cache

### 2. Prefetching via NuxtLink
- Is there a `<NuxtLink>` somewhere in the admin form that points to the public page?
- Could Nuxt be prefetching the public page during/after save?

### 3. HMR (Hot Module Replacement)
- Does the save trigger a file change that causes HMR?
- Could HMR be re-evaluating routes?

### 4. Layout/Middleware Execution
- Is there a middleware or layout that runs and somehow imports/evaluates the public route?
- Check `definePageMeta` in admin page vs public page

### 5. Server Plugin or Middleware
- Check `packages/crouton-pages/server/middleware/01-domain-resolver.ts`
- Could domain resolution be triggering something?

### 6. ISR/SWR Route Rules
- Route rules are commented out in `packages/crouton-pages/nuxt.config.ts` but verify nothing else enables them
- Check `apps/crouton-test/nuxt.config.ts` for any route rules

## Debugging Steps

1. **Add logging to public route**:
   ```typescript
   // At top of [team]/[locale]/[...slug].vue script setup
   console.log('[PUBLIC ROUTE SSR] Rendering with params:', route.params)
   console.trace('[PUBLIC ROUTE SSR] Stack trace')
   ```

2. **Add logging to useCollectionMutation**:
   ```typescript
   // Before and after invalidateCache
   console.log('[MUTATION] Before invalidateCache')
   await invalidateCache(...)
   console.log('[MUTATION] After invalidateCache')
   ```

3. **Check if route actually matches**:
   - Add logging before the reserved prefix check to see what `teamParam` is
   - If it's "admin", the route should throw 404 and not continue

4. **Check Nuxt DevTools**:
   - Look at the Network tab during save
   - Look at the SSR section for any unexpected route renders

## Expected Outcome

Identify exactly what triggers the public route to be SSR-rendered during admin save, and fix it at the source rather than relying on the try-catch workaround.

## Related Fixes Made in This Session

1. Fixed `useDB()` calls in public pages API (was using undefined `db` variable)
2. Fixed `useCollectionMutation` beforeData fetch to use query-style (`?ids=`) instead of RESTful (`/{id}`)
3. Added try-catch workaround in public page route for `useT()`

## Test Case

1. Go to `http://localhost:3003/admin/test2/pages`
2. Create or edit a page
3. Click save
4. Check server console for the warning: `[crouton-pages] useT() failed, using fallback:`
5. If warning appears, the public route is still being SSR-rendered (root cause not fixed)