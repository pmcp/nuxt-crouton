# Tenant Mode Simplification

**Status**: ✅ Complete
**Started**: 2025-12-22
**Completed**: 2025-12-22

## Summary

Remove the 3-mode architecture (`multi-tenant`, `single-tenant`, `personal`) and replace with a unified "everything is a team" model. Configuration flags control behavior instead of discrete modes.

## Key Decision

**Always use `[team]` in routes** - industry standard (Linear, Notion, Vercel, GitHub all do this).

## Configuration Mapping

| Old Mode | New Configuration |
|----------|-------------------|
| `multi-tenant` | `{ teams: { allowCreate: true, showSwitcher: true } }` |
| `single-tenant` | `{ teams: { defaultTeamSlug: 'acme', allowCreate: false, showSwitcher: false } }` |
| `personal` | `{ teams: { autoCreateOnSignup: true, allowCreate: false, showSwitcher: false } }` |

## New TeamsConfig Flags

```typescript
interface TeamsConfig {
  // NEW FLAGS (replace mode)
  autoCreateOnSignup?: boolean  // Auto-create personal workspace on signup
  defaultTeamSlug?: string      // Everyone joins this team on signup

  // BEHAVIOR FLAGS
  allowCreate?: boolean         // Can create additional teams (default: true)
  showSwitcher?: boolean        // Show team switcher UI (default: true)
  showManagement?: boolean      // Show team management UI (default: true)
  limit?: number                // Max teams per user (default: 0 = unlimited)
}
```

---

## Progress Tracker

### Phase 1: Type Changes
**Status**: ✅ Complete

**Files Modified**:
- [x] `packages/nuxt-crouton-auth/types/config.ts`
  - [x] Updated file header comment
  - [x] Added new flags to TeamsConfig (autoCreateOnSignup, defaultTeamSlug, showSwitcher, showManagement)
  - [x] Removed `mode` and `defaultTeamId` from CroutonAuthConfig
  - [x] Added deprecated AuthMode type with migration guide

---

### Phase 2: Module Entry Point
**Status**: ✅ Complete

**Files Modified**:
- [x] `packages/nuxt-crouton-auth/module.ts`
  - [x] Updated defaults (removed mode, added new team flags)
  - [x] Updated validateConfig (removed mode validation, added flag-based warnings)
  - [x] Removed applyModeDefaults function
  - [x] Updated plugin loading (team-init instead of single-tenant-init)
  - [x] Removed route alias logic (always use [team] in routes)
  - [x] Updated debug logging
  - [x] Removed unused NuxtPage import

---

### Phase 3: Server-Side
**Status**: ✅ Complete

**Files Modified**:

#### 3.1 Create team-init plugin
- [x] `packages/nuxt-crouton-auth/server/plugins/team-init.ts` (NEW)
  - Created new plugin that logs team configuration on startup
  - Handles both `autoCreateOnSignup` and `defaultTeamSlug`
  - Actual team creation is lazy (in database hooks)

#### 3.2 Update auth.ts (main file)
- [x] `packages/nuxt-crouton-auth/server/lib/auth.ts`
  - [x] Updated `buildDatabaseHooks` to use flags instead of mode
  - [x] Added `getOrgBySlug` helper function
  - [x] Updated `ensureDefaultOrgExists` to use slug-based lookup
  - [x] Updated `addUserToDefaultOrg` to use slug-based lookup
  - [x] Updated `buildStripePluginConfig` - always use 'organization' billing
  - [x] Updated `getBillingInfo` - always return 'organization' billingMode
  - [x] Updated `buildOrganizationConfig` - flag-based allowCreate and limits
  - [x] Updated `buildOrganizationHooks` - removed mode references
  - [x] Updated section comment headers

#### 3.3 Update server middleware
- [x] `packages/nuxt-crouton-auth/server/middleware/team-context.ts`
  - Removed mode switch statement
  - Unified team resolution from URL param or session
  - Removed `authMode` from H3EventContext

#### 3.4 Delete old plugin
- [x] DELETED `packages/nuxt-crouton-auth/server/plugins/single-tenant-init.ts`

---

### Phase 4: Client Composables
**Status**: ✅ Complete

**Files Modified**:

#### 4.1 useTeam.ts
- [x] `packages/nuxt-crouton-auth/app/composables/useTeam.ts`
  - [x] `showTeamSwitcher`: now checks `config.teams.showSwitcher`
  - [x] `showTeamManagement`: now checks `config.teams.showManagement`
  - [x] `canCreateTeam`: now checks `config.teams.allowCreate` and limit (0 = unlimited)

#### 4.2 useTeamContext.ts
- [x] `packages/nuxt-crouton-auth/app/composables/useTeamContext.ts`
  - [x] Removed all mode checks
  - [x] `useTeamInUrl` always returns `true`
  - [x] Unified resolution: URL param first, then session's active org

#### 4.3 useBilling.ts
- [x] `packages/nuxt-crouton-auth/app/composables/useBilling.ts`
  - [x] `billingMode` always returns `'organization'`
  - [x] Removed user billing check

#### 4.4 Client middleware
- [x] `packages/nuxt-crouton-auth/app/middleware/team-context.global.ts`
  - Removed mode switch statement
  - Unified resolution with single `resolveTeamContext` function

#### 4.5 Additional files updated
- [x] `packages/nuxt-crouton-auth/app/composables/useAuth.ts` - Updated refreshWithOrgRetry
- [x] `packages/nuxt-crouton-auth/app/composables/useAuthConfig.ts` - Deprecated useAuthMode
- [x] `packages/nuxt-crouton-auth/app/plugins/team-context.ts` - Removed mode from context
- [x] `packages/nuxt-crouton-auth/app/components/Team/Switcher.vue` - Updated showSwitcher
- [x] `packages/nuxt-crouton-auth/server/utils/team.ts` - Updated canUserCreateTeam, getOrCreateDefaultOrganization
- [x] `packages/nuxt-crouton-auth/server/plugins/auth-init.ts` - Updated logging
- [x] `packages/nuxt-crouton-auth/nuxt.config.ts` - Removed mode from defaults
- [x] `packages/nuxt-crouton/app/layouts/dashboard.vue` - Updated showSwitcher check

---

### Phase 5: Database Schema
**Status**: ✅ Complete

**Files Reviewed**:
- [x] `packages/nuxt-crouton-auth/server/database/schema/auth.ts`
  - KEPT `personal`, `isDefault`, `ownerId` columns (still useful)
  - Updated comments to reflect new flag-based approach

**Decision**: No migration needed, comments updated.

---

### Phase 6: Examples
**Status**: ✅ Complete

**Files Modified**:
- [x] DELETED `packages/nuxt-crouton-auth/examples/personal/`
- [x] DELETED `packages/nuxt-crouton-auth/examples/single-tenant/`
- [x] DELETED `packages/nuxt-crouton-auth/examples/multi-tenant/`
- [x] CREATED `packages/nuxt-crouton-auth/examples/nuxt.config.ts` showing all patterns

---

### Phase 7: Tests
**Status**: ✅ Complete

**Files Modified**:
- [x] `packages/nuxt-crouton-auth/tests/integration/auth-registration.test.ts`
  - Updated test names and configs
  - "Multi-Tenant Mode" → "Team Creation Enabled"
  - "Personal Mode" → "Auto-Create Workspace"
  - "Single-Tenant Mode" → "Default Team"
- [x] `packages/nuxt-crouton/app/composables/__tests__/useTeamContext.test.ts`
  - Removed mode references from mocks
  - Updated useTeamInUrl tests (always returns true now)

---

### Phase 8: Documentation
**Status**: ✅ Complete

**Files Modified**:
- [x] `packages/nuxt-crouton-auth/CLAUDE.md`
  - Updated "Operational Modes" → "Configuration Patterns"
  - Added TeamsConfig Flags table
  - Updated configuration examples
- [x] `apps/docs/content/2.fundamentals/7.packages.md` - Updated config examples
- [x] `apps/docs/content/6.features/14.admin.md` - Updated config examples
- [x] `packages/nuxt-crouton/app/composables/useTeamContext.ts` - Removed mode check

---

## Breaking Changes

| Change | Migration |
|--------|-----------|
| `mode` removed | Use `teams` config flags |
| `defaultTeamId` removed | Use `teams.defaultTeamSlug` |
| Route aliases removed | Always use `/dashboard/[team]/...` |
| `billingMode: 'user'` removed | Always org-based (personal = org with 1 member) |

---

## How to Continue

1. Read this tracker to understand current state
2. Pick the next incomplete phase
3. Follow the checklist for that phase
4. Update this tracker when done
5. Run `npx nuxt typecheck` after each phase

---

## Notes

- Keep the deprecated `AuthMode` type for backwards compatibility during migration
- The `personal`, `isDefault`, `ownerId` columns in the database are still useful for queries
- Billing is always org-based now (personal workspace = org with 1 member)
