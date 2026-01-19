# Nuxt Crouton Testing Plan

## One-liner

Practical testing strategy for a solo-dev Nuxt monorepo: prioritize what breaks, automate what matters, skip the vanity metrics.

---

## Quick Reference

| Item | Value |
|------|-------|
| Status | Planning |
| Estimated effort | ~18 hours for Phase 1-4 |
| Tech stack | Vitest + @nuxt/test-utils + Playwright |
| Coverage target | None (test what matters, not percentages) |
| Related Plan | [PLAN-crouton-ci.md](./PLAN-crouton-ci.md) - Release tooling |

---

## Current State

### What Already Exists

| Package | Test Files | Type | Notes |
|---------|------------|------|-------|
| crouton-core | 22 | Unit | Composable tests with manual mocking |
| crouton-auth | 9 | Unit + Integration | Better Auth mocking, some TODOs |
| crouton-cli | 7 | Unit | Helpers, generators |
| crouton-collab | 6 | Unit + Integration | Components, WebSocket flow |
| crouton-flow | 6 | Unit + E2E | All E2E tests skipped |
| crouton-i18n | 4 | Unit | Composables |
| crouton-mcp | 2 | Unit | Field types, schema validation |
| crouton-assets | 1 | Unit | Upload composable |
| **Total** | **~60** | Mixed | **CI only runs MCP tests** |

### What's Missing

1. **CI doesn't run most tests** - Only MCP server tests in workflow
2. **No E2E tests actually run** - All Playwright tests are `.skip()`
3. **No server-side testing** - API endpoints untested
4. **No component tests** - Vue components untested
5. **Critical packages untested**: bookings, sales, pages, email, admin

### Testing Patterns in Use

```typescript
// Current pattern: Manual Nuxt mocking
vi.stubGlobal('useRoute', () => mockRoute)
vi.stubGlobal('useNuxtApp', () => ({ $authClient: mockAuthClient }))
vi.stubGlobal('$fetch', mockFetch)
```

This works but is verbose. Better patterns exist.

---

## Testing Philosophy

### Test What Breaks

| Priority | What | Why |
|----------|------|-----|
| **High** | CLI code generation | External users depend on correct output |
| **High** | Auth flows | Security-critical, complex state |
| **High** | Database queries | Data integrity |
| **Medium** | Core composables | Foundation for everything else |
| **Medium** | API endpoints | Contract with frontend |
| **Low** | UI components | Visual testing is expensive |
| **Skip** | Generated code | Test the generator, not the output |

### What NOT to Test

- Generated form components (test the generator instead)
- Styling/layout (use visual regression if you care)
- Third-party library behavior (they have their own tests)
- Happy paths that never fail

---

## Package Priority Order

Based on risk/impact analysis:

### Tier 1: Must Have Tests (Public/Security-Critical)

| Package | Risk | Current Coverage | Priority |
|---------|------|------------------|----------|
| **crouton-cli** | High - external users | 7 tests | Add generator output tests |
| **crouton-auth** | High - security | 9 tests | Add more integration tests |
| **crouton** (main) | High - public module | 0 tests | Module configuration tests |

### Tier 2: Should Have Tests (Core Functionality)

| Package | Risk | Current Coverage | Priority |
|---------|------|------------------|----------|
| **crouton-core** | Medium | 22 tests | Add API/server tests |
| **crouton-mcp** | Medium | 2 tests | Sufficient for now |
| **crouton-i18n** | Medium | 4 tests | Add translation resolution |

### Tier 3: Nice to Have (Feature Packages)

| Package | Risk | Current Coverage | Priority |
|---------|------|------------------|----------|
| crouton-bookings | Low | 0 | Skip until stable |
| crouton-sales | Low | 0 | Skip until stable |
| crouton-pages | Low | 0 | Skip until stable |
| crouton-collab | Low | 6 tests | Sufficient |
| crouton-flow | Low | 6 tests | Sufficient |

---

## Tech Stack Decisions

### Unit Tests: Vitest (already in use)

```bash
# Already configured
pnpm add -D vitest @vitest/coverage-v8 @vitest/ui
```

### @nuxt/test-utils: Adopt for Nuxt-Dependent Tests

Per [Nuxt 4 testing docs](https://nuxt.com/docs/4.x/getting-started/testing), we should use `@nuxt/test-utils` for composables that depend on Nuxt runtime features.

```bash
pnpm add -D @nuxt/test-utils @vue/test-utils happy-dom -w
```

**Tiered approach**:

| Test Type | Environment | Approach |
|-----------|-------------|----------|
| Pure utilities (CLI, MCP) | Node | Manual mocking, fast |
| Nuxt composables | Nuxt runtime | `@nuxt/test-utils`, `mockNuxtImport` |
| Components | Nuxt runtime | `mountSuspended` (if needed) |
| E2E | Browser | Playwright |

**Current gap**: We use `vi.stubGlobal()` everywhere, which works but isn't idiomatic:

```typescript
// Current (manual) - works but verbose
vi.stubGlobal('useRoute', () => mockRoute)
vi.stubGlobal('$fetch', mockFetch)

// Recommended (@nuxt/test-utils) - cleaner, tests real behavior
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
mockNuxtImport('useRoute', () => () => mockRoute)
```

**Migration strategy**: Keep manual mocking for pure unit tests, migrate composable tests to `@nuxt/test-utils` in Phase 1.5.

### Integration Tests: Vitest + Custom Fixtures

For database/API testing, create lightweight fixtures instead of full Nuxt environment:

```typescript
// tests/fixtures/db.ts
import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'

export function createTestDb() {
  const sqlite = new Database(':memory:')
  return drizzle(sqlite)
}
```

### E2E Tests: Playwright (for critical paths only)

```bash
pnpm add -D @playwright/test
```

Keep E2E minimal. Only test:
- Complete auth flows (login → dashboard → logout)
- Collection CRUD operations
- Team switching

**Don't test**: Every form field, every button click, visual appearance.

### What About @nuxt/test-utils?

**Recommendation: Skip for now.**

Why:
- Current manual mocking works
- @nuxt/test-utils adds complexity
- Solo dev doesn't need perfect isolation
- Migrate later if pain points emerge

When to reconsider:
- Testing server middleware
- Testing plugin behavior
- Need `mountSuspended` for complex components

---

## Implementation Plan

### Phase 1: Fix CI (2 hours)

**Problem**: CI only runs MCP tests, ignoring 50+ other tests.

**Solution**: Update `.github/workflows/ci.yml`:

```yaml
test:
  name: Unit Tests
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: pnpm/action-setup@v4
      with:
        version: 10
    - uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'pnpm'
    - run: pnpm install --frozen-lockfile
    - run: pnpm test
```

Add package-specific test scripts:

```json
// packages/crouton-core/package.json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

**Files to change**:
- `.github/workflows/ci.yml`
- `packages/*/package.json` (add test scripts where missing)

---

### Phase 1.5: Adopt @nuxt/test-utils (2 hours)

**Why**: Our manual `vi.stubGlobal()` mocking works but doesn't follow [Nuxt 4 testing best practices](https://nuxt.com/docs/4.x/getting-started/testing). For composables that heavily use Nuxt features, `@nuxt/test-utils` provides better DX and tests real behavior.

**Setup**:

```bash
pnpm add -D @nuxt/test-utils @vue/test-utils happy-dom -w
```

**Project-based vitest config** (recommended by Nuxt docs):

```typescript
// vitest.config.ts (workspace root)
import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    environment: 'nuxt',
    environmentOptions: {
      nuxt: {
        domEnvironment: 'happy-dom'
      }
    }
  }
})
```

**What to migrate**:

| Package | Current Location | New Location | Notes |
|---------|------------------|--------------|-------|
| crouton-core | `app/composables/__tests__/` | `test/nuxt/` | Uses useRoute, $fetch, useNuxtApp |
| crouton-auth | `tests/unit/composables/` | `test/nuxt/` | Uses useNuxtApp, useSession |
| crouton-i18n | `app/composables/__tests__/` | `test/nuxt/` | Uses useNuxtApp |

**What to keep as-is** (pure Node, no Nuxt runtime):

| Package | Location | Why |
|---------|----------|-----|
| crouton-cli | `tests/` | Pure utilities, no Nuxt |
| crouton-mcp | `tests/` | Pure utilities, no Nuxt |

**Example migration**:

```typescript
// Before: packages/crouton-core/app/composables/__tests__/useCollectionMutation.test.ts
vi.stubGlobal('useRoute', () => mockRoute)
vi.stubGlobal('$fetch', mockFetch)
vi.stubGlobal('useNuxtApp', () => ({
  payload: { data: mockPayloadData },
  hooks: { callHook: mockCallHook }
}))

// After: packages/crouton-core/test/nuxt/useCollectionMutation.nuxt.spec.ts
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

mockNuxtImport('useRoute', () => () => mockRoute)
mockNuxtImport('$fetch', () => mockFetch)
mockNuxtImport('useNuxtApp', () => () => ({
  payload: { data: mockPayloadData },
  hooks: { callHook: mockCallHook }
}))
```

**Key utilities from @nuxt/test-utils**:

| Utility | Purpose |
|---------|---------|
| `mockNuxtImport` | Mock auto-imported functions |
| `mountSuspended` | Mount components with Nuxt context |
| `registerEndpoint` | Mock Nitro API endpoints |
| `mockComponent` | Replace components with test doubles |

**Note**: `mockNuxtImport` can only be used once per import per test file (it uses `vi.mock` hoisting).

---

### Phase 2: CLI Generator Tests (4 hours)

**Why**: External users depend on correct code generation. This is your biggest risk.

**What to test**:

1. **Field type → code generation mapping**
   ```typescript
   describe('form-component generator', () => {
     it('generates UInput for string fields', () => {
       const output = generateFormComponent({
         fields: { name: { type: 'string' } }
       })
       expect(output).toContain('<UInput')
     })

     it('generates USwitch for boolean fields', () => {
       const output = generateFormComponent({
         fields: { active: { type: 'boolean' } }
       })
       expect(output).toContain('<USwitch')
     })
   })
   ```

2. **API endpoint generation**
   ```typescript
   describe('api-endpoints generator', () => {
     it('generates correct route params', () => {
       const output = generateApiGet({ layer: 'shop', collection: 'products' })
       expect(output).toContain('/api/teams/[id]/shop-products')
     })
   })
   ```

3. **Schema generation**
   ```typescript
   describe('database-schema generator', () => {
     it('generates correct Drizzle types', () => {
       const output = generateSchema({
         fields: { price: { type: 'decimal', meta: { precision: 10, scale: 2 } } }
       })
       expect(output).toContain('real(')
     })
   })
   ```

**Pattern**: Snapshot tests for full generated files, unit tests for logic.

```typescript
// Full file snapshot
it('generates complete form component', () => {
  const output = generateFormComponent(fixtureSchema)
  expect(output).toMatchSnapshot()
})
```

---

### Phase 3: Auth Integration Tests (4 hours)

**Why**: Security-critical, complex state machine.

**What to test**:

1. **Server-side auth utilities**
   ```typescript
   describe('resolveTeamAndCheckMembership', () => {
     it('returns team and member for valid request', async () => {
       const event = createMockEvent({ teamId: 'team-1', userId: 'user-1' })
       const result = await resolveTeamAndCheckMembership(event)
       expect(result.team.id).toBe('team-1')
       expect(result.member.role).toBe('member')
     })

     it('throws for non-member', async () => {
       const event = createMockEvent({ teamId: 'team-1', userId: 'non-member' })
       await expect(resolveTeamAndCheckMembership(event)).rejects.toThrow()
     })
   })
   ```

2. **Scoped access tokens**
   ```typescript
   describe('createScopedToken', () => {
     it('creates token with expiration', async () => {
       const { token, expiresAt } = await createScopedToken({
         organizationId: 'team-1',
         resourceType: 'event',
         resourceId: 'event-1',
         displayName: 'Helper'
       })
       expect(token).toMatch(/^[a-zA-Z0-9]+$/)
       expect(expiresAt).toBeInstanceOf(Date)
     })
   })
   ```

**Fixture approach**: Use in-memory SQLite for database tests.

```typescript
// tests/fixtures/auth-db.ts
import { createTestDb } from './db'
import * as schema from '../../server/database/schema/auth'

export async function setupAuthTestDb() {
  const db = createTestDb()
  // Run migrations
  // Seed test data
  return { db, testUser, testTeam }
}
```

---

### Phase 4: Core API Tests (4 hours)

**Why**: API contracts matter for frontend stability.

**What to test**:

1. **Collection CRUD endpoints**
   ```typescript
   describe('GET /api/teams/[id]/[collection]', () => {
     it('returns paginated results', async () => {
       const response = await $fetch('/api/teams/test-team/products', {
         query: { page: 1, pageSize: 10 }
       })
       expect(response.items).toHaveLength(10)
       expect(response.total).toBeGreaterThan(10)
     })

     it('requires team membership', async () => {
       // Without auth
       await expect($fetch('/api/teams/test-team/products'))
         .rejects.toMatchObject({ statusCode: 401 })
     })
   })
   ```

2. **Query parameter handling**
   ```typescript
   it('filters by search query', async () => {
     const response = await $fetch('/api/teams/test-team/products', {
       query: { search: 'widget' }
     })
     expect(response.items.every(p => p.name.includes('widget'))).toBe(true)
   })
   ```

**Approach**: Test against real database with fixtures, not mocks.

---

### Phase 5: E2E Smoke Tests (2 hours)

**Why**: Catch integration issues that unit tests miss.

**Scope**: Minimal. Only critical paths.

```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('user can login and access dashboard', async ({ page }) => {
    await page.goto('/auth/login')
    await page.fill('[name="email"]', 'test@example.com')
    await page.fill('[name="password"]', 'password123')
    await page.click('button[type="submit"]')

    await expect(page).toHaveURL(/dashboard/)
    await expect(page.locator('h1')).toContainText('Dashboard')
  })

  test('user can logout', async ({ page }) => {
    // Login first, then logout
    await page.goto('/dashboard')
    await page.click('[data-testid="user-menu"]')
    await page.click('[data-testid="logout"]')

    await expect(page).toHaveURL('/auth/login')
  })
})

// e2e/collection.spec.ts
test.describe('Collections', () => {
  test('create, edit, delete item', async ({ page }) => {
    await page.goto('/dashboard/test-team/products')

    // Create
    await page.click('[data-testid="create-button"]')
    await page.fill('[name="name"]', 'Test Product')
    await page.click('[data-testid="save-button"]')
    await expect(page.locator('text=Test Product')).toBeVisible()

    // Edit
    await page.click('text=Test Product')
    await page.fill('[name="name"]', 'Updated Product')
    await page.click('[data-testid="save-button"]')
    await expect(page.locator('text=Updated Product')).toBeVisible()

    // Delete
    await page.click('[data-testid="delete-button"]')
    await page.click('[data-testid="confirm-delete"]')
    await expect(page.locator('text=Updated Product')).not.toBeVisible()
  })
})
```

**Run E2E locally, not in CI** (for now). Too slow and flaky for every commit.

---

## What to Test When Dependencies Update

| Dependency | What to Verify |
|------------|----------------|
| `better-auth` | Auth flows still work, session handling |
| `nuxt` | Auto-imports resolve, build works |
| `@nuxt/ui` | Component props haven't changed |
| `drizzle-orm` | Query syntax, migration format |
| `vue-flow` | Node/edge data format |

Add these as upgrade checklist items, not automated tests.

---

## CI vs Local Testing

| Test Type | Where | Frequency |
|-----------|-------|-----------|
| Unit tests | CI | Every commit |
| Integration tests | CI | Every commit |
| Type checking | CI | Every commit |
| E2E tests | Local | Before releases |
| Visual tests | Never | Not worth the effort |

### CI Workflow

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint-and-typecheck:
    name: Lint & Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 10
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm --filter @fyit/crouton-mcp build
      - run: pnpm --filter @fyit/crouton-mcp typecheck

  test:
    name: Unit & Integration Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 10
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm test

  sync-validation:
    name: Sync Validation
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: node scripts/validate-field-types-sync.mjs
```

---

## Mocking Strategy

### Current Pattern (Keep)

```typescript
// Manual Nuxt mocking - works fine
vi.stubGlobal('useRoute', () => mockRoute)
vi.stubGlobal('$fetch', mockFetch)
```

### When to Use Real Dependencies

| Scenario | Mock | Real |
|----------|------|------|
| Database queries | ❌ | ✅ In-memory SQLite |
| Auth client | ✅ | ❌ |
| External APIs | ✅ | ❌ |
| Vue reactivity | ❌ | ✅ Use ref/computed |
| File system (CLI) | ✅ Dry-run | ✅ Temp dirs for integration |

### Database Test Setup

```typescript
// tests/fixtures/db.ts
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'

export function createTestDb(schema: any) {
  const sqlite = new Database(':memory:')
  const db = drizzle(sqlite, { schema })

  // Run migrations synchronously for tests
  migrate(db, { migrationsFolder: './migrations' })

  return db
}

export function seedTestData(db: any) {
  // Insert test fixtures
  return {
    testUser: { id: 'user-1', email: 'test@example.com' },
    testTeam: { id: 'team-1', slug: 'test-team' }
  }
}
```

---

## Success Criteria

- [ ] CI runs all existing tests (currently ~60)
- [ ] CLI generator has snapshot tests for each output type
- [ ] Auth server utilities have integration tests
- [ ] Core API endpoints have contract tests
- [ ] E2E smoke tests exist for auth + CRUD flows

**Explicitly NOT goals**:
- 80% coverage
- Every component tested
- Every edge case covered
- E2E in CI

---

## Implementation Timeline

| Phase | Scope | Hours | Priority |
|-------|-------|-------|----------|
| 1 | Fix CI to run all tests | 2h | **Do first** |
| 1.5 | Adopt @nuxt/test-utils | 2h | High |
| 2 | CLI generator tests | 4h | High |
| 3 | Auth integration tests | 4h | High |
| 4 | Core API tests | 4h | Medium |
| 5 | E2E smoke tests | 2h | Low |

**Total: ~18 hours** for meaningful coverage of high-risk areas.

---

## References

- [Nuxt Testing Docs](https://nuxt.com/docs/4.x/getting-started/testing)
- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- Existing tests: `packages/crouton-core/app/composables/__tests__/`
- CI workflow: `.github/workflows/ci.yml`
