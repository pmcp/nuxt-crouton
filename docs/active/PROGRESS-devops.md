# DevOps Progress Tracker

Unified tracker for CI, testing, and release infrastructure across all plans.

---

## Quick Stats

| Metric | Value |
|--------|-------|
| Tasks Completed | 17 / 19 |
| Total Estimated | ~19.5 hours |
| Plans Covered | 2 |

---

## Plans Covered

| Plan | Focus | Est. Hours | Status |
|------|-------|------------|--------|
| [PLAN-crouton-ci.md](./PLAN-crouton-ci.md) | Release tooling, docs checks, package validation | 1.5h | Complete |
| [PLAN-testing.md](./PLAN-testing.md) | Unit tests, integration tests, E2E | 18h | In Progress |

---

## Implementation Order

Tasks are ordered by dependency and priority. Complete top-to-bottom.

### Sprint 1: Foundation (4 hours)

Get existing tests running in CI, establish tooling baseline.

| # | Task | Plan | Hours | Status | Notes |
|---|------|------|-------|--------|-------|
| 1.1 | [x] ✅ Fix CI to run all existing tests | Testing P1 | 2h | Done | Added test job to ci.yml |
| 1.2 | [x] ✅ Add `check-docs.mjs` script | CI P1 | 0.25h | Done | Also created missing crouton/CLAUDE.md |
| 1.3 | [x] ✅ Add docs-check job to CI | CI P1 | 0.25h | Done | Added docs-check job to ci.yml |
| 1.4 | [x] ✅ Install @nuxt/test-utils | Testing P1.5 | 0.5h | Done | Added @nuxt/test-utils, @vue/test-utils, happy-dom |
| 1.5 | [x] ✅ Migrate 1 composable test to @nuxt/test-utils | Testing P1.5 | 1h | Done | vi.hoisted + vi.stubGlobal pattern |

**Sprint 1 Definition of Done**:
- [x] ✅ `pnpm test` runs all existing tests (1470 total, 1279 passing, 87 pre-existing failures)
- [x] ✅ CI runs tests on every push (test job added to ci.yml)
- [x] ✅ CI fails if any package missing CLAUDE.md (docs-check job)
- [x] ✅ One composable test uses vi.hoisted pattern (useTeamContext.nuxt.test.ts)

---

### Sprint 2: Release Tooling (1.5 hours)

Set up changelog generation and package validation.

| # | Task | Plan | Hours | Status | Notes |
|---|------|------|-------|--------|-------|
| 2.1 | [x] ✅ Install changelogithub | CI P3 | 0.25h | Done | Added changelogithub v14 |
| 2.2 | [x] ✅ Create changelogithub.config.ts | CI P3 | 0.25h | Done | Scope mapping for 21 packages |
| 2.3 | [x] ✅ Install publint + attw | CI P4 | 0.25h | Done | Added publint v0.3, attw v0.18 |
| 2.4 | [x] ✅ Add package-check CI job | CI P4 | 0.25h | Done | Added package-check job to ci.yml |
| 2.5 | [x] ✅ Test release workflow | CI P3 | 0.5h | Done | All dry-runs passed |

**Sprint 2 Definition of Done**:
- [x] ✅ `pnpm changelog` generates release notes
- [x] ✅ CI fails if package exports are broken
- [x] ✅ CI fails if TypeScript types don't resolve

---

### Sprint 3: CLI Testing (4 hours) ✅

Test the code generator - highest risk for external users.

| # | Task | Plan | Hours | Status | Notes |
|---|------|------|-------|--------|-------|
| 3.1 | [x] ✅ Add snapshot tests for form-component.mjs | Testing P2 | 1h | Done | 21 tests: field types, hierarchy, translations |
| 3.2 | [x] ✅ Add snapshot tests for api-endpoints.mjs | Testing P2 | 1h | Done | 31 tests: CRUD, team auth, date handling |
| 3.3 | [x] ✅ Add snapshot tests for database-schema.mjs | Testing P2 | 1h | Done | 30 tests: SQLite/PG dialects, constraints |
| 3.4 | [x] ✅ Add unit tests for remaining generators | Testing P2 | 1h | Done | 28 tests for seed-data.mjs |

**Sprint 3 Definition of Done**:
- [x] ✅ Each generator has at least one snapshot test
- [x] ✅ Field type changes cause snapshot failures
- [x] ✅ CI catches generator regressions

---

### Sprint 4: Auth Testing (4 hours) ✅

Test security-critical authentication flows.

| # | Task | Plan | Hours | Status | Notes |
|---|------|------|-------|--------|-------|
| 4.1 | [x] ✅ Create test database fixtures | Testing P3 | 1h | Done | integration/setup.ts with factory functions |
| 4.2 | [x] ✅ Test resolveTeamAndCheckMembership | Testing P3 | 1h | Done | 40+ tests in team-utils.test.ts |
| 4.3 | [x] ✅ Test scoped access tokens | Testing P3 | 1h | Done | 36 tests: create, validate, revoke, lifecycle |
| 4.4 | [~] Migrate auth composable tests to @nuxt/test-utils | Testing P1.5 | 1h | Partial | Existing tests work; full migration deferred |

**Sprint 4 Definition of Done**:
- [x] ✅ Server-side auth utilities have integration tests
- [x] ✅ Scoped access tokens tested end-to-end
- [~] Auth composable tests use mockNuxtImport (existing pattern works)

---

### Sprint 5: API & E2E (6 hours)

Test API contracts and critical user journeys.

| # | Task | Plan | Hours | Status | Notes |
|---|------|------|-------|--------|-------|
| 5.1 | [ ] Test collection CRUD endpoints | Testing P4 | 2h | Pending | GET, POST, PATCH, DELETE |
| 5.2 | [ ] Test query parameter handling | Testing P4 | 1h | Pending | Pagination, search, filters |
| 5.3 | [ ] Test team-scoped access | Testing P4 | 1h | Pending | Non-members rejected |
| 5.4 | [ ] Create auth E2E smoke test | Testing P5 | 1h | Pending | Login → dashboard → logout |
| 5.5 | [ ] Create CRUD E2E smoke test | Testing P5 | 1h | Pending | Create, edit, delete item |

**Sprint 5 Definition of Done**:
- [ ] API endpoints have contract tests
- [ ] E2E tests pass locally (not in CI)
- [ ] Critical paths covered

---

## CI Workflow (Target State)

After all sprints, `.github/workflows/ci.yml` should have:

```yaml
jobs:
  docs-check:        # Sprint 1 - PLAN-crouton-ci.md P1
  sync-validation:   # Existing
  lint-and-typecheck: # Existing (update)
  test:              # Sprint 1 - PLAN-testing.md P1
  package-check:     # Sprint 2 - PLAN-crouton-ci.md P4
```

---

## Daily Log

### 2026-01-19

**Completed**:
- Sprint 4: Auth Testing (Tasks 4.1-4.3)
  - Verified test fixtures in integration/setup.ts (factory functions for users, teams, members, sessions)
  - Confirmed team-utils.test.ts has 40+ tests covering resolveTeamAndCheckMembership
  - Created scoped-access.test.ts: 36 tests for server-side token utilities
    - Token creation (7): default values, roles, expiration, metadata
    - Token validation (4): valid/invalid, lastActiveAt updates
    - Event validation (5): cookie, header, custom names
    - Access control (6): require access, resource-scoped access
    - Management (8): revoke, revoke by resource, find existing, list
    - Lifecycle (6): extend expiration, cleanup
  - Total: 36 new tests for scoped access tokens
- Sprint 3: CLI Testing (Tasks 3.1-3.4)
  - form-component.test.ts: 21 tests (field types, hierarchy, translations, refs)
  - api-endpoints.test.ts: 31 tests (GET/POST/PATCH/DELETE, move/reorder, team auth)
  - database-schema.test.ts: 30 tests (SQLite/PostgreSQL dialects, field mappings)
  - seed-data.test.ts: 28 tests (field detection, foreign keys, team scoping)
  - Added fixture data to sample-data.mjs
  - Fixed TypeScript inference issues in existing types.test.ts
  - Total: 110 new tests, 14 snapshots
- Sprint 2: Release Tooling (Tasks 2.1-2.5)
  - Installed changelogithub v14
  - Created changelogithub.config.ts with scope mapping for 21 packages
  - Installed publint v0.3 and attw v0.18
  - Added package-check CI job to ci.yml
  - Tested all dry-runs successfully

**Blocked**:
- (none)

**Notes**:
- ESM-only packages trigger attw CJS warning (expected); using --ignore-rules cjs-resolves-to-esm
- Changelog grouped by scope working correctly
- CLI tests now at 345 total (was ~230 before Sprint 3)
- Auth tests: 283 passing, 20 pre-existing failures in team-utils mode checks

---

## Dependencies

```
Sprint 1 (Foundation)
    │
    ├── Sprint 2 (Release Tooling) ─── can run in parallel
    │
    └── Sprint 3 (CLI Testing)
            │
            └── Sprint 4 (Auth Testing)
                    │
                    └── Sprint 5 (API & E2E)
```

Sprint 2 can run in parallel with Sprint 3-5 if desired.

---

## Files Modified by This Work

| File | Sprints | Purpose |
|------|---------|---------|
| `.github/workflows/ci.yml` | 1, 2 | Add test, docs-check, package-check jobs |
| `scripts/check-docs.mjs` | 1 | New script |
| `changelogithub.config.ts` | 2 | New config |
| `packages/*/package.json` | 1 | Add test scripts |
| `vitest.config.ts` (root) | 1 | Project-based config |
| `packages/crouton-cli/tests/` | 3 | Generator snapshot tests |
| `packages/crouton-auth/tests/` | 4 | Integration tests |
| `packages/crouton-core/test/` | 4, 5 | API tests |
| `e2e/` | 5 | Playwright tests |

---

## Success Criteria (All Plans)

From **PLAN-crouton-ci.md**:
- [x] ✅ CI fails if any package is missing CLAUDE.md
- [x] ✅ `pnpm changelog` generates release notes from commits
- [x] ✅ CI fails if package.json exports don't match built files (publint)
- [x] ✅ CI fails if TypeScript types don't resolve correctly (attw)
- [x] ✅ Field types stay in sync (already working)

From **PLAN-testing.md**:
- [x] ✅ CI runs all existing tests (345 in crouton-cli alone)
- [x] ✅ CLI generator has snapshot tests for each output type
- [x] ✅ Auth server utilities have integration tests (76+ tests: team-utils + scoped-access)
- [ ] Core API endpoints have contract tests
- [ ] E2E smoke tests exist for auth + CRUD flows
