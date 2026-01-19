# Test Bookings App Setup Report

**Date**: 2024-12-22
**Purpose**: Track difficulties and learnings while setting up test-bookings app

---

## Summary

Creating a fresh test-bookings app to dogfood the `@fyit/crouton-bookings` package.

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
- **Description**: `@fyit/crouton-ai@workspace:*` referenced but excluded from pnpm-workspace.yaml
- **Resolution**: User added package back to workspace
- **Time spent**: 2 min

### Issue #3: teamMembers table not found
- **Description**: Schema used `refTarget: "teamMembers"` but auth package exports `member` table
- **Resolution**: Changed schema to use `refTarget: "member"` and regenerated
- **Time spent**: 3 min

### Issue #4: crouton-email module warning
- **Description**: `#crouton-email/server/utils/email` import warning in crouton-bookings package
- **Resolution**: Expected - email module is optional. Works without it.
- **Time spent**: 0 (just a warning)

---

## Configuration Used

### nuxt.config.ts
```ts
extends: [
  '@fyit/crouton',
  '@fyit/crouton-auth',
  '@fyit/crouton-bookings',
  './layers/bookings'
]
```

### crouton.config.js
```js
export default {
  collections: [
    { name: 'locations', fieldsFile: './schemas/location.json', sortable: true, translatable: true },
    { name: 'bookings', fieldsFile: './schemas/booking.json' },
    { name: 'settings', fieldsFile: './schemas/settings.json' }
  ],
  targets: [
    { layer: 'bookings', collections: ['locations', 'bookings', 'settings'] }
  ],
  dialect: 'sqlite',
  flags: { useMetadata: true, force: true }
}
```

---

## Lessons Learned

1. **Auth env var**: Use `BETTER_AUTH_SECRET` not `NUXT_AUTH_PASSWORD`
2. **Schema refTarget must match actual table names**: Use `member` not `teamMembers` (matches auth package export)
3. **Layer type errors are expected**: Generated layers have typecheck errors due to auto-import context, but runtime works
4. **crouton-email is optional**: The warning about missing email module is expected when not using email features

---

## Final Status

- [x] App skeleton created
- [x] Schemas copied
- [x] Collections generated
- [x] Migrations run
- [x] Dev server starts (with expected crouton-email warning)
- [ ] Typecheck passes (layer type issues exist but runtime works)

---

## Notes

- The `crouton-bookings` package expects tables prefixed with `bookings` (e.g., `bookingsBookings`, `bookingsLocations`)
- Layer name must be `bookings` to match table naming convention