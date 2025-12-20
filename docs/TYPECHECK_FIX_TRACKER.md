# TypeScript Error Fix Tracker

**Goal**: Fix all typecheck errors to achieve clean `npx nuxt typecheck`

## Quick Stats

| Metric | Value |
|--------|-------|
| Total Errors (Initial) | 1792 |
| Errors After Phase 1-6 | 363 |
| Errors Fixed | ~1429 (80%) |
| Phases Complete | 6/9 |

---

## Completed Phases

### Phase 1: Generate Package Types ✅

**Status**: ✅ Complete

Ran `nuxi prepare` in all 12 Nuxt layer packages and all apps.

### Phase 1.2: Fix tsconfig.json Files ✅

**Status**: ✅ Complete

Fixed 3 packages to extend `.nuxt/tsconfig.json`:
- `packages/nuxt-crouton-auth/tsconfig.json`
- `packages/nuxt-crouton-ai/tsconfig.json`
- `packages/nuxt-crouton-email/tsconfig.json`

### Phase 2: Better Auth Client Types ✅

**Status**: ✅ Complete

Created `packages/nuxt-crouton-auth/types/auth-client.ts`:
- `CroutonAuthClient` type inferred from plugin configuration
- `useAuthClient()` helper for non-null access
- `useAuthClientSafe()` helper for nullable access (SSR-safe)
- Module augmentation for NuxtApp

### Phase 3: Runtime Config Type Augmentation ✅

**Status**: ✅ Complete

Created `packages/nuxt-crouton-auth/types/nuxt.d.ts`:
- Augments `nuxt/schema` with `CroutonAuthConfig` types
- Created `useAuthConfig()` composable for type-safe config access

### Phase 5: Align useTeamContext ✅

**Status**: ✅ Complete

Updated `packages/nuxt-crouton/app/composables/useTeamContext.ts`:
- Added `buildDashboardUrl()` method
- Added `buildApiUrl()` method
- Added `hasTeamContext` and `useTeamInUrl` computed refs

### Phase 6: Fix Better Auth Hook Patterns ✅

**Status**: ✅ Complete

Better Auth 1.4.x uses nanostores - hooks are Atoms, not functions.

Fixed in `useSession.ts` and `useTeam.ts`:
- Changed from `authClient.useSession()` to `authClient.useSession.value?.data`
- Added proper null checks for SSR safety

---

## Remaining Work

### Phase 7: Fix Better Auth API Name Changes

**Status**: 🔲 In Progress (~20 errors)

Better Auth 1.4.x has renamed several methods:

| Old Name | New Name | Files Affected |
|----------|----------|----------------|
| `forgetPassword` | `resetPassword` | `useAuth.ts` |
| `getTOTPURI` | `getTotpUri` | `useAuth.ts` |
| `viewBackupCodes` | ??? (removed?) | `useAuth.ts` |
| `magicLink.send` | ??? | `magic-link.vue` |

Organization API changes:
- `organizationId` parameter moved to `query` object in `listMembers`
- `listInvitations` returns array directly, not `{ invitations: [...] }`

### Phase 8: Add NuxtHub Global Types

**Status**: 🔲 Not Started (~10 errors)

| Task | Status | File |
|------|--------|------|
| [ ] Create env.d.ts for NuxtHub types | 🔲 | `packages/nuxt-crouton/env.d.ts` |
| [ ] Declare `hubDatabase` and `D1Database` | 🔲 | |

### Phase 9: Fix Stripe Plugin Types

**Status**: 🔲 Not Started (~15 errors)

Stripe plugin in Better Auth 1.4.x has breaking changes:
- `stripeClient` options format changed
- Plan type mismatch (`StripePluginPlan` vs `StripePlan`)
- `createStripeCustomer` callback signature changed
- API version mismatch (`2025-04-30.basil` vs `2025-02-24.acacia`)

### Other Remaining Errors

| Category | Approx Count | Notes |
|----------|-------------|-------|
| Component slot types | ~50 | `item` not on slot scope |
| Server middleware types | ~20 | H3 event type mismatches |
| Two-factor types | ~15 | TOTP digits type mismatch |
| Collection component | ~30 | Various type issues |

---

## Files Created/Modified This Session

### New Files
- `packages/nuxt-crouton-auth/types/auth-client.ts`
- `packages/nuxt-crouton-auth/types/nuxt.d.ts`
- `packages/nuxt-crouton-auth/app/composables/useAuthConfig.ts`

### Modified Files
- `packages/nuxt-crouton-auth/types/index.ts` - Added auth-client exports
- `packages/nuxt-crouton-auth/app/composables/useSession.ts` - Fixed atom access
- `packages/nuxt-crouton-auth/app/composables/useTeam.ts` - Fixed atom access
- `packages/nuxt-crouton-auth/app/composables/useAuth.ts` - Use useAuthConfig()
- `packages/nuxt-crouton-auth/app/composables/useTeamContext.ts` - Use useAuthConfig()
- `packages/nuxt-crouton-auth/app/composables/useBilling.ts` - Use useAuthConfig()
- `packages/nuxt-crouton-auth/app/middleware/*.ts` - Use useAuthConfig()
- `packages/nuxt-crouton-auth/app/plugins/*.ts` - Fixed config access
- `packages/nuxt-crouton/app/composables/useTeamContext.ts` - Added buildDashboardUrl()

---

## Verification Commands

```bash
# Run typecheck from test app (recommended)
cd apps/test && npx nuxt typecheck

# Count errors
npx nuxt typecheck 2>&1 | grep -c "error TS"

# Prepare types for a package
cd packages/nuxt-crouton-auth && npx nuxi prepare
```

---

## Key Learnings

1. **Better Auth 1.4.x Breaking Changes**:
   - Hooks are now nanostores Atoms, not functions
   - Access via `.value?.data` instead of calling as function
   - Several API methods renamed (camelCase changes)
   - Organization plugin API structure changed

2. **Runtime Config Type Safety**:
   - Nuxt serializes config, losing type specificity
   - Use module augmentation + helper composable for proper typing
   - Cast through `unknown` for plugins where composables unavailable

3. **Monorepo Auto-Import Resolution**:
   - When multiple packages export same composable name, order matters
   - Updated `nuxt-crouton`'s `useTeamContext` to include auth-compatible API
