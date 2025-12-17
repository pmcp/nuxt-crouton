# Nuxt Crouton Packages Cleanup Analysis Brief

## Context

The `@crouton/auth` package (currently in `crouton-bookings/packages/crouton-auth`) is being moved to the main `nuxt-crouton/packages` folder. This package introduces a fundamental architectural change:

**Teams are always required** - even single-tenant and personal apps use a default/personal team.

This affects the entire nuxt-crouton ecosystem and requires a thorough analysis to ensure consistency.

---

## Scope of Analysis

### Packages to Analyze

| Package | Priority | Key Concerns |
|---------|----------|--------------|
| `nuxt-crouton` (core) | High | Team auth utilities, API patterns |
| `nuxt-crouton-collection-generator` | High | `useTeamUtility` flag deprecation |
| `nuxt-crouton-supersaas` | High | External user/team connectors |
| `nuxt-crouton-i18n` | Medium | Team-scoped translations |
| `nuxt-crouton-events` | Medium | Team-scoped audit events |
| `nuxt-crouton-assets` | Medium | Team-scoped assets |
| `nuxt-crouton-flow` | Medium | Team-scoped flows |
| `nuxt-crouton-maps` | Low | No direct team dependency |
| `nuxt-crouton-editor` | Low | No direct team dependency |
| `nuxt-crouton-devtools` | Low | May need auth context |
| `crouton-ai` | Low | Team-scoped conversations |

---

## Analysis Questions Per Package

### 1. `nuxt-crouton` (Core)

**Current State:**
- Has `server/utils/team-auth.ts` with `resolveTeamAndCheckMembership()`
- Components assume team context exists
- API pattern: `/api/teams/[id]/{collection}/...`

**Questions:**
- [ ] Does `team-auth.ts` align with `@crouton/auth`'s implementation?
- [ ] Should core team utilities move to `@crouton/auth`?
- [ ] What's the dependency direction: core → auth or auth → core?
- [ ] Are there duplicate team utilities that need consolidation?

**Files to Review:**
- `server/utils/team-auth.ts`
- `app/composables/useTeamContext.ts` (if exists)
- Any composable using team context

---

### 2. `nuxt-crouton-collection-generator`

**Current State:**
- `useTeamUtility` flag toggles between:
  - Standard endpoints (no team auth)
  - Simplified endpoints (team auth with `#crouton/team-auth`)
- Uses `api-endpoints.mjs` vs `api-endpoints-simplified.mjs`

**Questions:**
- [ ] Should `useTeamUtility` be deprecated entirely?
- [ ] Should generator always produce team-scoped endpoints?
- [ ] What happens to existing generated code when flag is removed?
- [ ] How do we handle migration for projects using `useTeamUtility: false`?

**Files to Review:**
- `lib/generate-collection.mjs` (lines 1100-1103)
- `lib/generators/api-endpoints.mjs`
- `lib/generators/api-endpoints-simplified.mjs`
- `lib/generators/database-schema.mjs` (team fields)
- `lib/generators/database-queries.mjs` (team scoping)
- `lib/utils/module-detector.mjs` (team utility check)
- `examples/crouton.config.example.js`

**Decision Needed:**
```
Option A: Remove useTeamUtility entirely
  - Always generate team-scoped endpoints
  - Remove api-endpoints.mjs (keep only simplified)
  - Breaking change for existing users

Option B: Default to true, deprecation warning
  - useTeamUtility defaults to true
  - Warning if explicitly set to false
  - Gradual migration path

Option C: Keep but rename
  - Rename to something clearer (e.g., `standalone: true` for non-team)
  - Document when to use
```

---

### 3. `nuxt-crouton-supersaas`

**Current State:**
- Provides connectors for external auth systems (SuperSaaS, NuxSaaS)
- Used when schemas have `:users` or `:teams` references
- Has `useUsers()` composable

**Questions:**
- [ ] Does this package become obsolete with `@crouton/auth`?
- [ ] Or does it complement `@crouton/auth` for specific use cases?
- [ ] How do `:users` and `:teams` references work with `@crouton/auth`?
- [ ] Should this be merged into `@crouton/auth` or remain separate?

**Files to Review:**
- `connectors/supersaas/`
- `connectors/nuxsaas/`
- How generator handles `:users` references

---

### 4. `nuxt-crouton-i18n`

**Current State:**
- `useT()` has team override support
- Translation lookup: Team Override → System → JSON → Key
- Team-scoped translations in database

**Questions:**
- [ ] How does `useT()` get team context? Direct or via `@crouton/auth`?
- [ ] Is there duplicate team resolution logic?
- [ ] Should translations always be team-scoped?

**Files to Review:**
- `app/composables/useT.ts`
- Team override lookup logic

---

### 5. `nuxt-crouton-events`

**Current State:**
- Audit trail for CRUD operations
- Events are team-scoped (`teamId` in schema)

**Questions:**
- [ ] How does event tracking get team context?
- [ ] Is there a listener that needs `@crouton/auth` integration?

**Files to Review:**
- `plugins/event-listener.ts`
- `app/composables/useCroutonEvents.ts`

---

### 6. Other Packages

**Quick Assessment Needed:**
- `nuxt-crouton-assets`: Team-scoped asset ownership?
- `nuxt-crouton-flow`: Team-scoped flows, Yjs room per team?
- `crouton-ai`: Team-scoped conversations?
- `nuxt-crouton-devtools`: Auth-aware for viewing collections?

---

## Consolidated Analysis Checklist

### Team Context Sources

**Current (multiple sources):**
```
nuxt-crouton/server/utils/team-auth.ts
  └── resolveTeamAndCheckMembership()

@crouton/auth/server/utils/team.ts
  └── resolveTeamAndCheckMembership()
  └── requireTeamAdmin()
  └── requireTeamOwner()

Individual packages may have their own team resolution
```

**Target (single source):**
```
@crouton/auth (single source of truth)
  └── All team utilities
  └── All auth utilities
  └── Mode-aware (multi/single/personal)

nuxt-crouton (core)
  └── Re-exports from @crouton/auth OR
  └── Depends on @crouton/auth
```

### API Pattern Consistency

**Check all packages for:**
- [ ] API routes follow `/api/teams/[id]/...` pattern
- [ ] Server handlers use consistent team resolution
- [ ] No hardcoded team IDs or assumptions

### Composable Consistency

**Check all packages for:**
- [ ] `useTeam()` or `useTeamContext()` usage
- [ ] How team ID is obtained
- [ ] SSR safety (useState vs direct refs)

### Database Schema Consistency

**Check all packages for:**
- [ ] `teamId` field present where needed
- [ ] Team-scoped indexes
- [ ] Consistent field naming

---

## Recommended Analysis Order

1. **Map current state** - Document how each package handles teams today
2. **Define target state** - Decide on `@crouton/auth` as single source
3. **Identify gaps** - What needs to change in each package
4. **Plan migration** - Breaking changes vs gradual deprecation
5. **Update generator** - Align generated code with new architecture
6. **Update docs** - CLAUDE.md files, examples, external docs

---

## Output Deliverables

After analysis, produce:

1. **Packages Dependency Graph** - Visual showing auth dependencies
2. **Breaking Changes List** - What will break for existing users
3. **Migration Guide** - Step-by-step for existing projects
4. **Updated CLAUDE.md files** - Per-package documentation
5. **Generator Changes Plan** - Specific changes to generator
6. **Cleanup PR List** - Ordered list of PRs to execute cleanup

---

## Timeline Considerations

- [ ] Is `@crouton/auth` move blocking this analysis?
- [ ] Can analysis proceed in parallel with move?
- [ ] What's the urgency for deprecating `useTeamUtility`?
- [ ] Are there external users who need migration time?

---

## Notes

_Add notes during analysis here_

```
[Date] - [Note]
```
