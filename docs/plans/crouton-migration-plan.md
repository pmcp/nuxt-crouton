# Crouton Migration Plan

Migrate from `@friendlyinternet/nuxt-crouton-*` packages to a unified `@fyit/crouton` module with opt-in layers.

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
// nuxt.config.ts
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
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@fyit/crouton'],
  crouton: {
    i18n: true,
    editor: true
  }
})
```

## Module Configuration Options

```typescript
interface CroutonOptions {
  // Core settings
  apiPrefix?: string           // default: '/api'
  defaultPageSize?: number     // default: 20

  // Opt-in layers
  i18n?: boolean              // default: false
  editor?: boolean            // default: false
  flow?: boolean              // default: false
  assets?: boolean            // default: false
  devtools?: boolean          // default: true in dev
}
```

## Implementation

### Phase 0: Standardize Existing package.json Files (Day 1)

Before renaming, fix inconsistencies across all packages.

#### Issues to Fix

| Issue | Current State | Fix |
|-------|---------------|-----|
| Author | "FYIT", "PMCP", "Crouton Digital", "Friendly Internet" | Use "FYIT" everywhere |
| Repo URL | Mixed URLs | Use `git+https://github.com/pmcp/nuxt-crouton.git` |
| Nuxt version | `^4.0.0`, `^3.0.0 \|\| ^4.0.0`, `^3.14.0 \|\| ^4.0.0` | Use `^4.0.0` |
| Workspace refs | Some use `workspace:*`, others use version strings | Use `workspace:*` for internal deps |
| Exports | Some layers missing proper exports | Add `"exports": { ".": "./nuxt.config.ts" }` |
| Naming | `crouton-auth` vs `nuxt-crouton-i18n` | Will standardize in rename phase |

#### Standard package.json Template for Layers

```json
{
  "name": "@fyit/crouton-[name]",
  "version": "1.0.0",
  "description": "[Description]",
  "type": "module",
  "main": "./nuxt.config.ts",
  "exports": {
    ".": "./nuxt.config.ts"
  },
  "files": [
    "app",
    "server",
    "nuxt.config.ts",
    "README.md"
  ],
  "keywords": [
    "nuxt",
    "nuxt-layer",
    "crouton",
    "[feature]"
  ],
  "author": "FYIT",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/pmcp/nuxt-crouton.git",
    "directory": "packages/crouton-[name]"
  },
  "bugs": {
    "url": "https://github.com/pmcp/nuxt-crouton/issues"
  },
  "homepage": "https://github.com/pmcp/nuxt-crouton#readme",
  "publishConfig": {
    "access": "public"
  },
  "peerDependencies": {
    "nuxt": "^4.0.0",
    "@fyit/crouton-core": "workspace:*"
  }
}
```

#### Standard package.json Template for Module

```json
{
  "name": "@fyit/crouton",
  "version": "1.0.0",
  "description": "Nuxt module for building CRUD applications",
  "type": "module",
  "main": "./dist/module.mjs",
  "types": "./dist/types.d.ts",
  "exports": {
    ".": {
      "types": "./dist/types.d.ts",
      "import": "./dist/module.mjs"
    }
  },
  "files": [
    "dist"
  ],
  "keywords": [
    "nuxt",
    "nuxt-module",
    "crouton",
    "crud"
  ],
  "author": "FYIT",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/pmcp/nuxt-crouton.git",
    "directory": "packages/crouton"
  },
  "bugs": {
    "url": "https://github.com/pmcp/nuxt-crouton/issues"
  },
  "homepage": "https://github.com/pmcp/nuxt-crouton#readme",
  "publishConfig": {
    "access": "public"
  },
  "dependencies": {
    "@nuxt/kit": "^3.15.0",
    "@fyit/crouton-core": "workspace:*",
    "@fyit/crouton-i18n": "workspace:*",
    "@fyit/crouton-editor": "workspace:*",
    "@fyit/crouton-flow": "workspace:*",
    "@fyit/crouton-assets": "workspace:*",
    "@fyit/crouton-devtools": "workspace:*"
  },
  "peerDependencies": {
    "nuxt": "^4.0.0",
    "@nuxt/ui": "^4.3.0"
  }
}
```

#### Packages to Update

Run through each package and apply template:

- [ ] `nuxt-crouton` → fix author, ensure exports
- [ ] `nuxt-crouton-i18n` → add exports, fix workspace ref
- [ ] `nuxt-crouton-editor` → add exports, fix peerDep version string
- [ ] `nuxt-crouton-flow` → fix repo URL
- [ ] `nuxt-crouton-assets` → verify all fields
- [ ] `nuxt-crouton-ai` → fix author
- [ ] `nuxt-crouton-supersaas` → fix author
- [ ] `nuxt-crouton-devtools` → already good (module pattern)
- [ ] `nuxt-crouton-maps` → verify all fields
- [ ] `nuxt-crouton-events` → verify all fields
- [ ] `crouton-auth` → fix repo URL (uses crouton-digital)
- [ ] `crouton-admin` → fix repo URL, author
- [ ] `crouton-email` → fix repo URL
- [ ] `nuxt-crouton-collection-generator` → fix author

### Phase 1: Setup (Day 1)

1. Register `@fyit` organization on npm

2. Add Changesets for coordinated releases:
   ```bash
   pnpm add -Dw @changesets/cli
   pnpm changeset init
   ```

3. Create new package structure in monorepo:
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

### Phase 2: Rename Existing Layers (Day 1-2)

Rename and republish each layer under the new scope:

```json
// packages/crouton-core/package.json
{
  "name": "@fyit/crouton-core",
  "version": "1.0.0"
}
```

No code changes needed — just package naming.

### Phase 3: Create Module Package (Day 2-3)

**packages/crouton/package.json:**

```json
{
  "name": "@fyit/crouton",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/module.mjs",
  "types": "./dist/types.d.ts",
  "exports": {
    ".": {
      "import": "./dist/module.mjs",
      "types": "./dist/types.d.ts"
    }
  },
  "dependencies": {
    "@nuxt/kit": "^3.15.0",
    "@fyit/crouton-core": "workspace:*",
    "@fyit/crouton-i18n": "workspace:*",
    "@fyit/crouton-editor": "workspace:*",
    "@fyit/crouton-flow": "workspace:*",
    "@fyit/crouton-assets": "workspace:*",
    "@fyit/crouton-devtools": "workspace:*"
  },
  "peerDependencies": {
    "nuxt": "^4.0.0",
    "@nuxt/ui": "^4.3.0"
  }
}
```

**packages/crouton/src/module.ts:**

```typescript
import { defineNuxtModule, createResolver } from '@nuxt/kit'
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
    const { resolve } = createResolver(import.meta.url)

    // Runtime config
    nuxt.options.runtimeConfig.public.crouton = {
      apiPrefix: options.apiPrefix,
      defaultPageSize: options.defaultPageSize
    }

    // Core always included
    nuxt.options.extends ||= []
    nuxt.options.extends.push('@fyit/crouton-core')

    // Conditional layers
    if (options.i18n) {
      nuxt.options.extends.push('@fyit/crouton-i18n')
    }
    if (options.editor) {
      nuxt.options.extends.push('@fyit/crouton-editor')
    }
    if (options.flow) {
      nuxt.options.extends.push('@fyit/crouton-flow')
    }
    if (options.assets) {
      nuxt.options.extends.push('@fyit/crouton-assets')
    }

    // Devtools: auto-enable in dev
    const enableDevtools = options.devtools ?? nuxt.options.dev
    if (enableDevtools) {
      nuxt.options.extends.push('@fyit/crouton-devtools')
    }

    // Dev logging
    if (nuxt.options.dev) {
      const enabled = [
        'core',
        options.i18n && 'i18n',
        options.editor && 'editor',
        options.flow && 'flow',
        options.assets && 'assets',
        enableDevtools && 'devtools'
      ].filter(Boolean)
      console.log(`🥐 Crouton: ${enabled.join(', ')}`)
    }
  }
})
```

**packages/crouton/src/types.ts:**

```typescript
export interface CroutonOptions {
  apiPrefix?: string
  defaultPageSize?: number
  i18n?: boolean
  editor?: boolean
  flow?: boolean
  assets?: boolean
  devtools?: boolean
}

declare module '@nuxt/schema' {
  interface NuxtConfig {
    crouton?: CroutonOptions
  }
}
```

### Phase 4: Update CLI (Day 3)

Rename to `@fyit/crouton-cli` and update any internal references to package names.

### Phase 5: Deprecate Old Packages (Day 4)

Publish final versions of `@friendlyinternet/nuxt-crouton-*` with deprecation notices:

```json
{
  "name": "@friendlyinternet/nuxt-crouton",
  "version": "2.0.0",
  "deprecated": "This package has moved to @fyit/crouton. See migration guide: [url]"
}
```

### Phase 6: Update Documentation (Day 4-5)

- Update all docs to reference new package names
- Add migration guide
- Update playground/examples

## Backwards Compatibility

Direct layer usage continues to work for users who prefer it:

```typescript
// Still works
export default defineNuxtConfig({
  extends: [
    '@fyit/crouton-core',
    '@fyit/crouton-i18n'
  ]
})
```

## Migration Guide for Existing Users

### Step 1: Update dependencies

```bash
# Remove old packages
pnpm remove @friendlyinternet/nuxt-crouton @friendlyinternet/nuxt-crouton-i18n

# Install new module
pnpm add @fyit/crouton
```

### Step 2: Update nuxt.config.ts

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

### Step 3: Update CLI (if using globally)

```bash
npm uninstall -g @friendlyinternet/nuxt-crouton-collection-generator
npm install -g @fyit/crouton-cli
```

## Timeline

| Day | Task |
|-----|------|
| 1 | Standardize all package.json files (Phase 0) |
| 1 | Register @fyit org, restructure packages |
| 2 | Rename and publish layers |
| 3 | Build and publish module |
| 3 | Update CLI |
| 4 | Deprecate old packages |
| 4-5 | Update docs |

**Total: ~5 days**

## Future Scope

The `@fyit` namespace accommodates future tools:

```
@fyit/crouton
@fyit/thinkgraph
@fyit/[other-tools]
```

---

## Appendix A: Monorepo Hygiene

### Root Configuration Files

**pnpm-workspace.yaml:**
```yaml
packages:
  - 'packages/*'
  - 'apps/*'
```

**Root package.json:**
```json
{
  "name": "crouton-monorepo",
  "private": true,
  "scripts": {
    "build": "pnpm -r build",
    "dev": "pnpm -r --parallel dev",
    "test": "pnpm -r test",
    "test:coverage": "pnpm -r test:coverage",
    "lint": "pnpm -r lint",
    "typecheck": "pnpm -r typecheck",
    "clean": "pnpm -r exec rm -rf dist .nuxt .output node_modules",
    "changeset": "changeset",
    "version": "changeset version",
    "release": "pnpm build && changeset publish"
  },
  "devDependencies": {
    "@changesets/cli": "^2.27.0",
    "vitest": "^2.1.9",
    "typescript": "^5.7.0"
  },
  "engines": {
    "node": ">=18.0.0",
    "pnpm": ">=9.0.0"
  },
  "packageManager": "pnpm@9.15.0"
}
```

### Shared Vitest Config

Create `vitest.workspace.ts` at root:
```typescript
import { defineWorkspace } from 'vitest/config'

export default defineWorkspace([
  'packages/*/vitest.config.ts',
])
```

This allows running all tests with `pnpm test` from root.

---

## Appendix B: Testing Improvements

### Current State

| Package | Testing | Status |
|---------|---------|--------|
| `crouton-auth` | Vitest, unit + integration | ✅ Good |
| `crouton-mcp-server` | Vitest, unit tests | ✅ Basic |
| `nuxt-crouton-flow` | Test files with `it.todo()` | ⚠️ Stubs only |
| `nuxt-crouton` (core) | None | ❌ |
| `nuxt-crouton-i18n` | None | ❌ |
| `nuxt-crouton-editor` | None | ❌ |
| `nuxt-crouton-assets` | None | ❌ |
| `nuxt-crouton-ai` | None | ❌ |
| `nuxt-crouton-supersaas` | None | ❌ |
| `nuxt-crouton-devtools` | None | ❌ |
| `nuxt-crouton-collection-generator` | Fake (`--help` only) | ❌ |
| `crouton-admin` | None | ❌ |
| `crouton-email` | None | ❌ |

### Priority 1: Generator Tests (High Risk)

The generator is the most complex package with zero real tests. Add:

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

// packages/crouton-cli/tests/schema-parser.test.ts
describe('Schema Parser', () => {
  it('should parse JSON schema file')
  it('should validate field types')
  it('should detect invalid schemas')
  it('should handle nested fields')
})
```

### Priority 2: Core Composables

```typescript
// packages/crouton-core/tests/composables/useCollectionQuery.test.ts
describe('useCollectionQuery', () => {
  it('should fetch collection data')
  it('should handle pagination')
  it('should cache results')
  it('should invalidate cache on mutation')
})

// packages/crouton-core/tests/composables/useCollectionMutation.test.ts
describe('useCollectionMutation', () => {
  it('should create new items')
  it('should update existing items')
  it('should delete items')
  it('should trigger cache invalidation')
})
```

### Priority 3: Layer Integration Tests

For layers, test that components render and composables work:

```typescript
// packages/crouton-i18n/tests/TranslationsInput.test.ts
describe('TranslationsInput', () => {
  it('should render language tabs')
  it('should switch between locales')
  it('should emit translation changes')
})
```

### Standard Package Test Setup

Add to each package that needs tests:

**package.json scripts:**
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

**vitest.config.ts:**
```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node', // or 'jsdom' for components
    coverage: {
      provider: 'v8',
      include: ['app/**/*.ts', 'server/**/*.ts', 'lib/**/*.ts'],
    },
  },
})
```

### Testing Checklist for Migration

- [ ] Add vitest to root devDependencies
- [ ] Create `vitest.workspace.ts` at root
- [ ] Add test scripts to root package.json
- [ ] Add generator tests (Priority 1)
- [ ] Add core composable tests (Priority 2)
- [ ] Fill in `it.todo()` stubs in flow package
- [ ] Add basic smoke tests to each layer
- [ ] Set up CI to run tests on PRs

---

## Appendix C: Commit Conventions (Monorepo)

### Format

```bash
<type>(<scope>): <description>
```

### Scopes (Package Names)

Use the short package name (without `@fyit/` prefix):

| Scope | Package | Description |
|-------|---------|-------------|
| `crouton` | `@fyit/crouton` | Main module |
| `crouton-core` | `@fyit/crouton-core` | Core layer |
| `crouton-cli` | `@fyit/crouton-cli` | CLI/generator |
| `crouton-i18n` | `@fyit/crouton-i18n` | i18n layer |
| `crouton-editor` | `@fyit/crouton-editor` | Rich text layer |
| `crouton-flow` | `@fyit/crouton-flow` | Flow layer |
| `crouton-assets` | `@fyit/crouton-assets` | Assets layer |
| `crouton-devtools` | `@fyit/crouton-devtools` | Devtools |
| `crouton-auth` | `@fyit/crouton-auth` | Auth layer |
| `docs` | `apps/docs` | Documentation |
| `playground` | `apps/playground` | Playground app |
| `root` | (workspace) | Root config, CI, workspace-level |

### Examples

```bash
# Single package
feat(crouton-cli): add image field type
fix(crouton-auth): resolve duplicate imports
docs(docs): update field types reference
chore(crouton-core): update dependencies

# Multi-package changes
feat(crouton-cli,crouton-core): sync field validation
chore(root): update pnpm workspace config

# Migration-specific
refactor(crouton-core): rename from nuxt-crouton
chore(root): register @fyit npm organization
```

### Commit Types

| Type | Use For |
|------|---------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `refactor` | Code change (no functionality change) |
| `test` | Adding/updating tests |
| `chore` | Build, deps, config |

### During Migration

Use these patterns for rename commits:

```bash
refactor(crouton-core): rename from @friendlyinternet/nuxt-crouton
refactor(crouton-i18n): rename from @friendlyinternet/nuxt-crouton-i18n
feat(crouton): create unified module entry point
chore(root): deprecate @friendlyinternet packages
```