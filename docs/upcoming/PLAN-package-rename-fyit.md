# Crouton Migration Plan

Migrate from `@friendlyinternet/nuxt-crouton-*` packages to a unified `@fyit/crouton` module with opt-in layers.

---

## Quick Resume

**Status**: Not started
**Next step**: Register `@fyit` on npm, then start Phase 1
**Blocker**: None

---

## New Package Structure

| Current | New | Type |
|---------|-----|------|
| `@friendlyinternet/nuxt-crouton` | `@fyit/crouton-core` | Layer |
| `@friendlyinternet/nuxt-crouton-i18n` | `@fyit/crouton-i18n` | Layer |
| `@friendlyinternet/nuxt-crouton-rich-text` | `@fyit/crouton-editor` | Layer |
| `@friendlyinternet/nuxt-crouton-flow` | `@fyit/crouton-flow` | Layer |
| `@friendlyinternet/nuxt-crouton-assets` | `@fyit/crouton-assets` | Layer |
| `@friendlyinternet/nuxt-crouton-devtools` | `@fyit/crouton-devtools` | Layer |
| `@friendlyinternet/nuxt-crouton-collection-generator` | `@fyit/crouton-cli` | CLI |
| *(new)* | `@fyit/crouton` | Module |

## User Experience

### Before

```typescript
export default defineNuxtConfig({
  extends: [
    '@friendlyinternet/nuxt-crouton',
    '@friendlyinternet/nuxt-crouton-i18n',
    '@friendlyinternet/nuxt-crouton-rich-text'
  ]
})
```

### After

```typescript
export default defineNuxtConfig({
  modules: ['@fyit/crouton'],
  crouton: {
    i18n: true,
    editor: true
  }
})
```

## Module Configuration

```typescript
interface CroutonOptions {
  apiPrefix?: string           // default: '/api'
  defaultPageSize?: number     // default: 20
  i18n?: boolean              // default: false
  editor?: boolean            // default: false
  flow?: boolean              // default: false
  assets?: boolean            // default: false
  devtools?: boolean          // default: true in dev
}
```

---

## Implementation (2 Days)

### Phase 1: Standardize, Rename & Restructure

Do everything in one pass. No need for separate phases.

#### 1. Register npm org

```bash
# One-time setup
npm login
npm org create fyit
```

#### 2. Rename packages

Rename directories and update `package.json` names:

```
packages/
├── crouton/              → @fyit/crouton (module)
├── crouton-core/         → @fyit/crouton-core (layer)
├── crouton-i18n/         → @fyit/crouton-i18n (layer)
├── crouton-editor/       → @fyit/crouton-editor (layer)
├── crouton-flow/         → @fyit/crouton-flow (layer)
├── crouton-assets/       → @fyit/crouton-assets (layer)
├── crouton-devtools/     → @fyit/crouton-devtools (layer)
└── crouton-cli/          → @fyit/crouton-cli (CLI)
```

#### 3. Fix package.json inconsistencies while renaming

| Fix | Value |
|-----|-------|
| Author | `"FYIT"` |
| Repo URL | `git+https://github.com/pmcp/nuxt-crouton.git` |
| Nuxt peer | `"^4.0.0"` |
| Internal deps | `"workspace:*"` |

**Layer template:**
```json
{
  "name": "@fyit/crouton-[name]",
  "version": "1.0.0",
  "type": "module",
  "main": "./nuxt.config.ts",
  "exports": { ".": "./nuxt.config.ts" },
  "author": "FYIT",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/pmcp/nuxt-crouton.git",
    "directory": "packages/crouton-[name]"
  },
  "publishConfig": { "access": "public" },
  "peerDependencies": {
    "nuxt": "^4.0.0"
  }
}
```

#### 4. Packages checklist

- [ ] `nuxt-crouton` → `crouton-core`
- [ ] `nuxt-crouton-i18n` → `crouton-i18n`
- [ ] `nuxt-crouton-rich-text` → `crouton-editor`
- [ ] `nuxt-crouton-flow` → `crouton-flow`
- [ ] `nuxt-crouton-assets` → `crouton-assets`
- [ ] `nuxt-crouton-devtools` → `crouton-devtools`
- [ ] `nuxt-crouton-collection-generator` → `crouton-cli`
- [ ] Create new `crouton` module package

### Phase 2: Create Module & Publish

#### Module code

**packages/crouton/src/module.ts:**

```typescript
import { defineNuxtModule } from '@nuxt/kit'
import type { CroutonOptions } from './types'

export default defineNuxtModule<CroutonOptions>({
  meta: {
    name: '@fyit/crouton',
    configKey: 'crouton',
    compatibility: { nuxt: '>=4.0.0' }
  },

  defaults: {
    apiPrefix: '/api',
    defaultPageSize: 20,
    i18n: false,
    editor: false,
    flow: false,
    assets: false,
    devtools: undefined
  },

  setup(options, nuxt) {
    nuxt.options.runtimeConfig.public.crouton = {
      apiPrefix: options.apiPrefix,
      defaultPageSize: options.defaultPageSize
    }

    nuxt.options.extends ||= []
    nuxt.options.extends.push('@fyit/crouton-core')

    if (options.i18n) nuxt.options.extends.push('@fyit/crouton-i18n')
    if (options.editor) nuxt.options.extends.push('@fyit/crouton-editor')
    if (options.flow) nuxt.options.extends.push('@fyit/crouton-flow')
    if (options.assets) nuxt.options.extends.push('@fyit/crouton-assets')

    const enableDevtools = options.devtools ?? nuxt.options.dev
    if (enableDevtools) nuxt.options.extends.push('@fyit/crouton-devtools')
  }
})
```

#### Publish workflow (no Changesets needed)

```bash
# Bump versions manually
pnpm -r exec npm version 1.0.0

# Build all
pnpm -r build

# Publish all (run from root)
pnpm -r publish --access public

# Or one by one if you prefer
cd packages/crouton-core && pnpm publish --access public
```

#### Deprecate old packages

```bash
# For each old package
npm deprecate @friendlyinternet/nuxt-crouton "Moved to @fyit/crouton"
```

### Phase 3: Update Docs & Done

- [ ] Update docs to reference new packages
- [ ] Update playground examples
- [ ] Update README

---

## Migration Guide (For Users)

```bash
# Remove old
pnpm remove @friendlyinternet/nuxt-crouton @friendlyinternet/nuxt-crouton-i18n

# Install new
pnpm add @fyit/crouton
```

```diff
export default defineNuxtConfig({
-  extends: [
-    '@friendlyinternet/nuxt-crouton',
-    '@friendlyinternet/nuxt-crouton-i18n'
-  ]
+  modules: ['@fyit/crouton'],
+  crouton: {
+    i18n: true
+  }
})
```

---

## Appendix A: Testing (Generator Only)

The generator is the highest-risk package. Focus testing there.

```typescript
// packages/crouton-cli/tests/generators/form-component.test.ts
describe('Form Component Generator', () => {
  it('should generate Zod schema from field definitions')
  it('should handle required vs optional fields')
  it('should generate correct imports for field types')
  it('should handle refTarget relations')
})

// packages/crouton-cli/tests/generators/api-endpoints.test.ts
describe('API Endpoint Generator', () => {
  it('should generate GET endpoint with pagination')
  it('should generate POST endpoint with validation')
  it('should generate PATCH endpoint')
  it('should generate DELETE endpoint')
})
```

Other packages: add tests as bugs surface.

---

## Appendix B: Commit Conventions (Monorepo)

### Format

```bash
<type>(<scope>): <description>
```

### Scopes

| Scope | Package |
|-------|---------|
| `crouton` | `@fyit/crouton` |
| `crouton-core` | `@fyit/crouton-core` |
| `crouton-cli` | `@fyit/crouton-cli` |
| `crouton-i18n` | `@fyit/crouton-i18n` |
| `crouton-editor` | `@fyit/crouton-editor` |
| `crouton-flow` | `@fyit/crouton-flow` |
| `crouton-assets` | `@fyit/crouton-assets` |
| `crouton-devtools` | `@fyit/crouton-devtools` |
| `crouton-auth` | `@fyit/crouton-auth` |
| `docs` | `apps/docs` |
| `playground` | `apps/playground` |
| `root` | workspace-level |

### Examples

```bash
feat(crouton-cli): add image field type
fix(crouton-auth): resolve duplicate imports
refactor(crouton-core): rename from nuxt-crouton
chore(root): update pnpm workspace config
```

---

## Future

The `@fyit` namespace accommodates:

```
@fyit/crouton
@fyit/thinkgraph
@fyit/[other-tools]
```
