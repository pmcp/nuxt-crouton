# Briefing: CLI Should Manage Framework Package Extends

**Date**: 2026-01-20
**Status**: Ready for Implementation
**Priority**: High (CI is broken)
**Package**: `packages/crouton-cli`

---

## Problem Statement

CI fails on fresh checkouts because `apps/crouton-test/nuxt.config.ts` imports `getCroutonLayers()` from `@fyit/crouton`, which requires the package to be built first.

```typescript
// apps/crouton-test/nuxt.config.ts - CURRENT (BROKEN)
import { getCroutonLayers } from '@fyit/crouton'  // ← Fails: dist/ doesn't exist

export default defineNuxtConfig({
  extends: [...getCroutonLayers(), './layers/bookings'],
})
```

**Error in CI**:
```
Error: No "exports" main defined in @fyit/crouton/package.json
```

**Root cause**: `pnpm install` → `postinstall` → `nuxt prepare` → loads `nuxt.config.ts` → imports from `@fyit/crouton` → package not built yet → crash.

---

## Solution

**Simple**: The CLI already adds generated layers to extends. Just also add framework packages based on `features` in `crouton.config.js`.

No new commands. No `getCroutonLayers()` helper. Just extend what `crouton config` already does.

### Current CLI Behavior

```
crouton config
    │
    ├─ Reads crouton.config.js
    ├─ Generates collections
    └─ Adds ./layers/* to extends ✓
```

### Target CLI Behavior

```
crouton config
    │
    ├─ Reads crouton.config.js
    ├─ Adds @fyit/crouton-* to extends based on features ← NEW
    ├─ Generates collections
    └─ Adds ./layers/* to extends ✓
```

### Result

User's `nuxt.config.ts` after running `crouton config`:

```typescript
// No imports needed!
export default defineNuxtConfig({
  extends: [
    // Framework packages (managed by CLI based on features)
    '@fyit/crouton-core',
    '@fyit/crouton-auth',
    '@fyit/crouton-admin',
    '@fyit/crouton-i18n',
    '@fyit/crouton-editor',  // Added because features.editor: true
    // Generated layers (managed by CLI based on collections)
    './layers/shop',
  ],
  modules: ['@fyit/crouton', '@nuxthub/core', '@nuxt/ui'],
})

```

---

## Implementation Tasks

### Task 1: Add `getFrameworkPackages()` utility

**File**: `packages/crouton-cli/lib/utils/framework-packages.mjs`

```javascript
/**
 * Get list of framework packages based on features config
 */
export function getFrameworkPackages(features = {}) {
  const packages = ['@fyit/crouton-core']  // Always include core

  // Core add-ons (enabled by default, can be disabled with `false`)
  if (features.auth !== false) packages.push('@fyit/crouton-auth')
  if (features.admin !== false) packages.push('@fyit/crouton-admin')
  if (features.i18n !== false) packages.push('@fyit/crouton-i18n')

  // Optional add-ons (disabled by default, must be explicitly enabled)
  if (features.editor) packages.push('@fyit/crouton-editor')
  if (features.flow) packages.push('@fyit/crouton-flow')
  if (features.assets) packages.push('@fyit/crouton-assets')
  if (features.maps) packages.push('@fyit/crouton-maps')
  if (features.ai) packages.push('@fyit/crouton-ai')
  if (features.email) packages.push('@fyit/crouton-email')
  if (features.events) packages.push('@fyit/crouton-events')
  if (features.collab) packages.push('@fyit/crouton-collab')
  if (features.pages) packages.push('@fyit/crouton-pages')

  // Mini-apps
  if (features.bookings) packages.push('@fyit/crouton-bookings')
  if (features.sales) packages.push('@fyit/crouton-sales')

  return packages
}
```

---

### Task 2: Enhance `update-nuxt-config.mjs` to handle framework packages

**File**: `packages/crouton-cli/lib/utils/update-nuxt-config.mjs`

Add function to sync framework packages (remove `getCroutonLayers` usage, add packages):

```javascript
import { getFrameworkPackages } from './framework-packages.mjs'

/**
 * Sync framework packages in nuxt.config.ts based on features
 */
export async function syncFrameworkPackages(configPath, features = {}) {
  if (!await fs.pathExists(configPath)) {
    return { synced: false, reason: 'nuxt.config.ts not found' }
  }

  let content = await fs.readFile(configPath, 'utf-8')

  // Remove getCroutonLayers() import and usage
  content = content.replace(
    /import\s*\{\s*getCroutonLayers\s*\}\s*from\s*['"]@fyit\/crouton['"]\s*\n?/g,
    ''
  )
  content = content.replace(/\.\.\.getCroutonLayers\(\),?\s*/g, '')

  // Get framework packages based on features
  const packages = getFrameworkPackages(features)

  // Add each package to extends (reuse existing addToNuxtConfigExtends)
  for (const pkg of packages) {
    await addToNuxtConfigExtends(configPath, pkg)
  }

  return { synced: true, packages }
}
```

---

### Task 3: Call sync in `crouton config` command

**File**: `packages/crouton-cli/lib/generate-collection.mjs`

At the start of config-based generation:

```javascript
import { syncFrameworkPackages } from './utils/update-nuxt-config.mjs'

// In the config command handler, before generating collections:
if (config.features) {
  console.log('↻ Syncing framework packages...')
  const nuxtConfigPath = path.resolve('nuxt.config.ts')
  const result = await syncFrameworkPackages(nuxtConfigPath, config.features)
  if (result.synced) {
    console.log(`✓ Added ${result.packages.length} framework packages to extends`)
  }
}

// Then continue with existing collection generation...
```

---

### Task 4: Deprecate `getCroutonLayers()`

**File**: `packages/crouton/src/module.ts`

```typescript
/**
 * @deprecated The CLI now manages extends automatically.
 * Run `crouton config` to sync framework packages.
 */
export function getCroutonLayers(options?: CroutonOptions): string[] {
  console.warn(
    '[crouton] getCroutonLayers() is deprecated. ' +
    'Run `crouton config` - it now manages framework packages automatically.'
  )
  // ... existing implementation (keep for backwards compat)
}
```

---

### Task 5: Update documentation

**Files to update**:
- `packages/crouton-cli/CLAUDE.md` - Document that CLI manages framework packages
- `packages/crouton/CLAUDE.md` - Remove `getCroutonLayers()` examples, show new pattern

---

## Verification Checklist

After implementation:

- [ ] `crouton config` adds framework packages to extends automatically
- [ ] Framework packages are correctly added based on `features` in config
- [ ] Local layers (`./layers/*`) are preserved after framework packages
- [ ] `getCroutonLayers()` import/usage is removed if present
- [ ] `npx nuxt typecheck` passes
- [ ] Idempotent: running `crouton config` twice doesn't duplicate packages

---

## Test Cases

1. **Fresh project with crouton.config.js**
   ```javascript
   // crouton.config.js
   export default {
     features: { editor: true, pages: true },
     collections: [...]
   }
   ```
   Run `crouton config` → extends should have core + auth + admin + i18n + editor + pages + generated layers

2. **Disable core add-on**
   ```javascript
   features: { admin: false }
   ```
   Run `crouton config` → extends should NOT have `@fyit/crouton-admin`

3. **Preserve local layers**
   Existing `extends: ['./layers/shop']`
   Run `crouton config` → local layer should remain after framework packages

4. **Remove getCroutonLayers usage**
   Config with `...getCroutonLayers()` spread
   Run `crouton config` → import removed, spread removed, packages inlined

5. **Idempotent**
   Run `crouton config` twice
   → No duplicate packages in extends

---

## Related Documents

- `/docs/briefings/unified-architecture-brief.md` - Larger architecture discussion
- `/docs/plans/static-generation-pages.md` - Blocked by CI issue

---

## Notes for Implementing Agent

1. The sync utility should be idempotent (safe to run multiple times)
2. Preserve comments in nuxt.config.ts if possible
3. Test with both `crouton.config.js` and `crouton.config.mjs` extensions
4. The `@fyit/crouton` module in `modules:[]` is still needed (it does runtime config)
5. After implementation, run `crouton config` in `apps/crouton-test` to fix it

---

## Review (2026-01-20)

### Verification Status

| Item | Status | Notes |
|------|--------|-------|
| Problem statement accuracy | ✅ Verified | `apps/crouton-test/nuxt.config.ts` does use `getCroutonLayers()` import |
| Feature packages list | ✅ Accurate | All 15 packages exist in `packages/crouton-*/` |
| CLI package location | ✅ Correct | `packages/crouton-cli/` with `bin/crouton-generate.js` entry point |
| Existing extends utility | ✅ Found | `lib/utils/update-nuxt-config.mjs` has `addToNuxtConfigExtends()` |

### Approach

**Simplified**: No separate `crouton sync` command. Just enhance `crouton config` to also manage framework packages - the same way it already manages generated layers.

### Existing Utilities to Leverage

| Utility | File | Can Reuse? |
|---------|------|------------|
| Add to extends | `update-nuxt-config.mjs` | ✅ Yes - add `syncFrameworkPackages()` here |
| Detect getCroutonLayers | `module-detector.mjs:62-69` | ✅ Yes - already checks for usage |
| Load crouton config | `generate-collection.mjs` | ✅ Yes - config loading exists |

### Risk Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| Regex parsing breaks nuxt.config.ts | Medium | Test with various config formats, preserve original on failure |
| Comments in extends get removed | Low | Existing `addToNuxtConfigExtends()` preserves structure |
| Duplicate packages added | Low | Check if package exists before adding |

### Approval

**Briefing approved for implementation.**

Tasks are straightforward:
1. Add utility function (Task 1)
2. Add sync function to existing file (Task 2)
3. Call from existing config handler (Task 3)
4. Deprecate old function (Task 4)
5. Update docs (Task 5)