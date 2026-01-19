# DevOps Progress Tracker

Unified tracker for CI, testing, and release infrastructure across all plans.

---

## Quick Stats

| Metric | Value |
|--------|-------|
| Tasks Completed | 2 / 15 |
| Total Estimated | ~19.5 hours |
| Plans Covered | 2 |

---

## Plans Covered

| Plan | Focus | Est. Hours | Status |
|------|-------|------------|--------|
| [PLAN-crouton-ci.md](./PLAN-crouton-ci.md) | Release tooling, docs checks, package validation | 1.5h | Planning |
| [PLAN-testing.md](./PLAN-testing.md) | Unit tests, integration tests, E2E | 18h | Planning |

---

## Implementation Order

Tasks are ordered by dependency and priority. Complete top-to-bottom.

### Sprint 1: Foundation (4 hours)

Get existing tests running in CI, establish tooling baseline.

| # | Task | Plan | Hours | Status | Notes |
|---|------|------|-------|--------|-------|
| 1.1 | [x] ✅ Fix CI to run all existing tests | Testing P1 | 2h | Done | Added test job to ci.yml |
| 1.2 | [x] ✅ Add `check-docs.mjs` script | CI P1 | 0.25h | Done | Also created missing crouton/CLAUDE.md |
| 1.3 | [ ] Add docs-check job to CI | CI P1 | 0.25h | Pending | Fail CI if docs missing |
| 1.4 | [ ] Install @nuxt/test-utils | Testing P1.5 | 0.5h | Pending | `pnpm add -D @nuxt/test-utils` |
| 1.5 | [ ] Migrate 1 composable test to @nuxt/test-utils | Testing P1.5 | 1h | Pending | Prove the pattern works |

**Sprint 1 Definition of Done**:
- [ ] `pnpm test` runs all ~60 existing tests
- [ ] CI runs tests on every push
- [ ] CI fails if any package missing CLAUDE.md
- [ ] One composable test uses `mockNuxtImport`

---

### Sprint 2: Release Tooling (1.5 hours)

Set up changelog generation and package validation.

| # | Task | Plan | Hours | Status | Notes |
|---|------|------|-------|--------|-------|
| 2.1 | [ ] Install changelogithub | CI P3 | 0.25h | Pending | `pnpm add -D changelogithub -w` |
| 2.2 | [ ] Create changelogithub.config.ts | CI P3 | 0.25h | Pending | Scope mapping for all packages |
| 2.3 | [ ] Install publint + attw | CI P4 | 0.25h | Pending | `pnpm add -D publint @arethetypeswrong/cli -w` |
| 2.4 | [ ] Add package-check CI job | CI P4 | 0.25h | Pending | Run publint + attw on @fyit/crouton |
| 2.5 | [ ] Test release workflow | CI P3 | 0.5h | Pending | Dry-run `pnpm changelog` |

**Sprint 2 Definition of Done**:
- [ ] `pnpm changelog` generates release notes
- [ ] CI fails if package exports are broken
- [ ] CI fails if TypeScript types don't resolve

---

### Sprint 3: CLI Testing (4 hours)

Test the code generator - highest risk for external users.

| # | Task | Plan | Hours | Status | Notes |
|---|------|------|-------|--------|-------|
| 3.1 | [ ] Add snapshot tests for form-component.mjs | Testing P2 | 1h | Pending | Field type → component mapping |
| 3.2 | [ ] Add snapshot tests for api-endpoints.mjs | Testing P2 | 1h | Pending | Route generation |
| 3.3 | [ ] Add snapshot tests for database-schema.mjs | Testing P2 | 1h | Pending | Drizzle schema generation |
| 3.4 | [ ] Add unit tests for remaining generators | Testing P2 | 1h | Pending | Types, composables, seed |

**Sprint 3 Definition of Done**:
- [ ] Each generator has at least one snapshot test
- [ ] Field type changes cause snapshot failures
- [ ] CI catches generator regressions

---

### Sprint 4: Auth Testing (4 hours)

Test security-critical authentication flows.

| # | Task | Plan | Hours | Status | Notes |
|---|------|------|-------|--------|-------|
| 4.1 | [ ] Create test database fixtures | Testing P3 | 1h | Pending | In-memory SQLite setup |
| 4.2 | [ ] Test resolveTeamAndCheckMembership | Testing P3 | 1h | Pending | Team auth server utility |
| 4.3 | [ ] Test scoped access tokens | Testing P3 | 1h | Pending | Create, validate, revoke |
| 4.4 | [ ] Migrate auth composable tests to @nuxt/test-utils | Testing P1.5 | 1h | Pending | useAuth, useSession, useTeam |

**Sprint 4 Definition of Done**:
- [ ] Server-side auth utilities have integration tests
- [ ] Scoped access tokens tested end-to-end
- [ ] Auth composable tests use mockNuxtImport

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

### [Date]

**Completed**:
- (none yet)

**Blocked**:
- (none yet)

**Notes**:
- (none yet)

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
- [ ] CI fails if any package is missing CLAUDE.md
- [ ] `pnpm changelog` generates release notes from commits
- [ ] CI fails if package.json exports don't match built files (publint)
- [ ] CI fails if TypeScript types don't resolve correctly (attw)
- [ ] Field types stay in sync (already working)

From **PLAN-testing.md**:
- [ ] CI runs all existing tests (~60)
- [ ] CLI generator has snapshot tests for each output type
- [ ] Auth server utilities have integration tests
- [ ] Core API endpoints have contract tests
- [ ] E2E smoke tests exist for auth + CRUD flows
