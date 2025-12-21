# Setting Up a Crouton Project

A guide for setting up NuxtHub + Crouton from scratch, based on real-world testing.

---

## Quick Start (9 Steps)

### 1. Create Fresh Nuxt Project

```bash
npx nuxi@latest init my-app --template minimal
cd my-app
npx nuxi module add @nuxthub/core
pnpm add drizzle-orm @libsql/client
pnpm add -D drizzle-kit
```

### 2. Add Crouton Dependencies

```json
{
  "dependencies": {
    "@friendlyinternet/nuxt-crouton": "workspace:*",
    "@friendlyinternet/nuxt-crouton-auth": "workspace:*",
    "@nuxthub/core": "^0.10.0",
    "@nuxt/ui": "^4.0.0",
    "@libsql/client": "^0.15.0",
    "drizzle-orm": "^0.45.0"
  },
  "devDependencies": {
    "@friendlyinternet/nuxt-crouton-cli": "workspace:*",
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
  extends: [
    '@friendlyinternet/nuxt-crouton',
    '@friendlyinternet/nuxt-crouton-auth'
  ],
  modules: ['@nuxthub/core', '@nuxt/ui'],
  hub: { db: 'sqlite' }
})
```

### 4. Update app.vue

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

@source "../../../node_modules/@friendlyinternet/nuxt-crouton/app/components/**/*.vue";
@source "../../../node_modules/@friendlyinternet/nuxt-crouton-auth/app/components/**/*.vue";
```

### 6. Add Environment Variables

```bash
echo "BETTER_AUTH_SECRET=$(openssl rand -base64 32)" > .env
```

### 7. Generate a Collection

Create `crouton.config.js`:

```javascript
export default {
  collections: [
    { name: 'posts', fieldsFile: './schemas/posts.json' }
  ],
  targets: [
    { layer: 'blog', collections: ['posts'] }
  ],
  dialect: 'sqlite',
  flags: { useMetadata: true }
}
```

Create `schemas/posts.json` and run:

```bash
pnpm crouton config
```

### 8. Run Database Migrations

```bash
npx nuxt db generate
npx nuxt db migrate
```

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
| CSS file creation | Create main.css with @source directives | `crouton init` could generate this |
| Environment variables | Generate and add BETTER_AUTH_SECRET | CLI could generate .env with secrets |
| Schema JSON files | Define field structures manually | Could add interactive schema builder |

---

## What Was Difficult

### 1. Nuxt UI Version Confusion
The auth pages use Nuxt UI v4 components (`UAuthForm`, `UPageCard`) that don't exist in v3. Easy to accidentally install v3 and get cryptic component resolution errors.

**Solution**: Always specify `@nuxt/ui@^4.0.0` explicitly.

### 2. Stale .nuxt Cache
When switching package versions, `.nuxt/components.d.ts` caches old component paths, causing resolution failures even after updating package.json.

**Solution**: Delete `.nuxt` folder and run `nuxt prepare` when changing major versions.

### 3. Route Transformation for Personal Mode
In personal/single-tenant mode, routes should transform from `/dashboard/:team/...` to `/dashboard/...`. Vue Router 4 uses `:team()` syntax (with parentheses) which the regex wasn't handling.

**Solution**: Fixed in crouton-auth module - now handles both `:team` and `:team()` patterns.

### 4. Understanding Auth Modes
The difference between multi-tenant, single-tenant, and personal modes wasn't immediately clear:
- **Multi-tenant**: Multiple teams, user switches between them
- **Single-tenant**: One shared team for all users
- **Personal**: Each user gets their own private workspace

**Solution**: Default is personal mode, which works for most simple apps.

---

## Key Learnings

1. **Use NuxtHub v0.10+ with `hub: { db: 'sqlite' }`** - Avoids wrangler/Cloudflare dependencies for local dev

2. **Layer-based architecture works well** - Collections generate into layers, keeping concerns separated

3. **The generator is reliable** - Config-based generation with `pnpm crouton config` handles schema, components, and API routes

4. **Personal mode is the simplest auth setup** - Auto-creates one team per user, no team switching needed

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

## Remaining Open Issues

| Issue | Notes |
|-------|-------|
| `useDB` auto-import conflicts | Auth layer's `useDB` can override local ones |
| No default index page | Fresh project has no `/` route |
| drizzle-seed incompatibility | Use direct SQL inserts instead |