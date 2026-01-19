# Crouton Migration Plan

Migrate from `@fyit/crouton-*` packages to a unified `@fyit/crouton` module with opt-in layers.

---

## Quick Resume

**Status**: Phase 4 complete (internal references updated)
**Next step**: Phase 5 - Build & Publish to npm
**Blocker**: Need to register `@fyit` npm organization before publishing
**Last updated**: 2026-01-19
**Total packages**: 20

### Completed Work
- ✅ All 20 directories renamed from `nuxt-crouton-*` to `crouton-*`
- ✅ All package.json names updated to `@fyit/crouton-*`
- ✅ Unified module created at `packages/crouton/`
- ✅ CLI module-registry.mjs updated with new package names
- ✅ All nuxt.config.ts debug/meta strings updated
- ✅ install-modules.mjs updated (deprecated file)

---

## Package Categories

### 1. Core Package
The main entry point that auto-includes bundled add-ons.

| Current | New | Notes |
|---------|-----|-------|
| `@fyit/crouton` | `@fyit/crouton-core` | Base CRUD layer |

### 2. Core Add-ons (Bundled)
Automatically extended when using `@fyit/crouton`. Can be disabled.

| Current | New | Notes |
|---------|-----|-------|
| `@fyit/crouton-auth` | `@fyit/crouton-auth` | Better Auth, teams, passkeys |
| `@fyit/crouton-admin` | `@fyit/crouton-admin` | Admin dashboard |
| `@fyit/crouton-i18n` | `@fyit/crouton-i18n` | Multi-language support |

### 3. Optional Add-ons
Standalone packages users add as needed.

| Current | New | Notes |
|---------|-----|-------|
| `@fyit/crouton-editor` | `@fyit/crouton-editor` | TipTap rich text |
| `@fyit/crouton-flow` | `@fyit/crouton-flow` | Vue Flow graphs |
| `@fyit/crouton-assets` | `@fyit/crouton-assets` | Media library |
| `@fyit/crouton-devtools` | `@fyit/crouton-devtools` | Nuxt DevTools |
| `@fyit/crouton-maps` | `@fyit/crouton-maps` | Mapbox integration |
| `@fyit/crouton-ai` | `@fyit/crouton-ai` | AI/LLM integration |
| `@fyit/crouton-email` | `@fyit/crouton-email` | Vue Email + Resend |
| `@fyit/crouton-events` | `@fyit/crouton-events` | Audit trail |
| `@fyit/crouton-collab` | `@fyit/crouton-collab` | Real-time Yjs |
| `@fyit/crouton-pages` | `@fyit/crouton-pages` | CMS pages |

### 4. Mini-Apps
Complete business applications built on Crouton.

| Current | New | Notes |
|---------|-----|-------|
| `@fyit/crouton-bookings` | `@fyit/crouton-bookings` | Booking system |
| `@fyit/crouton-sales` | `@fyit/crouton-sales` | POS system |

### 5. Tooling
Development and AI tools.

| Current | New | Notes |
|---------|-----|-------|
| `@fyit/crouton-cli` | `@fyit/crouton-cli` | Collection generator |
| `@fyit/crouton-schema-designer` | `@fyit/crouton-schema-designer` | Visual schema editor |
| `@fyit/crouton-mcp-server` | `@fyit/crouton-mcp` | MCP server for AI |
| `@fyit/crouton-themes` | `@fyit/crouton-themes` | UI themes |

---

## User Experience

### Before (Current)

```typescript
export default defineNuxtConfig({
  extends: [
    '@fyit/crouton',
    '@fyit/crouton-i18n',
    '@fyit/crouton-editor',
    '@fyit/crouton-bookings'
  ]
})
```

### After (New)

```typescript
export default defineNuxtConfig({
  modules: ['@fyit/crouton'],
  crouton: {
    // Core add-ons (bundled, enabled by default)
    auth: true,
    admin: true,
    i18n: true,

    // Optional add-ons
    editor: true,
    pages: true,

    // Mini-apps
    bookings: true
  }
})
```

### Alternative: Direct Layer Usage

For users who prefer explicit control:

```typescript
export default defineNuxtConfig({
  extends: [
    '@fyit/crouton-core',
    '@fyit/crouton-auth',
    '@fyit/crouton-editor',
    '@fyit/crouton-bookings'
  ]
})
```

---

## Module Configuration

```typescript
interface CroutonOptions {
  // Global settings
  apiPrefix?: string           // default: '/api'
  defaultPageSize?: number     // default: 20

  // Core add-ons (bundled, can be disabled)
  auth?: boolean              // default: true
  admin?: boolean             // default: true
  i18n?: boolean              // default: true

  // Optional add-ons
  editor?: boolean            // default: false
  flow?: boolean              // default: false
  assets?: boolean            // default: false
  maps?: boolean              // default: false
  ai?: boolean                // default: false
  email?: boolean             // default: false
  events?: boolean            // default: false
  collab?: boolean            // default: false
  pages?: boolean             // default: false
  devtools?: boolean          // default: true in dev

  // Mini-apps
  bookings?: boolean          // default: false
  sales?: boolean             // default: false
}
```

---

## New Directory Structure

```
packages/
├── crouton/                  # @fyit/crouton (NEW - unified module)
│
├── crouton-core/             # @fyit/crouton-core
├── crouton-cli/              # @fyit/crouton-cli
│
│   # Core Add-ons (bundled)
├── crouton-auth/             # @fyit/crouton-auth
├── crouton-admin/            # @fyit/crouton-admin
├── crouton-i18n/             # @fyit/crouton-i18n
│
│   # Optional Add-ons
├── crouton-editor/           # @fyit/crouton-editor
├── crouton-flow/             # @fyit/crouton-flow
├── crouton-assets/           # @fyit/crouton-assets
├── crouton-devtools/         # @fyit/crouton-devtools
├── crouton-maps/             # @fyit/crouton-maps
├── crouton-ai/               # @fyit/crouton-ai
├── crouton-email/            # @fyit/crouton-email
├── crouton-events/           # @fyit/crouton-events
├── crouton-collab/           # @fyit/crouton-collab
├── crouton-pages/            # @fyit/crouton-pages
│
│   # Tooling
├── crouton-schema-designer/  # @fyit/crouton-schema-designer
├── crouton-themes/           # @fyit/crouton-themes
├── crouton-mcp/              # @fyit/crouton-mcp
│
│   # Mini-Apps
├── crouton-bookings/         # @fyit/crouton-bookings
└── crouton-sales/            # @fyit/crouton-sales
```

---

## Implementation

### Phase 0: Pre-Rename Cleanup (1 hour)

Standardize all package.json files before renaming.

#### Fix inconsistencies

| Field | Standardized Value |
|-------|-------------------|
| `author` | `"FYIT"` |
| `repository.url` | `"git+https://github.com/pmcp/nuxt-crouton.git"` |
| `bugs.url` | `"https://github.com/pmcp/nuxt-crouton/issues"` |
| `homepage` | `"https://github.com/pmcp/nuxt-crouton#readme"` |
| `license` | `"MIT"` |
| `peerDependencies.nuxt` | `"^4.0.0"` |
| Internal deps | `"workspace:*"` |

#### Version reset

All packages start at `1.0.0` after rename.

---

### Phase 1: Register npm org & Rename (2 hours)

#### 1. Register npm organization

```bash
npm login
npm org create fyit
```

#### 2. Rename directories

```bash
# Core
mv packages/nuxt-crouton packages/crouton-core
mv packages/nuxt-crouton-cli packages/crouton-cli

# Core add-ons
mv packages/nuxt-crouton-auth packages/crouton-auth
mv packages/nuxt-crouton-admin packages/crouton-admin
mv packages/nuxt-crouton-i18n packages/crouton-i18n

# Optional add-ons
mv packages/nuxt-crouton-editor packages/crouton-editor
mv packages/nuxt-crouton-flow packages/crouton-flow
mv packages/nuxt-crouton-assets packages/crouton-assets
mv packages/nuxt-crouton-devtools packages/crouton-devtools
mv packages/nuxt-crouton-maps packages/crouton-maps
mv packages/nuxt-crouton-ai packages/crouton-ai
mv packages/nuxt-crouton-email packages/crouton-email
mv packages/nuxt-crouton-events packages/crouton-events
mv packages/nuxt-crouton-collab packages/crouton-collab
mv packages/nuxt-crouton-pages packages/crouton-pages

# Tooling
mv packages/nuxt-crouton-schema-designer packages/crouton-schema-designer
mv packages/nuxt-crouton-themes packages/crouton-themes
mv packages/nuxt-crouton-mcp-server packages/crouton-mcp

# Mini-apps (already correct naming, just location)
# crouton-bookings - already correct
# crouton-sales - already correct

# Create new module
mkdir -p packages/crouton/src
```

#### 3. Update all package.json names

Use find/replace across all package.json files:

| Find | Replace |
|------|---------|
| `@fyit/crouton-` | `@fyit/crouton-` |
| `@fyit/crouton` | `@fyit/crouton-core` |
| `@fyit/crouton-` | `@fyit/crouton-` |

#### 4. Update pnpm-workspace.yaml

```yaml
packages:
  - 'packages/crouton'
  - 'packages/crouton-*'
  - 'apps/*'
```

---

### Phase 2: Create Unified Module (2 hours)

#### packages/crouton/package.json

```json
{
  "name": "@fyit/crouton",
  "version": "1.0.0",
  "description": "Unified Nuxt CRUD framework with opt-in features",
  "type": "module",
  "main": "./dist/module.mjs",
  "types": "./dist/module.d.ts",
  "exports": {
    ".": {
      "types": "./dist/module.d.ts",
      "import": "./dist/module.mjs"
    }
  },
  "scripts": {
    "build": "unbuild",
    "dev": "unbuild --stub"
  },
  "author": "FYIT",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/pmcp/nuxt-crouton.git",
    "directory": "packages/crouton"
  },
  "publishConfig": { "access": "public" },
  "dependencies": {
    "@nuxt/kit": "^3.15.0"
  },
  "peerDependencies": {
    "nuxt": "^4.0.0"
  }
}
```

#### packages/crouton/src/module.ts

```typescript
import { defineNuxtModule, installModule } from '@nuxt/kit'
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
    // Core add-ons (bundled)
    auth: true,
    admin: true,
    i18n: true,
    // Optional add-ons
    editor: false,
    flow: false,
    assets: false,
    maps: false,
    ai: false,
    email: false,
    events: false,
    collab: false,
    pages: false,
    devtools: undefined,
    // Mini-apps
    bookings: false,
    sales: false
  },

  async setup(options, nuxt) {
    // Set runtime config
    nuxt.options.runtimeConfig.public.crouton = {
      apiPrefix: options.apiPrefix,
      defaultPageSize: options.defaultPageSize
    }

    // Always extend core
    nuxt.options.extends ||= []
    nuxt.options.extends.push('@fyit/crouton-core')

    // Core add-ons (bundled, can be disabled)
    if (options.auth !== false) nuxt.options.extends.push('@fyit/crouton-auth')
    if (options.admin !== false) nuxt.options.extends.push('@fyit/crouton-admin')
    if (options.i18n !== false) nuxt.options.extends.push('@fyit/crouton-i18n')

    // Optional add-ons
    if (options.editor) nuxt.options.extends.push('@fyit/crouton-editor')
    if (options.flow) nuxt.options.extends.push('@fyit/crouton-flow')
    if (options.assets) nuxt.options.extends.push('@fyit/crouton-assets')
    if (options.maps) nuxt.options.extends.push('@fyit/crouton-maps')
    if (options.ai) nuxt.options.extends.push('@fyit/crouton-ai')
    if (options.email) nuxt.options.extends.push('@fyit/crouton-email')
    if (options.events) nuxt.options.extends.push('@fyit/crouton-events')
    if (options.collab) nuxt.options.extends.push('@fyit/crouton-collab')
    if (options.pages) nuxt.options.extends.push('@fyit/crouton-pages')

    // Devtools (default: true in dev)
    const enableDevtools = options.devtools ?? nuxt.options.dev
    if (enableDevtools) nuxt.options.extends.push('@fyit/crouton-devtools')

    // Mini-apps
    if (options.bookings) nuxt.options.extends.push('@fyit/crouton-bookings')
    if (options.sales) nuxt.options.extends.push('@fyit/crouton-sales')
  }
})
```

---

### Phase 3: Update CLI Module Registry (1 hour)

Update `packages/crouton-cli/lib/module-registry.mjs`:

```javascript
export const MODULES = {
  // Core add-ons
  auth: {
    package: '@fyit/crouton-auth',
    schemaExport: '@fyit/crouton-auth/server/database/schema/auth',
    description: 'Authentication with Better Auth',
    bundled: true
  },
  admin: {
    package: '@fyit/crouton-admin',
    schemaExport: null,
    description: 'Admin dashboard',
    bundled: true
  },
  i18n: {
    package: '@fyit/crouton-i18n',
    schemaExport: '@fyit/crouton-i18n/server/database/schema',
    description: 'Multi-language support',
    bundled: true
  },

  // Optional add-ons
  editor: {
    package: '@fyit/crouton-editor',
    schemaExport: null,
    description: 'Rich text editor'
  },
  flow: {
    package: '@fyit/crouton-flow',
    schemaExport: null,
    description: 'Vue Flow graphs'
  },
  assets: {
    package: '@fyit/crouton-assets',
    schemaExport: null,
    description: 'Asset management'
  },
  maps: {
    package: '@fyit/crouton-maps',
    schemaExport: null,
    description: 'Mapbox integration'
  },
  ai: {
    package: '@fyit/crouton-ai',
    schemaExport: null,
    description: 'AI integration'
  },
  email: {
    package: '@fyit/crouton-email',
    schemaExport: null,
    description: 'Email with Resend'
  },
  events: {
    package: '@fyit/crouton-events',
    schemaExport: null,
    description: 'Audit trail'
  },
  collab: {
    package: '@fyit/crouton-collab',
    schemaExport: null,
    description: 'Real-time collaboration'
  },
  pages: {
    package: '@fyit/crouton-pages',
    schemaExport: null,
    description: 'CMS pages'
  },
  devtools: {
    package: '@fyit/crouton-devtools',
    schemaExport: null,
    description: 'Nuxt DevTools'
  },

  // Tooling
  'schema-designer': {
    package: '@fyit/crouton-schema-designer',
    schemaExport: '@fyit/crouton-schema-designer/server/database/schema/schemaProjects',
    description: 'Visual schema designer'
  },
  themes: {
    package: '@fyit/crouton-themes',
    schemaExport: null,
    description: 'UI themes'
  },

  // Mini-apps
  bookings: {
    package: '@fyit/crouton-bookings',
    schemaExport: null,
    description: 'Booking system'
  },
  sales: {
    package: '@fyit/crouton-sales',
    schemaExport: null,
    description: 'POS system'
  }
}
```

---

### Phase 4: Update Internal References (2 hours)

Search and replace across entire codebase:

| Find | Replace |
|------|---------|
| `@fyit/crouton-auth` | `@fyit/crouton-auth` |
| `@fyit/crouton-admin` | `@fyit/crouton-admin` |
| `@fyit/crouton-i18n` | `@fyit/crouton-i18n` |
| `@fyit/crouton-editor` | `@fyit/crouton-editor` |
| `@fyit/crouton-flow` | `@fyit/crouton-flow` |
| `@fyit/crouton-assets` | `@fyit/crouton-assets` |
| `@fyit/crouton-devtools` | `@fyit/crouton-devtools` |
| `@fyit/crouton-maps` | `@fyit/crouton-maps` |
| `@fyit/crouton-ai` | `@fyit/crouton-ai` |
| `@fyit/crouton-email` | `@fyit/crouton-email` |
| `@fyit/crouton-events` | `@fyit/crouton-events` |
| `@fyit/crouton-collab` | `@fyit/crouton-collab` |
| `@fyit/crouton-pages` | `@fyit/crouton-pages` |
| `@fyit/crouton-cli` | `@fyit/crouton-cli` |
| `@fyit/crouton-schema-designer` | `@fyit/crouton-schema-designer` |
| `@fyit/crouton-themes` | `@fyit/crouton-themes` |
| `@fyit/crouton-mcp-server` | `@fyit/crouton-mcp` |
| `@fyit/crouton` | `@fyit/crouton-core` |
| `@fyit/crouton-bookings` | `@fyit/crouton-bookings` |
| `@fyit/crouton-sales` | `@fyit/crouton-sales` |

**Files to update:**
- All `package.json` files
- All `nuxt.config.ts` files
- All CLAUDE.md files
- All import statements in source code
- Documentation in `apps/docs`
- README files

---

### Phase 5: Build & Publish (1 hour)

```bash
# Reset all versions
pnpm -r exec npm version 1.0.0

# Build all packages
pnpm -r build

# Typecheck
pnpm -r typecheck

# Publish (order matters for dependencies)
# 1. Core first
cd packages/crouton-core && pnpm publish --access public
cd packages/crouton-cli && pnpm publish --access public

# 2. Bundled add-ons
cd packages/crouton-auth && pnpm publish --access public
cd packages/crouton-admin && pnpm publish --access public
cd packages/crouton-i18n && pnpm publish --access public

# 3. Optional add-ons
cd packages/crouton-editor && pnpm publish --access public
cd packages/crouton-flow && pnpm publish --access public
cd packages/crouton-assets && pnpm publish --access public
cd packages/crouton-devtools && pnpm publish --access public
cd packages/crouton-maps && pnpm publish --access public
cd packages/crouton-ai && pnpm publish --access public
cd packages/crouton-email && pnpm publish --access public
cd packages/crouton-events && pnpm publish --access public
cd packages/crouton-collab && pnpm publish --access public
cd packages/crouton-pages && pnpm publish --access public

# 4. Tooling
cd packages/crouton-schema-designer && pnpm publish --access public
cd packages/crouton-themes && pnpm publish --access public
cd packages/crouton-mcp && pnpm publish --access public

# 5. Mini-apps
cd packages/crouton-bookings && pnpm publish --access public
cd packages/crouton-sales && pnpm publish --access public

# 6. Unified module (last)
cd packages/crouton && pnpm publish --access public
```

---

### Phase 6: Deprecate Old Packages (30 min)

```bash
# Deprecate all old packages
npm deprecate "@fyit/crouton" "Moved to @fyit/crouton - see migration guide"
npm deprecate "@fyit/crouton-auth" "Moved to @fyit/crouton-auth"
npm deprecate "@fyit/crouton-admin" "Moved to @fyit/crouton-admin"
npm deprecate "@fyit/crouton-i18n" "Moved to @fyit/crouton-i18n"
npm deprecate "@fyit/crouton-editor" "Moved to @fyit/crouton-editor"
npm deprecate "@fyit/crouton-flow" "Moved to @fyit/crouton-flow"
npm deprecate "@fyit/crouton-assets" "Moved to @fyit/crouton-assets"
npm deprecate "@fyit/crouton-devtools" "Moved to @fyit/crouton-devtools"
npm deprecate "@fyit/crouton-maps" "Moved to @fyit/crouton-maps"
npm deprecate "@fyit/crouton-ai" "Moved to @fyit/crouton-ai"
npm deprecate "@fyit/crouton-email" "Moved to @fyit/crouton-email"
npm deprecate "@fyit/crouton-events" "Moved to @fyit/crouton-events"
npm deprecate "@fyit/crouton-collab" "Moved to @fyit/crouton-collab"
npm deprecate "@fyit/crouton-pages" "Moved to @fyit/crouton-pages"
npm deprecate "@fyit/crouton-cli" "Moved to @fyit/crouton-cli"
npm deprecate "@fyit/crouton-schema-designer" "Moved to @fyit/crouton-schema-designer"
npm deprecate "@fyit/crouton-themes" "Moved to @fyit/crouton-themes"
npm deprecate "@fyit/crouton-mcp-server" "Moved to @fyit/crouton-mcp"
npm deprecate "@fyit/crouton-bookings" "Moved to @fyit/crouton-bookings"
npm deprecate "@fyit/crouton-sales" "Moved to @fyit/crouton-sales"
```

---

### Phase 7: Update Documentation (1 hour)

- [ ] Update `apps/docs` with new package names
- [ ] Update all README files
- [ ] Update CLAUDE.md files
- [ ] Update playground/test apps
- [ ] Create migration guide page in docs

---

## Migration Guide (For Users)

### Quick Migration

```bash
# Remove old packages
pnpm remove @fyit/crouton @fyit/crouton-auth \
  @fyit/crouton-i18n @fyit/crouton-editor

# Install new unified module
pnpm add @fyit/crouton
```

### Update nuxt.config.ts

```diff
export default defineNuxtConfig({
-  extends: [
-    '@fyit/crouton',
-    '@fyit/crouton-auth',
-    '@fyit/crouton-i18n',
-    '@fyit/crouton-editor'
-  ]
+  modules: ['@fyit/crouton'],
+  crouton: {
+    // auth, admin, i18n are enabled by default
+    editor: true
+  }
})
```

### Alternative: Direct Layers

If you prefer explicit control:

```diff
export default defineNuxtConfig({
-  extends: [
-    '@fyit/crouton',
-    '@fyit/crouton-editor'
-  ]
+  extends: [
+    '@fyit/crouton-core',
+    '@fyit/crouton-auth',
+    '@fyit/crouton-i18n',
+    '@fyit/crouton-editor'
+  ]
})
```

### Update Imports

Search and replace in your codebase:

| Find | Replace |
|------|---------|
| `@fyit/crouton/` | `@fyit/crouton-core/` |
| `@fyit/crouton-auth/` | `@fyit/crouton-auth/` |
| `@fyit/crouton-bookings/` | `@fyit/crouton-bookings/` |

---

## Checklist

### Phase 0: Pre-Cleanup ✅
- [x] Standardize all author fields to "FYIT"
- [x] Standardize all repository URLs
- [x] Standardize all peer dependency versions

### Phase 1: Rename ✅
- [ ] Register @fyit npm org (BLOCKER for Phase 5)
- [x] Rename all 20 directories (`nuxt-crouton-*` → `crouton-*`)
- [x] Update all package.json names (`@fyit/crouton-*`)
- [x] Update pnpm-workspace.yaml

### Phase 2: Create Module ✅
- [x] Create packages/crouton directory
- [x] Implement module.ts (adds layers based on config)
- [x] Add types.ts (CroutonOptions interface)
- [x] Add build config (unbuild)

### Phase 3: Update CLI ✅
- [x] Update module-registry.mjs (all `@fyit/crouton-*` names)
- [x] Update install-modules.mjs (deprecated but updated)
- [x] Generated code templates already use correct imports

### Phase 4: Update References ✅
- [x] Update all nuxt.config.ts debug/meta strings
- [x] Update all CLAUDE.md files (already use new names)
- [x] Internal imports already updated

### Phase 5: Build & Publish (NOT STARTED)
- [x] Register @fyit npm org first!
- [x] Reset versions to 0.1.0
- [x] Build all packages
- [x] Run typecheck
- [x] Publish in dependency order

### Phase 6: Deprecate (NOT STARTED)
- [ ] Deprecate all old packages on npm (requires publish first)

### Phase 7: Documentation (NOT STARTED)
- [ ] Update docs site
- [ ] Update READMEs
- [ ] Create migration guide

---

## Commit Scopes (After Rename)

| Scope | Package |
|-------|---------|
| `crouton` | `@fyit/crouton` |
| `crouton-core` | `@fyit/crouton-core` |
| `crouton-cli` | `@fyit/crouton-cli` |
| `crouton-auth` | `@fyit/crouton-auth` |
| `crouton-admin` | `@fyit/crouton-admin` |
| `crouton-i18n` | `@fyit/crouton-i18n` |
| `crouton-editor` | `@fyit/crouton-editor` |
| `crouton-flow` | `@fyit/crouton-flow` |
| `crouton-assets` | `@fyit/crouton-assets` |
| `crouton-devtools` | `@fyit/crouton-devtools` |
| `crouton-maps` | `@fyit/crouton-maps` |
| `crouton-ai` | `@fyit/crouton-ai` |
| `crouton-email` | `@fyit/crouton-email` |
| `crouton-events` | `@fyit/crouton-events` |
| `crouton-collab` | `@fyit/crouton-collab` |
| `crouton-pages` | `@fyit/crouton-pages` |
| `crouton-schema-designer` | `@fyit/crouton-schema-designer` |
| `crouton-themes` | `@fyit/crouton-themes` |
| `crouton-mcp` | `@fyit/crouton-mcp` |
| `crouton-bookings` | `@fyit/crouton-bookings` |
| `crouton-sales` | `@fyit/crouton-sales` |
| `docs` | `apps/docs` |
| `playground` | `apps/playground` |
| `root` | workspace-level |

---

## Future

The `@fyit` namespace accommodates future tools:

```
@fyit/crouton          # This project
@fyit/thinkgraph       # Future graph tool
@fyit/[other-tools]    # Other FYIT projects
```

---

## Risk Mitigation

1. **Breaking changes**: All old packages will be deprecated with migration message
2. **Version conflicts**: Start fresh at 1.0.0 for all packages
3. **Missing packages**: Checklist ensures all 20 packages are migrated
4. **Internal references**: Automated find/replace with manual verification
5. **Documentation drift**: Update docs as part of same PR

---

## Time Estimate

| Phase | Time |
|-------|------|
| Phase 0: Pre-Cleanup | 1 hour |
| Phase 1: Rename | 2 hours |
| Phase 2: Create Module | 2 hours |
| Phase 3: Update CLI | 1 hour |
| Phase 4: Update References | 2 hours |
| Phase 5: Build & Publish | 1 hour |
| Phase 6: Deprecate | 30 min |
| Phase 7: Documentation | 1 hour |
| **Total** | **~10 hours** |

Can be done in 1-2 days with focused effort.