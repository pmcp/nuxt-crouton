# Test Bookings App Setup Report

**Date**: 2024-12-22
**Purpose**: Track difficulties and learnings while setting up test-bookings app

---

## Summary

Creating a fresh test-bookings app to dogfood the `@friendlyinternet/crouton-bookings` package.

---

## Steps Completed

1. **Removed old test-bookings app** - Full cleanup of previous attempt
2. **Created app skeleton** - package.json, nuxt.config.ts, main.css, index.vue

---

## Difficulties Encountered

### Issue #1: Wrong env var for auth
- **Description**: Initially used `NUXT_AUTH_PASSWORD` but the auth package uses `BETTER_AUTH_SECRET`
- **Resolution**: Updated .env to use `BETTER_AUTH_SECRET`
- **Time spent**: 1 min

### Issue #2: pnpm install fails with workspace package not found
- **Description**: `@friendlyinternet/nuxt-crouton-ai@workspace:*` referenced in nuxt-crouton-schema-designer but pnpm fails to resolve
- **Resolution**: TBD - investigating
- **Time spent**: TBD

---

## Configuration Used

### nuxt.config.ts
```ts
extends: [
  '@friendlyinternet/nuxt-crouton',
  '@friendlyinternet/nuxt-crouton-auth',
  '@friendlyinternet/crouton-bookings',
  './layers/bookings'
]
```

### crouton.config.js
```js
// Will be added after creation
```

---

## Lessons Learned

1. TBD

---

## Final Status

- [ ] App skeleton created
- [ ] Schemas copied
- [ ] Collections generated
- [ ] Migrations run
- [ ] Typecheck passes
- [ ] Dev server starts

---

## Notes

- The `crouton-bookings` package expects tables prefixed with `bookings` (e.g., `bookingsBookings`, `bookingsLocations`)
- Layer name must be `bookings` to match table naming convention