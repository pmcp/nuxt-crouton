# Legacy Code & Technical Debt Tracker

This document catalogs all legacy code, backwards compatibility layers, and technical debt in the nuxt-crouton ecosystem.

**Last Updated**: 2025-12-20

---

## Overview

| Category | Count | Status | Priority |
|----------|-------|--------|----------|
| Database Mode Legacy Support | 1 system | Active | Medium |
| Team Metadata Backward Compat | 3 files | Active | Low |
| Flow Component Legacy Mode | 1 system | Active | Low |
| Placeholder Implementations | 3 locations | Planned | Medium |
| Temporary/Helper Code | 4 instances | Active | Low |
| Deprecated Components | 1 item | Documented | Low |
| Polyfill Dependencies | 8 packages | Transitive | N/A |

---

## 1. Database Mode Legacy Support

**Status**: Active
**Risk**: Medium (NuxtHub version dependent)
**Package**: `@crouton/auth`

### Files

| File | Lines | Purpose |
|------|-------|---------|
| `packages/nuxt-crouton-auth/server/utils/database.ts` | 29-31 | `useDB()` returns NuxtHub v0.10+ `db` auto-import |

### Purpose

Supports NuxtHub v0.10+ multi-vendor database mode. The current implementation uses the `db` auto-import from `hub:db` which provides a Drizzle ORM instance.

**Historical context**: Prior versions supported both:
- **NuxtHub v0.10+**: `db` from `hub:db` (Drizzle ORM instance) - **Current**
- **Legacy D1 mode**: `hubDatabase()` wrapped with `drizzle-orm/d1` - **Removed**

### Current State

The legacy fallback has been removed. The system now requires NuxtHub v0.10+ with the multi-vendor database mode.

### Cleanup Notes

- No action needed - legacy mode already removed
- Monitor NuxtHub version requirements in documentation

---

## 2. Team Metadata Backward Compatibility

**Status**: Active
**Risk**: Low (data migration complete, compat layer for safety)
**Package**: `@crouton/auth`

### Files

| File | Lines | Purpose |
|------|-------|---------|
| `packages/nuxt-crouton-auth/server/utils/team.ts` | 455-496 | `mapOrganizationToTeam()` function |
| `packages/nuxt-crouton-auth/app/composables/useTeam.ts` | 47-79 | Client-side `mapOrganizationToTeam()` |
| `packages/nuxt-crouton-auth/app/composables/useSession.ts` | ~99 | Session team metadata parsing |

### Purpose

Supports both **new structured columns** (Task 6.2) and **legacy JSON metadata** for backward compatibility when reading team/organization data.

**New columns** (preferred):
- `personal` (boolean)
- `isDefault` (boolean)
- `ownerId` (string)

**Legacy approach**: These values stored in `metadata` JSON column.

### Code Pattern

```typescript
// Parse metadata if it's a string (for legacy data)
let metadata: Record<string, unknown> = {}
if (org.metadata) {
  try {
    metadata = typeof org.metadata === 'string'
      ? JSON.parse(org.metadata)
      : org.metadata
  } catch {
    metadata = {}
  }
}

// Prefer new columns (Task 6.2), fall back to metadata for backward compatibility
// SQLite returns 0/1 for booleans, so check for truthy value
const isPersonal = org.personal === true || org.personal === 1 || metadata.personal === true
const isDefaultOrg = org.isDefault === true || org.isDefault === 1 || metadata.isDefault === true
```

### Cleanup Notes

- Keep compatibility layer until all deployments have migrated data
- Consider adding deprecation warning when legacy metadata is detected
- Can be removed after confirming no legacy data exists in production

---

## 3. Flow Component Legacy Mode

**Status**: Active (intentional dual-mode design)
**Risk**: Low (working as designed)
**Package**: `@friendlyinternet/nuxt-crouton-flow`

### Files

| File | Lines | Purpose |
|------|-------|---------|
| `packages/nuxt-crouton-flow/app/components/Flow.vue` | 365-583 | Legacy mode implementation |

### Purpose

The Flow component supports two operating modes:

| Mode | Description | Use Case |
|------|-------------|----------|
| **Sync mode** (new) | Yjs CRDTs via Durable Objects | Real-time multiplayer |
| **Legacy mode** (old) | Props-based data with debounced updates | Simple non-collaborative flows |

### Legacy Mode Markers

```typescript
// Line 365: Section header
// LEGACY MODE: Use props-based data

// Line 390: Position mutation
// Position mutation (debounced) - only for legacy mode

// Line 397: Layout tracking
// Track if initial layout has been applied (legacy mode)

// Line 400: Layout application
// Apply layout to nodes that need it (legacy mode only)

// Line 429: Node source
// Use sync nodes or legacy nodes based on mode

// Line 535: Position persistence
// Persist via debounced mutation (legacy mode)

// Line 583: Drag feedback
// Visual feedback for drag over (legacy - will be replaced by ghost nodes)
```

### Cleanup Notes

- **Do NOT remove** - Legacy mode is intentional for non-collaborative use cases
- Consider renaming "legacy mode" to "standalone mode" for clarity
- Ghost nodes feature mentioned at line 583 is pending implementation

---

## 4. Placeholder Implementations

**Status**: Planned
**Risk**: Medium (security implications for auth.ts)
**Package**: `@crouton/auth`

### Files

| File | Lines | Description | Task |
|------|-------|-------------|------|
| `packages/nuxt-crouton-auth/server/lib/auth.ts` | 868-878 | Billing authorization returns `true` without check | Task 2.7/2.8 |
| `packages/nuxt-crouton-auth/server/utils/team-auth.ts` | 30-47 | `isTeamMember()` warns and returns `false` | - |
| `packages/nuxt-crouton-auth/app/composables/useAuth.ts` | 467-478 | Passkey update throws error | - |

### Details

#### 4.1 Billing Authorization (HIGH PRIORITY)

```typescript
// packages/nuxt-crouton-auth/server/lib/auth.ts:868-878
authorizeReference: async ({ referenceId, action, user }) => {
  // For now, we log the attempt and return true (will be secured in Task 2.7/2.8)
  if (debug) {
    console.log(`[crouton/auth] Authorizing ${action} for reference ${referenceId} by user ${user.id}`)
  }
  // TODO: Implement proper authorization check via organization membership
  // This should check if user is owner/admin of the organization
  return true
}
```

**Risk**: Any authenticated user can manage billing for any organization.
**Action**: Implement proper organization membership check before production use.

#### 4.2 Team Membership Check (LOW PRIORITY)

```typescript
// packages/nuxt-crouton-auth/server/utils/team-auth.ts:36-46
// For now, we can't call getMembership without an event
console.warn(
  '[crouton/auth] isTeamMember called without event context. '
  + 'Use resolveTeamAndCheckMembership(event) in API handlers instead.'
)
return false
```

**Risk**: Low - fails safely by returning `false`.
**Action**: Consider deprecating or removing this function in favor of `resolveTeamAndCheckMembership()`.

#### 4.3 Passkey Update (LOW PRIORITY)

```typescript
// packages/nuxt-crouton-auth/app/composables/useAuth.ts:467-471
// Better Auth doesn't have a direct update method
// For now, we'll throw an error indicating this is not supported
// TODO: Check if Better Auth supports passkey updates
throw new Error('Passkey update is not currently supported. Delete and re-add instead.')
```

**Risk**: None - feature disabled with clear user feedback.
**Action**: Monitor Better Auth releases for passkey update support.

---

## 5. Temporary/Helper Code

**Status**: Active
**Risk**: Low

### Files

| File | Lines | Description |
|------|-------|-------------|
| `packages/nuxt-crouton-mcp-server/src/utils/cli.ts` | 63, 78 | Temporary file utilities for schema handling |
| `apps/test/server/api/seed.post.ts` | 1 | Test seed endpoint (dev only) |
| `packages/nuxt-crouton-i18n/app/composables/useT.ts` | ~260 | Locale assumption fallback |

### Details

#### 5.1 CLI Temporary Files

```typescript
// Write a schema to a temporary file and return the path
// Clean up a temporary schema file
```

Standard utility pattern - no action needed.

#### 5.2 Test Seed Endpoint

```typescript
// Temporary seed endpoint for testing
```

Should not be deployed to production. Consider:
- Adding environment check
- Moving to CLI command

#### 5.3 Locale Fallback

```typescript
// For now, just assume it exists if not already in availableLocales
```

Acceptable fallback behavior - no action needed.

---

## 6. Deprecated Components (Documented)

**Status**: Documented
**Risk**: None (already removed)

### Files

| File | Lines | Description |
|------|-------|-------------|
| `apps/docs/content/6.features/6.rich-text.md` | 276-279 | CroutonEditorToolbar deprecation notice |

### Details

```markdown
### CroutonEditorToolbar (Deprecated)

Deprecated in v2.x: CroutonEditorToolbar has been removed.
Use UEditorToolbar from Nuxt UI instead...
```

**Action**: Documentation is complete. No code to remove.

---

## 7. Polyfill Dependencies

**Status**: Transitive
**Risk**: None (standard compatibility)

### Packages (from pnpm-lock.yaml)

| Package | Version | Purpose |
|---------|---------|---------|
| `@esbuild-plugins/node-globals-polyfill` | 0.2.3 | Node globals in browser |
| `@esbuild-plugins/node-modules-polyfill` | 0.2.2 | Node modules in browser |
| `web-streams-polyfill` | 3.3.3 | Web Streams API |
| `formdata-polyfill` | 4.0.10 | FormData support |
| `event-target-shim` | 5.0.1 | EventTarget support |
| `character-entities-legacy` | 3.0.0 | HTML entities |
| `rollup-plugin-node-polyfills` | 0.2.1 | Rollup polyfills |
| `urlpattern-polyfill` | 8.0.2, 10.1.0 | URL Pattern API |

**Action**: None - these are transitive dependencies for Node/browser compatibility.

---

## Cleanup Checklist (Future)

### High Priority
- [ ] Implement billing authorization check (Task 2.7/2.8) - `auth.ts:868-878`

### Medium Priority
- [ ] Add deprecation warning for legacy team metadata when detected
- [ ] Consider renaming Flow "legacy mode" to "standalone mode"

### Low Priority
- [ ] Add environment check to test seed endpoint
- [ ] Monitor Better Auth for passkey update support
- [ ] Remove team metadata compat after confirming no legacy data in production

### Documentation
- [ ] Update NuxtHub version requirements documentation
- [x] Document deprecated CroutonEditorToolbar (already done)

---

## Maintenance

When adding new legacy/compat code:

1. Add a comment explaining why it's needed
2. Reference the task/issue that will address it
3. Add an entry to this tracker
4. Set a review date if applicable
