# Execution Plan: CLI Manages Framework Package Extends

**Briefing**: `/docs/briefings/cli-framework-extends-brief.md`
**Status**: Ready to Execute
**Estimated Tasks**: 5

---

## Context

When users run `crouton config`, the CLI should automatically add framework packages (like `@fyit/crouton-core`, `@fyit/crouton-auth`) to `nuxt.config.ts` extends based on the `features` section in `crouton.config.js`.

This eliminates the need for `getCroutonLayers()` which breaks CI because it requires importing from a package that isn't built yet.

---

## Pre-Implementation

Before starting, read these files to understand the existing code:

```
packages/crouton-cli/lib/utils/update-nuxt-config.mjs  # Has addToNuxtConfigExtends()
packages/crouton-cli/lib/generate-collection.mjs       # Config command handler
packages/crouton/src/module.ts                         # getCroutonLayers() to deprecate
```

---

## Task 1: Create `framework-packages.mjs`

**File**: `packages/crouton-cli/lib/utils/framework-packages.mjs`

**Action**: Create new file

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

## Task 2: Add `syncFrameworkPackages()` to `update-nuxt-config.mjs`

**File**: `packages/crouton-cli/lib/utils/update-nuxt-config.mjs`

**Action**: Add import and new function

```javascript
// Add import at top
import { getFrameworkPackages } from './framework-packages.mjs'

// Add new function (after existing functions)

/**
 * Sync framework packages in nuxt.config.ts based on features
 * - Removes getCroutonLayers() import and usage if present
 * - Adds framework packages based on features config
 */
export async function syncFrameworkPackages(configPath, features = {}) {
  if (!await fs.pathExists(configPath)) {
    return { synced: false, reason: 'nuxt.config.ts not found' }
  }

  let content = await fs.readFile(configPath, 'utf-8')
  let modified = false

  // Remove getCroutonLayers() import if present
  const importRegex = /import\s*\{\s*getCroutonLayers\s*\}\s*from\s*['"]@fyit\/crouton['"]\s*\n?/g
  if (importRegex.test(content)) {
    content = content.replace(importRegex, '')
    modified = true
  }

  // Remove ...getCroutonLayers() spread if present
  const spreadRegex = /\.\.\.getCroutonLayers\(\),?\s*/g
  if (spreadRegex.test(content)) {
    content = content.replace(spreadRegex, '')
    modified = true
  }

  // Write back if we removed getCroutonLayers usage
  if (modified) {
    await fs.writeFile(configPath, content, 'utf-8')
  }

  // Get framework packages based on features
  const packages = getFrameworkPackages(features)

  // Add each package to extends (reuses existing function, handles deduplication)
  for (const pkg of packages) {
    await addToNuxtConfigExtends(configPath, pkg)
  }

  return { synced: true, packages }
}
```

---

## Task 3: Call sync in `generate-collection.mjs`

**File**: `packages/crouton-cli/lib/generate-collection.mjs`

**Action**:
1. Add import at top
2. Call `syncFrameworkPackages()` in the config command handler, BEFORE generating collections

Find where config is loaded and collections are processed. Add:

```javascript
// Add import at top of file
import { syncFrameworkPackages } from './utils/update-nuxt-config.mjs'

// In the config command handler, after loading config but before generating:
if (config.features) {
  console.log('↻ Syncing framework packages...')
  const nuxtConfigPath = path.resolve('nuxt.config.ts')
  const result = await syncFrameworkPackages(nuxtConfigPath, config.features)
  if (result.synced) {
    console.log(`✓ Synced ${result.packages.length} framework packages to extends`)
  }
}
```

---

## Task 4: Deprecate `getCroutonLayers()`

**File**: `packages/crouton/src/module.ts`

**Action**: Add deprecation JSDoc and console.warn

Find the `getCroutonLayers` function (around line 60) and update:

```typescript
/**
 * @deprecated The CLI now manages extends automatically.
 * Run `crouton config` to sync framework packages to nuxt.config.ts.
 */
export function getCroutonLayers(options?: CroutonOptions): string[] {
  console.warn(
    '[crouton] getCroutonLayers() is deprecated. ' +
    'Run `crouton config` - it now manages framework packages automatically.'
  )

  // Keep existing implementation for backwards compatibility
  // ... rest of function unchanged
```

---

## Task 5: Test the implementation

**Action**: Run `crouton config` in `apps/crouton-test`

```bash
cd apps/crouton-test
pnpm crouton config
```

**Expected result**:
- `getCroutonLayers` import removed from `nuxt.config.ts`
- `...getCroutonLayers()` spread removed
- Framework packages added explicitly to extends array
- No duplicate packages

**Then verify**:
```bash
npx nuxt typecheck
```

---

## Verification Checklist

After all tasks:

- [ ] `packages/crouton-cli/lib/utils/framework-packages.mjs` exists
- [ ] `syncFrameworkPackages()` added to `update-nuxt-config.mjs`
- [ ] `generate-collection.mjs` calls sync before generating
- [ ] `getCroutonLayers()` has deprecation warning
- [ ] `crouton config` works in `apps/crouton-test`
- [ ] `npx nuxt typecheck` passes
- [ ] Running `crouton config` twice doesn't duplicate packages

---

## Files Changed

| File | Action |
|------|--------|
| `packages/crouton-cli/lib/utils/framework-packages.mjs` | Create |
| `packages/crouton-cli/lib/utils/update-nuxt-config.mjs` | Edit (add function) |
| `packages/crouton-cli/lib/generate-collection.mjs` | Edit (add sync call) |
| `packages/crouton/src/module.ts` | Edit (deprecate function) |

---

## Commit Message

```
feat(crouton-cli): manage framework packages in extends automatically

- Add getFrameworkPackages() utility based on features config
- Add syncFrameworkPackages() to update nuxt.config.ts extends
- Call sync from crouton config command before generating
- Deprecate getCroutonLayers() helper (breaks CI on fresh checkout)

The CLI now manages both framework packages AND generated layers
in nuxt.config.ts extends. No more imports needed.
```