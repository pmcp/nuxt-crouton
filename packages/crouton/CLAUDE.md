# CLAUDE.md - @fyit/crouton

## Package Purpose

Unified Nuxt module that aggregates all Crouton packages into a single entry point with opt-in features. This is the main package users install to use the Crouton ecosystem. It automatically includes core features (auth, admin, i18n) and allows enabling optional add-ons via configuration.

## Key Files

| File | Purpose |
|------|---------|
| `src/module.ts` | Nuxt module entry point, adds layers based on config |
| `src/types.ts` | `CroutonOptions` type definition |
| `build.config.ts` | Unbuild configuration |

## Architecture

```
@fyit/crouton (this module)
    │
    ├── Always includes:
    │   └── @fyit/crouton-core (base CRUD layer)
    │
    ├── Core add-ons (enabled by default):
    │   ├── @fyit/crouton-auth (authentication)
    │   ├── @fyit/crouton-admin (admin dashboard)
    │   └── @fyit/crouton-i18n (translations)
    │
    ├── Optional add-ons (disabled by default):
    │   ├── @fyit/crouton-editor (TipTap)
    │   ├── @fyit/crouton-flow (Vue Flow)
    │   ├── @fyit/crouton-assets (media library)
    │   ├── @fyit/crouton-maps (Mapbox)
    │   ├── @fyit/crouton-ai (LLM integration)
    │   ├── @fyit/crouton-email (Vue Email)
    │   ├── @fyit/crouton-events (audit trail)
    │   ├── @fyit/crouton-collab (real-time)
    │   ├── @fyit/crouton-pages (CMS)
    │   └── @fyit/crouton-devtools (dev only)
    │
    └── Mini-apps (disabled by default):
        ├── @fyit/crouton-bookings
        └── @fyit/crouton-sales
```

## Configuration

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@fyit/crouton'],

  crouton: {
    // Global settings
    apiPrefix: '/api',      // Default: '/api'
    defaultPageSize: 20,    // Default: 20

    // Core add-ons (enabled by default, can disable)
    auth: true,             // Better Auth with teams
    admin: true,            // Admin dashboard
    i18n: true,             // Multi-language support

    // Optional add-ons (disabled by default)
    editor: false,          // TipTap rich text
    flow: false,            // Vue Flow graphs
    assets: false,          // Media library
    maps: false,            // Mapbox integration
    ai: false,              // AI/LLM integration
    email: false,           // Email with Resend
    events: false,          // Audit trail
    collab: false,          // Real-time collaboration
    pages: false,           // CMS pages
    devtools: undefined,    // Auto-detect (dev mode)

    // Mini-apps (disabled by default)
    bookings: false,        // Booking system
    sales: false            // Point of Sale
  }
})
```

## Usage Examples

### Minimal Setup (Core Features)

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@fyit/crouton']
  // Gets: core, auth, admin, i18n automatically
})
```

### Full-Featured App

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@fyit/crouton'],

  crouton: {
    editor: true,
    assets: true,
    events: true,
    pages: true
  }
})
```

### Booking Application

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@fyit/crouton'],

  crouton: {
    bookings: true,
    email: true
  }
})
```

### Disable Core Features

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@fyit/crouton'],

  crouton: {
    auth: false,   // Use your own auth
    admin: false,  // No admin UI
    i18n: false    // No translations
  }
})
```

## How It Works

1. Module registers with Nuxt using `defineNuxtModule`
2. On setup, it adds `@fyit/crouton-core` to `nuxt.options.extends`
3. Based on options, it conditionally adds other package layers
4. Each added layer brings its own composables, components, and server utilities
5. Layers are resolved by Nuxt's layer system, allowing overrides

## Runtime Config

The module sets these runtime config values:

```typescript
// Accessible via useRuntimeConfig()
runtimeConfig.public.crouton = {
  apiPrefix: '/api',
  defaultPageSize: 20
}
```

## Common Tasks

### Check enabled features (dev mode)

Console logs enabled features on startup:
```
[crouton] Enabled features: core, auth, admin, i18n, editor
```

### Add a new feature package

1. Create the feature package in `packages/crouton-{name}/`
2. Add option to `CroutonOptions` in `src/types.ts`
3. Add layer in `src/module.ts` setup function
4. Update defaults in module definition

### Override a feature

Create same-named files in your app's directories. Nuxt's layer system will use your version over the package's.

## Types

```typescript
interface CroutonOptions {
  // Global settings
  apiPrefix?: string           // '/api'
  defaultPageSize?: number     // 20

  // Core add-ons (default: true)
  auth?: boolean
  admin?: boolean
  i18n?: boolean

  // Optional add-ons (default: false)
  editor?: boolean
  flow?: boolean
  assets?: boolean
  maps?: boolean
  ai?: boolean
  email?: boolean
  events?: boolean
  collab?: boolean
  pages?: boolean
  devtools?: boolean          // Auto-detect in dev

  // Mini-apps (default: false)
  bookings?: boolean
  sales?: boolean
}
```

## Dependencies

- **Core dep**: `@nuxt/kit` (for module definition)
- **Peer dep**: `nuxt ^4.0.0`
- **Includes at runtime**: Various `@fyit/crouton-*` packages based on config

## Testing

```bash
pnpm build        # Build module
npx nuxt typecheck # Verify types
```

## Naming Conventions

- Module config key: `crouton`
- Package scope: `@fyit/crouton*`
- Layer packages: `@fyit/crouton-{feature}`
