# Team Architecture Consolidation Analysis

**Date**: 2024-12-17
**Status**: Analysis Complete
**Author**: Claude Code (Opus 4.5)

---

## Executive Summary

This report analyzes the team-based authentication architecture across all nuxt-crouton packages in preparation for consolidating on `@crouton/auth` as the single source of truth.

**Key Findings**:
1. **Significant duplication** exists between `nuxt-crouton` core and `@crouton/auth`
2. **The generator creates a third copy** of team-auth utilities per layer
3. **Most packages have inconsistent team resolution** patterns
4. **The `useTeamUtility` flag should be deprecated** in favor of mandatory team-scoping

---

## Package-by-Package Analysis

### 1. @crouton/auth (Source of Truth)

**Location**: `/Users/pmcp/Projects/crouton-bookings/packages/crouton-auth`

**Architecture**: Mode-aware (multi-tenant, single-tenant, personal) with Better Auth integration

| Component | File | Description |
|-----------|------|-------------|
| Server Utils | `server/utils/team.ts` | Mode-aware `resolveTeamAndCheckMembership()`, role-based access (`requireTeamAdmin()`, `requireTeamOwner()`) |
| Team Composable | `app/composables/useTeam.ts` | Full CRUD, member management, invitations, mode-aware computed props |
| Context Composable | `app/composables/useTeamContext.ts` | URL building (`buildDashboardUrl()`, `buildApiUrl()`), route resolution |
| State Composable | `app/composables/useTeamState.ts` | SSR-safe shared team state via `useState()` |
| Middleware | `app/middleware/team-context.global.ts` | Global team resolution on route changes |

**Key Features**:
- Three modes: `multi-tenant`, `single-tenant`, `personal`
- Teams always required (even single-tenant uses a default team)
- Better Auth organization API integration
- Full member management (invite, remove, update role)
- Mode-aware computed properties (`showTeamSwitcher`, `canCreateTeam`)

---

### 2. nuxt-crouton (Core)

**Location**: `/Users/pmcp/Projects/nuxt-crouton/packages/nuxt-crouton`

**Status**: CONTAINS DUPLICATE CODE

| File | Current State | Issue |
|------|---------------|-------|
| `server/utils/team-auth.ts` | Simple Drizzle-based implementation | Duplicates `@crouton/auth` with different implementation |
| `app/composables/useTeamContext.ts` | Simple wrapper trying to call `useTeam()` | Much simpler than `@crouton/auth` version |

**Duplicate Code Analysis**:

```typescript
// nuxt-crouton/server/utils/team-auth.ts (78 lines)
// - Uses direct Drizzle queries
// - NOT mode-aware
// - Uses tables.teams and tables.teamMembers
// - Simple membership check only

// @crouton/auth/server/utils/team.ts (467 lines)
// - Uses Better Auth organization API
// - Mode-aware (multi-tenant, single-tenant, personal)
// - Role-based access control
// - Personal workspace management
```

**Files Affected**:
- `server/utils/team-auth.ts` - **REMOVE** (replace with @crouton/auth)
- `app/composables/useTeamContext.ts` - **REMOVE** (use @crouton/auth)
- `crouton-team-auth.d.ts` - **UPDATE** type definitions

**Recommended Action**: Delete duplicate utilities, re-export from `@crouton/auth`

---

### 3. nuxt-crouton-cli

**Location**: `/Users/pmcp/Projects/nuxt-crouton/packages/nuxt-crouton-cli`

**Status**: NEEDS SIGNIFICANT UPDATES

| File | Purpose | Change Needed |
|------|---------|---------------|
| `lib/generators/team-auth-utility.mjs` | Generates THIRD copy of team-auth.ts | **REMOVE** - use @crouton/auth |
| `lib/generators/api-endpoints-simplified.mjs` | Team-based endpoints using `#crouton/team-auth` | **UPDATE** import path |
| `lib/generators/api-endpoints.mjs` | Non-team endpoints | **DEPRECATE** or merge |
| `lib/utils/module-detector.mjs` | Checks for `useTeamUtility` flag | **UPDATE** deprecation logic |
| `lib/generators/database-schema.mjs` | Adds `teamId` field conditionally | **UPDATE** to always add |
| `lib/generators/database-queries.mjs` | Team-scoped queries | **UPDATE** to always scope |

**`useTeamUtility` Flag Decision**:

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **A: Remove Entirely** | Always generate team-scoped endpoints | Simplicity, aligns with @crouton/auth philosophy | Breaking change |
| **B: Default True + Deprecation** | Default to true, warn if false | Migration path | Keeps complexity |
| **C: Keep but Rename** | Rename to `standalone: true` for non-team apps | Clarity | Still maintains two paths |

**Recommendation**: **Option A** - Remove `useTeamUtility` flag entirely.

**Rationale**:
- @crouton/auth mandates teams (even single-tenant uses default team)
- Maintaining two endpoint templates doubles maintenance burden
- Generated code should align with the canonical architecture

**Files to Delete**:
- `lib/generators/api-endpoints.mjs` (non-team version)
- `lib/generators/team-auth-utility.mjs` (duplicate utility generator)

**Files to Update**:
- Rename `api-endpoints-simplified.mjs` to `api-endpoints.mjs`
- Change import from `#crouton/team-auth` to `@crouton/auth/server/utils/team`
- Remove all `useTeamUtility` conditionals
- Update examples in `examples/` directory

---

### 4. nuxt-crouton-supersaas

**Location**: `/Users/pmcp/Projects/nuxt-crouton/packages/nuxt-crouton-supersaas`

**Status**: COMPLEMENTS @crouton/auth (Keep Separate)

**Purpose**: External collection connectors for auth systems (SuperSaaS, NuxSaaS)

| Component | Current Behavior | Change Needed |
|-----------|------------------|---------------|
| User Connectors | Proxies to `/api/teams/[id]/members` | **None** - works with @crouton/auth |
| Member Connectors | Uses `teamId` from schema | **None** - compatible |
| API Endpoints | `/api/teams/[id]/users/*` | **None** - follows pattern |

**Relationship to @crouton/auth**:
- **Does NOT duplicate** auth logic
- **Provides connectors** for `CroutonReferenceSelect` dropdowns
- **Proxies to existing** SuperSaaS/NuxSaaS endpoints
- Should **depend on** @crouton/auth for team resolution

**Recommended Action**: Keep separate, add `@crouton/auth` as peer dependency

---

### 5. nuxt-crouton-i18n

**Location**: `/Users/pmcp/Projects/nuxt-crouton/packages/nuxt-crouton-i18n`

**Status**: NEEDS MINOR UPDATE

| File | Current Behavior | Change Needed |
|------|------------------|---------------|
| `app/composables/useT.ts` | Uses `route.params.team` directly | **UPDATE** to use `useTeamContext()` |
| API routes | `/api/teams/[id]/translations-ui/*` | Pattern is correct |

**Current Code** (useT.ts:31):
```typescript
const teamSlugFromRoute = computed(() => {
  const team = route.params.team
  return typeof team === 'string' ? team : undefined
})
```

**Recommended Update**:
```typescript
const { teamSlug } = useTeamContext()
// Uses @crouton/auth for proper mode-aware resolution
```

---

### 6. nuxt-crouton-events

**Location**: `/Users/pmcp/Projects/nuxt-crouton/packages/nuxt-crouton-events`

**Status**: ALREADY USES useTeamContext() - OK

| File | Current Behavior | Status |
|------|------------------|--------|
| `app/composables/useCroutonEvents.ts` | Uses `useTeamContext().getTeamId()` | Correct |
| `app/composables/useCroutonEventTracker.ts` | Uses `useTeamContext().getTeamId()` | Correct |

**Note**: Currently uses nuxt-crouton's `useTeamContext()` which is the simple wrapper. When core is updated to re-export from @crouton/auth, this will automatically work.

**Recommended Action**: No code changes needed; will inherit from core update

---

### 7. nuxt-crouton-flow

**Location**: `/Users/pmcp/Projects/nuxt-crouton/packages/nuxt-crouton-flow`

**Status**: ALREADY USES useTeamContext() - OK

| File | Current Behavior | Status |
|------|------------------|--------|
| `app/composables/useFlowMutation.ts` | Uses `useTeamContext().getTeamId()` | Correct |

**Recommended Action**: No code changes needed; will inherit from core update

---

### 8. nuxt-crouton-assets

**Location**: `/Users/pmcp/Projects/nuxt-crouton/packages/nuxt-crouton-assets`

**Status**: NEEDS UPDATE

| File | Current Behavior | Change Needed |
|------|------------------|---------------|
| `app/composables/useAssetUpload.ts` | Uses `route.params.team` directly | **UPDATE** to use `useTeamContext()` |
| `app/components/Uploader.vue` | Uses `useRoute().params.team` directly | **UPDATE** to use `useTeamContext()` |

**Current Code**:
```typescript
const teamId = route.params.team as string
```

**Recommended Update**:
```typescript
const { teamId } = useTeamContext()
```

---

### 9. nuxt-crouton-ai

**Location**: `/Users/pmcp/Projects/nuxt-crouton/packages/nuxt-crouton-ai`

**Status**: NEEDS UPDATE

| File | Current Behavior | Change Needed |
|------|------------------|---------------|
| `app/composables/useChat.ts` | Try/catch around `useTeam()` | **UPDATE** to use `useTeamContext()` |
| `app/composables/useCompletion.ts` | Try/catch around `useTeam()` | **UPDATE** to use `useTeamContext()` |

**Current Code**:
```typescript
try {
  // @ts-expect-error - useTeam may not be available
  const { currentTeam } = useTeam()
  teamId = currentTeam?.value?.id
} catch { /* silently ignore */ }
```

**Recommended Update**:
```typescript
const { teamId } = useTeamContext()
// No try/catch needed - @crouton/auth always provides context
```

---

### 10. Other Packages

| Package | Team Code | Status |
|---------|-----------|--------|
| nuxt-crouton-devtools | None | OK |
| nuxt-crouton-editor | None | OK |
| nuxt-crouton-maps | None | OK |

---

## Duplicate Code Summary

### Function: `resolveTeamAndCheckMembership()`

| Location | Lines | Implementation | Use Case |
|----------|-------|----------------|----------|
| `@crouton/auth/server/utils/team.ts` | ~60 | Better Auth API, mode-aware | **CANONICAL** |
| `nuxt-crouton/server/utils/team-auth.ts` | ~50 | Direct Drizzle, simple | **DELETE** |
| Generated per layer (`team-auth-utility.mjs`) | ~80 | Direct Drizzle, simple | **STOP GENERATING** |

### Function: `useTeamContext()`

| Location | Features | Recommendation |
|----------|----------|----------------|
| `@crouton/auth/app/composables/useTeamContext.ts` | Full API, mode-aware, URL builders | **CANONICAL** |
| `nuxt-crouton/app/composables/useTeamContext.ts` | Simple wrapper around `useTeam()` | **RE-EXPORT** from @crouton/auth |

---

## Breaking Changes

### For Existing Users

| Change | Impact | Migration |
|--------|--------|-----------|
| `useTeamUtility` flag removed | Projects with `useTeamUtility: false` will error | Set to `true` or remove flag |
| `#crouton/team-auth` import path changes | Generated endpoints need re-generation | Run `crouton config --force` |
| `useTeamContext()` API changes | More features available | Generally backward compatible |
| Teams always required | Single-tenant apps need default team | Auto-created on first user signup |

### For Package Consumers

| Package | Breaking Changes |
|---------|------------------|
| nuxt-crouton | `#crouton/team-auth` removed, use @crouton/auth |
| nuxt-crouton-cli | `useTeamUtility` flag deprecated |
| nuxt-crouton-supersaas | None |
| Others | None (internal changes only) |

---

## Recommended Migration Order

### Phase 1: Foundation (Week 1)

1. **Move @crouton/auth** to `nuxt-crouton/packages/nuxt-crouton-auth/`
2. **Update nuxt-crouton core**:
   - Delete `server/utils/team-auth.ts`
   - Update `app/composables/useTeamContext.ts` to re-export from @crouton/auth
   - Add @crouton/auth as dependency

### Phase 2: Generator (Week 1-2)

3. **Update collection generator**:
   - Remove `useTeamUtility` flag
   - Remove `lib/generators/team-auth-utility.mjs`
   - Update `api-endpoints-simplified.mjs` → `api-endpoints.mjs`
   - Change import to `@crouton/auth/server/utils/team`
   - Update examples

### Phase 3: Dependent Packages (Week 2)

4. **Update packages** (parallel):
   - nuxt-crouton-i18n: Use `useTeamContext()`
   - nuxt-crouton-assets: Use `useTeamContext()`
   - nuxt-crouton-ai: Use `useTeamContext()`
   - nuxt-crouton-supersaas: Add @crouton/auth peer dependency

### Phase 4: Documentation (Week 2)

5. **Update documentation**:
   - All CLAUDE.md files
   - External docs at crouton-docs
   - Migration guide for existing users

---

## Decision Points Requiring Input

### 1. `useTeamUtility` Flag

**Question**: Deprecate entirely (Option A) or gradual deprecation (Option B)?

**Recommendation**: Option A - Remove entirely

**Rationale**:
- Aligns with @crouton/auth's "teams always required" philosophy
- Reduces maintenance burden
- Clear, consistent architecture

### 2. Import Path

**Question**: What should the new import path be?

**Options**:
- `@crouton/auth/server/utils/team` (direct)
- `#crouton-auth/team` (Nuxt alias)
- Re-export from `nuxt-crouton` as `#crouton/team-auth` (backward compatible)

**Recommendation**: Re-export for backward compatibility, deprecate `#crouton/team-auth` alias over time

### 3. Package Naming

**Question**: Should @crouton/auth be renamed when moved?

**Options**:
- Keep `@crouton/auth`
- Rename to `@friendlyinternet/nuxt-crouton-auth`

**Recommendation**: Rename to match monorepo naming convention

---

## Appendix: Files to Modify

### Files to DELETE

| Package | File |
|---------|------|
| nuxt-crouton | `server/utils/team-auth.ts` |
| nuxt-crouton-cli | `lib/generators/team-auth-utility.mjs` |
| nuxt-crouton-cli | `lib/generators/api-endpoints.mjs` (non-team version) |

### Files to UPDATE

| Package | File | Change |
|---------|------|--------|
| nuxt-crouton | `app/composables/useTeamContext.ts` | Re-export from @crouton/auth |
| nuxt-crouton | `crouton-team-auth.d.ts` | Update types |
| nuxt-crouton-cli | `lib/generators/api-endpoints-simplified.mjs` | Rename, update import |
| nuxt-crouton-cli | `lib/generate-collection.mjs` | Remove useTeamUtility conditionals |
| nuxt-crouton-cli | `lib/utils/module-detector.mjs` | Remove useTeamUtility check |
| nuxt-crouton-i18n | `app/composables/useT.ts` | Use useTeamContext() |
| nuxt-crouton-assets | `app/composables/useAssetUpload.ts` | Use useTeamContext() |
| nuxt-crouton-assets | `app/components/Uploader.vue` | Use useTeamContext() |
| nuxt-crouton-ai | `app/composables/useChat.ts` | Use useTeamContext() |
| nuxt-crouton-ai | `app/composables/useCompletion.ts` | Use useTeamContext() |

---

## Conclusion

The analysis reveals significant duplication that can be consolidated by:

1. Making `@crouton/auth` the single source of truth for team utilities
2. Removing the `useTeamUtility` flag from the generator
3. Updating dependent packages to use the canonical `useTeamContext()`
4. Ensuring all packages follow the "teams always required" philosophy

This consolidation will:
- Reduce code duplication by ~500 lines
- Simplify the generator by removing dual-path logic
- Provide consistent, mode-aware team handling across all packages
- Enable easier maintenance and feature additions

---

*Report generated by Claude Code analysis on 2024-12-17*
