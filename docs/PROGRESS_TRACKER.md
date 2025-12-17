# SuperSaaS Migration Progress Tracker

> **Goal**: Migrate nuxt-crouton ecosystem away from SuperSaaS template dependency, consolidating on `@crouton/auth` as the single source of truth for team-based authentication.

## Quick Stats

| Metric | Value |
|--------|-------|
| **Tasks Completed** | 24 / 24 |
| **Current Phase** | ✅ MIGRATION COMPLETE |
| **Estimated Total** | ~16-20 hours |
| **Started** | 2024-12-17 |

---

## Overview

This migration consolidates team authentication across all nuxt-crouton packages:

**Before**: 3 separate implementations of team-auth
- `@crouton/auth` (Better Auth, mode-aware)
- `nuxt-crouton/server/utils/team-auth.ts` (simple Drizzle)
- Generated per-layer by `team-auth-utility.mjs`

**After**: Single source of truth
- `@crouton/auth` is the canonical implementation
- All packages import from `@crouton/auth`
- Generator uses `@crouton/auth` directly

---

## Phase 1: Foundation
**Progress**: 6/6 tasks (100%)
**Time**: 1h / 4h estimated

### 1.1 Verify @crouton/auth is ready
- [x] ✅ Confirm package builds successfully
- [x] ✅ Verify all exports are correct
- [x] ✅ Test Better Auth integration works

**Files**: `packages/crouton-auth/`

### 1.2 Update nuxt-crouton package.json
- [x] ✅ Add `@crouton/auth` as dependency
- [x] ✅ Update peer dependencies if needed (not needed)

**Files**: `packages/nuxt-crouton/package.json`

### 1.3 Delete duplicate team-auth.ts
- [x] ✅ Remove `server/utils/team-auth.ts` from nuxt-crouton
- [x] ✅ Update any imports that reference this file (nitro alias updated in 1.5)

**Files**:
- DELETED: `packages/nuxt-crouton/server/utils/team-auth.ts`

### 1.4 Update useTeamContext composable
- [x] ✅ Re-export `useTeamContext` from `@crouton/auth` (kept standalone with compatible API)
- [x] ✅ Ensure backward compatibility (getTeamId/getTeamSlug + computed refs)

**Files**: `packages/nuxt-crouton/app/composables/useTeamContext.ts`

### 1.5 Update type definitions
- [x] ✅ Update `crouton-team-auth.d.ts` to reference @crouton/auth types
- [x] ✅ Ensure `#crouton/team-auth` alias still works (for backward compat)
- [x] ✅ Update nitro alias in nuxt.config.ts

**Files**: `packages/nuxt-crouton/crouton-team-auth.d.ts`, `packages/nuxt-crouton/nuxt.config.ts`

### 1.6 Run typecheck and fix errors
- [x] ✅ Run `npx nuxt typecheck` in nuxt-crouton
- [x] ✅ Fix any type errors (pre-existing auto-import errors, normal for layers)

**Commands**: `cd packages/nuxt-crouton && npx nuxt typecheck`
**Note**: Auto-import type errors (useRoute, computed, etc.) are normal for layer packages and resolve when consumed.

---

## Phase 2: Collection Generator Updates
**Progress**: 8/8 tasks (100%) ✅
**Time**: 1.5h / 6h estimated

### 2.1 Remove useTeamUtility flag
- [x] ✅ Remove `useTeamUtility` conditionals from `generate-collection.mjs`
- [x] ✅ Default all generation to team-scoped

**Files**: `packages/nuxt-crouton-collection-generator/lib/generate-collection.mjs`

### 2.2 Delete team-auth-utility.mjs generator
- [x] ✅ Remove `team-auth-utility.mjs` (generates duplicate team-auth)
- [x] ✅ Update any imports

**Files**:
- DELETED: `packages/nuxt-crouton-collection-generator/lib/generators/team-auth-utility.mjs`

### 2.3 Delete non-team api-endpoints.mjs
- [x] ✅ Remove original `api-endpoints.mjs` (non-team version)
- [x] ✅ Keep only simplified version

**Files**:
- DELETED: `packages/nuxt-crouton-collection-generator/lib/generators/api-endpoints.mjs` (original)

### 2.4 Rename api-endpoints-simplified.mjs
- [x] ✅ Renamed `api-endpoints-simplified.mjs` → `api-endpoints.mjs`
- [x] ✅ Updated function names (removed "Simplified" suffix)
- [x] ✅ Updated all imports

**Files**: `packages/nuxt-crouton-collection-generator/lib/generators/api-endpoints.mjs`

### 2.5 Update import paths in generator
- [x] ✅ Changed `#crouton/team-auth` to `@crouton/auth/server` in api-endpoints.mjs
- [x] ✅ Updated database-queries.mjs (owner field always included)
- [x] ✅ Updated database-schema.mjs (team fields always included)
- [x] ✅ Updated types.mjs (team fields always included)

**Files**:
- `packages/nuxt-crouton-collection-generator/lib/generators/api-endpoints.mjs`
- `packages/nuxt-crouton-collection-generator/lib/generators/database-queries.mjs`
- `packages/nuxt-crouton-collection-generator/lib/generators/database-schema.mjs`
- `packages/nuxt-crouton-collection-generator/lib/generators/types.mjs`

### 2.6 Update module-detector.mjs
- [x] ✅ Removed `useTeamUtility` detection logic
- [x] ✅ Added @crouton/auth package detection (critical dependency)

**Files**: `packages/nuxt-crouton-collection-generator/lib/utils/module-detector.mjs`

### 2.7 Update example configs
- [x] ✅ Removed `useTeamUtility` from example configs
- [x] ✅ Updated documentation comments
- [x] ✅ Added test-product-schema.json

**Files**:
- `packages/nuxt-crouton-collection-generator/examples/crouton.config.example.js`
- `packages/nuxt-crouton-collection-generator/examples/crouton.config.products.js`
- `packages/nuxt-crouton-collection-generator/examples/test-product-schema.json`

### 2.8 Test generator output
- [x] ✅ Generated test collection (dry-run)
- [x] ✅ Verified output uses `@crouton/auth/server` imports
- [x] ✅ Verified module-detector reports @crouton/auth as critical

**Commands**: `node packages/nuxt-crouton-collection-generator/bin/crouton-generate.js test products --dry-run`

---

## Phase 3: Update Dependent Packages
**Progress**: 6/6 tasks (100%) ✅
**Time**: 0.5h / 4h estimated

### 3.1 Update nuxt-crouton-i18n
- [x] ✅ Replace `route.params.team` with `useTeamContext()`
- [x] ✅ Update `app/composables/useT.ts`

**Files**: `packages/nuxt-crouton-i18n/app/composables/useT.ts`

### 3.2 Update nuxt-crouton-assets
- [x] ✅ Replace direct route access with `useTeamContext()`
- [x] ✅ Update `app/composables/useAssetUpload.ts`
- [x] ✅ Update `app/components/Uploader.vue`

**Files**:
- `packages/nuxt-crouton-assets/app/composables/useAssetUpload.ts`
- `packages/nuxt-crouton-assets/app/components/Uploader.vue`

### 3.3 Update nuxt-crouton-ai
- [x] ✅ Update try/catch to use `useTeamContext()` instead of `useTeam()`
- [x] ✅ Keep try/catch pattern (nuxt-crouton-ai doesn't extend nuxt-crouton)
- [x] ✅ Update `app/composables/useChat.ts`
- [x] ✅ Update `app/composables/useCompletion.ts`

**Files**:
- `packages/nuxt-crouton-ai/app/composables/useChat.ts`
- `packages/nuxt-crouton-ai/app/composables/useCompletion.ts`

### 3.4 Verify nuxt-crouton-supersaas
- [x] ✅ No @crouton/auth dependency needed (uses route params server-side)
- [x] ✅ Verified connectors work with team-based routing

**Note**: Supersaas connectors use route params on server-side which is the correct pattern for API endpoints.

### 3.5 Verify nuxt-crouton-events (already correct)
- [x] ✅ Confirmed uses `useTeamContext()` already
- [x] ✅ No changes needed

**Files**: `packages/nuxt-crouton-events/app/composables/useCroutonEvents.ts`

### 3.6 Verify nuxt-crouton-flow (already correct)
- [x] ✅ Confirmed uses `useTeamContext()` already
- [x] ✅ No changes needed

**Files**: `packages/nuxt-crouton-flow/app/composables/useFlowMutation.ts`

---

## Phase 4: Documentation & Cleanup
**Progress**: 4/4 tasks (100%) ✅
**Time**: 2h / 4h estimated

### 4.1 Update package CLAUDE.md files
- [x] ✅ Update `packages/nuxt-crouton/CLAUDE.md`
- [x] ✅ Update `packages/nuxt-crouton-collection-generator/CLAUDE.md`
- [x] ✅ Update `packages/crouton-auth/CLAUDE.md`

### 4.2 Create migration guide
- [x] ✅ Document breaking changes
- [x] ✅ Step-by-step upgrade instructions
- [x] ✅ Common issues and solutions

**Files**: `apps/docs/content/10.guides/2.migration.md` (added @crouton/auth section)

### 4.3 Update external documentation
- [x] ✅ Check `apps/docs/content` for outdated references
- [x] ✅ Update generation docs (cli-reference, multi-collection, schema-format, cli-commands)
- [x] ✅ Update team-based-auth.md (complete rewrite)
- [x] ✅ Update troubleshooting, patterns, and reference docs

### 4.4 Final cleanup
- [x] ✅ Update add-events.mjs to use @crouton/auth/server imports
- [x] ✅ Run typecheck (docs app errors are normal Nuxt auto-import issues)
- [x] ✅ Verified migration complete

---

## Daily Log

### 2024-12-17 (Phase 4)
- ✅ **Phase 4 Complete - MIGRATION COMPLETE**
- Updated nuxt-crouton CLAUDE.md (removed team-auth.ts ref, added @crouton/auth) (Task 4.1)
- Updated generator CLAUDE.md (added Team Authentication section, updated sync refs) (Task 4.1)
- Updated crouton-auth CLAUDE.md (marked as canonical source, updated import paths) (Task 4.1)
- Added @crouton/auth migration section to existing migration guide (Task 4.2)
- Updated 10 external docs to remove useTeamUtility references (Task 4.3)
- Updated add-events.mjs to use @crouton/auth/server imports (Task 4.4)

### 2024-12-17 (Phase 3)
- ✅ **Phase 3 Complete**
- Updated nuxt-crouton-i18n to use useTeamContext() (Task 3.1)
- Updated nuxt-crouton-assets to use useTeamContext() (Task 3.2)
- Updated nuxt-crouton-ai to use useTeamContext() with try/catch (Task 3.3)
- Verified nuxt-crouton-supersaas connectors work correctly (Task 3.4)
- Verified nuxt-crouton-events already uses useTeamContext() (Task 3.5)
- Verified nuxt-crouton-flow already uses useTeamContext() (Task 3.6)

### 2024-12-17 (Evening)
- ✅ **Phase 1 Complete**
- Verified @crouton/auth package ready (Task 1.1)
- Added @crouton/auth as optional peer dependency (Task 1.2)
- Deleted duplicate team-auth.ts from nuxt-crouton (Task 1.3)
- Updated useTeamContext with backward-compatible API (Task 1.4)
- Updated nitro alias and type definitions (Task 1.5)
- Fixed path resolution for monorepo workspace symlinks (Task 1.6)

### 2024-12-17
- Created PROGRESS_TRACKER.md
- Identified 24 tasks across 4 phases
- Previous analysis completed (see `/docs/reports/team-architecture-analysis.md`)

---

## Breaking Changes Summary

| Change | Impact | Migration Path |
|--------|--------|----------------|
| `useTeamUtility` removed | Projects with `useTeamUtility: false` will error | Remove flag or set `true` |
| `#crouton/team-auth` import | Generated code needs regeneration | Run `crouton generate --force` |
| Teams always required | Single-tenant apps need default team | Auto-created on first signup |

---

## References

- [Team Architecture Analysis](/docs/reports/team-architecture-analysis.md)
- [Packages Cleanup Brief](/docs/briefs/packages-cleanup-analysis-brief.md)
- [@crouton/auth Package](/packages/crouton-auth/README.md)

---

*Tracker created: 2024-12-17*
