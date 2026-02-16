# Briefing: nuxt-crouton-email Build Issue

**Date**: 2026-01-11
**Package**: `@fyit/crouton-email`
**Status**: Blocked - Cannot be used in consuming apps

## Problem Summary

When adding `@fyit/crouton-email` to a consuming app (test-bookings), the Nitro build fails with:

```
ERROR  RollupError: ../../packages/nuxt-crouton-email/server/emails/Verification.vue (1:0):
Expression expected (Note that you need plugins to import files that are not JavaScript)

1: <script setup lang="ts">
   ^
2: import { EText, ESection } from 'vue-email'
3: import BaseLayout from './BaseLayout.vue'
```

## Root Cause

Vue Email templates (`.vue` files in `server/emails/`) are not being compiled by Nitro's bundler. Nitro/Rollup treats them as raw files instead of Vue SFCs.

### Additional Issues

1. **Alias resolution failure**:
   ```
   Could not resolve import "#crouton-email/server/utils/email" in
   packages/crouton-bookings/server/utils/booking-emails.ts
   ```

2. **Duplicated imports warning**:
   ```
   Duplicated imports "renderEmailTemplate", the one from crouton-bookings
   has been ignored and nuxt-crouton-email is used
   ```

## Affected Files

| File | Issue |
|------|-------|
| `server/emails/Verification.vue` | Not compiled |
| `server/emails/PasswordReset.vue` | Not compiled |
| `server/emails/MagicLink.vue` | Not compiled |
| `server/emails/Welcome.vue` | Not compiled |
| `server/emails/TeamInvite.vue` | Not compiled |
| `server/emails/BaseLayout.vue` | Not compiled |

## Technical Context

### How vue-email Works

`vue-email` uses Vue SFCs as email templates and renders them server-side via `useRender()`:

```typescript
import { useRender } from 'vue-email'
import VerificationTemplate from '../emails/Verification.vue'

const { html, text } = await useRender(VerificationTemplate, { props })
```

### The Problem

Nitro doesn't know how to handle `.vue` files in server context. Unlike the app side (Vite), server builds use Rollup which lacks Vue SFC compilation by default.

## Potential Solutions

### Option 1: Pre-compile Templates (Recommended)

Pre-compile Vue Email templates to JS during package build:

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  nitro: {
    rollupConfig: {
      plugins: [
        // Add Vue plugin for server build
        vue()
      ]
    }
  }
})
```

Or use a build step to compile templates:

```bash
# In package.json scripts
"build:emails": "vite build --config vite.emails.config.ts"
```

### Option 2: Use String Templates Instead

Replace Vue SFCs with plain TypeScript template functions:

```typescript
// server/emails/verification.ts
export function renderVerificationEmail(props: { code: string, name: string }) {
  return `
    <html>
      <body>
        <h1>Verify your email</h1>
        <p>Hi ${props.name}, your code is: <strong>${props.code}</strong></p>
      </body>
    </html>
  `
}
```

**Pros**: Simple, no build issues
**Cons**: Loses Vue Email's component model and styling helpers

### Option 3: Use react-email Instead

`react-email` has better server-side support than `vue-email`. Consider switching if Vue Email continues to have issues.

### Option 4: External Email Service

Move email rendering to an external service or edge function that can compile Vue templates.

## Recommended Approach

**Option 1** with Nitro rollup config is the cleanest solution:

1. Add `@vitejs/plugin-vue` to the email package
2. Configure Nitro to use it for `.vue` files in server context
3. Test with test-bookings

```typescript
// packages/nuxt-crouton-email/nuxt.config.ts
import vue from '@vitejs/plugin-vue'

export default defineNuxtConfig({
  nitro: {
    rollupConfig: {
      plugins: [vue()]
    }
  }
})
```

## Also Fix: Alias Resolution

The `#crouton-email` alias used in `crouton-bookings` needs to be defined:

```typescript
// packages/nuxt-crouton-email/nuxt.config.ts
export default defineNuxtConfig({
  alias: {
    '#crouton-email': fileURLToPath(new URL('./', import.meta.url))
  }
})
```

## Dependencies to Check

- `vue-email`: ^0.8.0 - Check if newer versions have Nitro support
- `@vitejs/plugin-vue`: Add as devDependency
- `rollup`: Check Nitro's version compatibility

## Next Steps

1. [ ] Add `@vitejs/plugin-vue` to email package devDeps
2. [ ] Configure Nitro rollupConfig with Vue plugin
3. [ ] Add `#crouton-email` alias to nuxt.config.ts
4. [ ] Remove duplicate `renderEmailTemplate` from crouton-bookings
5. [ ] Test with test-bookings app
6. [ ] Run `npx nuxt typecheck` to verify

## References

- [vue-email docs](https://vue-email.com/)
- [Nitro rollup config](https://nitro.unjs.io/config#rollupconfig)
- [Nuxt layers](https://nuxt.com/docs/guide/going-further/layers)
