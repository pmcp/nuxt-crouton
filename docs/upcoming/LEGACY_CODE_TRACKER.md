# Legacy Code & Technical Debt Tracker

This document catalogs all legacy code, backwards compatibility layers, and technical debt in the nuxt-crouton ecosystem.

**Last Updated**: 2025-12-21

---

## Overview

| Category | Count | Status | Priority |
|----------|-------|--------|----------|
| Database Mode Legacy Support | - | ✅ Removed | - |
| Team Metadata Backward Compat | - | ✅ Removed | - |
| Flow Component Legacy Mode | 1 system | Intentional Design | N/A |
| Placeholder Implementations | 1 location | Active | Low |
| Temporary/Helper Code | 3 instances | Active | Low |
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

**Status**: ✅ Removed (2025-12-21)
**Package**: `@crouton/auth`

### Resolution

Legacy metadata fallback has been removed. The code now only uses the structured database columns:
- `personal` (boolean)
- `isDefault` (boolean)
- `ownerId` (string)

The simplified `mapOrganizationToTeam()` functions now directly read from columns without parsing JSON metadata.

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

**Status**: Mostly Resolved
**Package**: `@crouton/auth`

### Files

| File | Lines | Description | Status |
|------|-------|-------------|--------|
| `packages/nuxt-crouton-auth/server/lib/auth.ts` | 888-905 | Billing authorization | ✅ Implemented (2025-12-21) |
| `packages/nuxt-crouton-auth/server/utils/team-auth.ts` | - | `isTeamMember()` | ✅ Removed (2025-12-21) |
| `packages/nuxt-crouton-auth/app/composables/useAuth.ts` | 560-569 | Passkey update throws error | Active (Better Auth limitation) |

### Details

#### 4.1 Billing Authorization - ✅ RESOLVED

The `authorizeReference` callback now properly checks organization membership:
- Uses `getOrganizationMembershipDirect()` for direct DB queries
- Verifies user is `owner` or `admin` of the organization
- Denies access for non-members or `member` role

#### 4.2 Team Membership Check - ✅ REMOVED

The broken `isTeamMember()` function has been removed. Use `isTeamMemberWithEvent(event, teamId, userId)` instead, which has access to H3 event context for Better Auth API calls.

#### 4.3 Passkey Update (LOW PRIORITY)

```typescript
// packages/nuxt-crouton-auth/app/composables/useAuth.ts:560-569
throw new Error('Passkey update is not currently supported. Delete and re-add instead.')
```

**Status**: Active - this is a Better Auth limitation, not legacy code.
**Risk**: None - feature disabled with clear user feedback.
**Action**: Monitor Better Auth releases for passkey update support.

---

## 5. Temporary/Helper Code

**Status**: Active
**Risk**: Low

### Files

| File | Lines | Description | Status |
|------|-------|-------------|--------|
| `packages/nuxt-crouton-mcp-server/src/utils/cli.ts` | 63, 78 | Temporary file utilities | Standard utility |
| `apps/test/server/api/seed.post.ts` | 1 | Test seed endpoint | ✅ Protected (2025-12-21) |
| `packages/nuxt-crouton-i18n/app/composables/useT.ts` | ~260 | Locale assumption fallback | Acceptable |

### Details

#### 5.1 CLI Temporary Files

Standard utility pattern for schema handling - no action needed.

#### 5.2 Test Seed Endpoint - ✅ PROTECTED

The seed endpoint now includes a production guard:
```typescript
if (process.env.NODE_ENV === 'production') {
  throw createError({ statusCode: 404, message: 'Not found' })
}
```

#### 5.3 Locale Fallback

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

## Cleanup Checklist

### Completed (2025-12-21)
- [x] Implement billing authorization check - `auth.ts:888-905`
- [x] Remove broken `isTeamMember()` function
- [x] Add environment protection to test seed endpoint

### Medium Priority
- [ ] Consider renaming Flow "legacy mode" to "standalone mode" for clarity

### Low Priority (External Dependencies)
- [ ] Monitor Better Auth for passkey update support

### Documentation
- [x] Update NuxtHub version requirements documentation
- [x] Document deprecated CroutonEditorToolbar
- [x] Update API docs to use `isTeamMemberWithEvent`

---

## Maintenance

When adding new legacy/compat code:

1. Add a comment explaining why it's needed
2. Reference the task/issue that will address it
3. Add an entry to this tracker
4. Set a review date if applicable
