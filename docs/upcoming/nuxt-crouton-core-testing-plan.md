c# nuxt-crouton Core Package Testing Plan

**Created**: 2024-12-21
**Package**: `packages/nuxt-crouton`
**Priority**: CRITICAL - Foundation layer for all other packages

## Executive Summary

The core `nuxt-crouton` package has **22 composables but only 1 has tests** (useCollectionProxy). This is a critical gap since every other crouton package depends on this foundation. This plan outlines a phased approach to achieve comprehensive test coverage.

## Current State

| Metric | Value |
|--------|-------|
| Total Composables | 22 |
| Tested | 1 (useCollectionProxy) |
| Coverage | ~4.5% |
| Test Framework | Vitest |

### Existing Test Pattern

From `useCollectionProxy.test.ts`:
- Uses Vitest with `describe`/`it`/`expect`
- Tests pure functions directly
- No mocking needed for simple transforms

---

## Phase 1: Pure Logic Composables (Quick Wins)

**Effort**: Low | **Impact**: High | **No mocking required**

These composables have pure transformation logic that can be tested in isolation.

### 1.1 useTableData.ts (118 lines)

Tests pagination, search filtering, and row slicing logic.

```typescript
// Test cases
describe('useTableData', () => {
  describe('searchedRows', () => {
    it('returns all rows when search is empty')
    it('filters rows case-insensitively')
    it('searches across all object values')
    it('handles special characters in search')
    it('returns empty array for no matches')
  })

  describe('pagination calculations', () => {
    it('calculates pageFrom correctly')
    it('calculates pageTo correctly')
    it('handles edge case of zero items')
    it('uses server count for server pagination')
    it('uses filtered count for client pagination with search')
  })

  describe('slicedRows', () => {
    it('returns correct page slice for client pagination')
    it('returns all rows for server pagination')
    it('filters server rows when search is active')
    it('handles empty row arrays')
  })
})
```

### 1.2 useTableColumns.ts (148 lines)

Tests column generation and configuration.

```typescript
describe('useTableColumns', () => {
  describe('allColumns', () => {
    it('always includes select checkbox column')
    it('includes user-defined columns in order')
    it('adds createdAt column by default')
    it('adds updatedAt column by default')
    it('adds actions column by default')
    it('hides createdAt when hideDefaultColumns.createdAt is true')
    it('hides all default columns when configured')
  })

  describe('sortable drag handle', () => {
    it('adds drag column when sortable is true')
    it('adds drag column when sortable is object with enabled true')
    it('hides drag column when sortable.handle is false')
    it('does not add drag column when sortable is false')
  })
})
```

### 1.3 useFormatCollections.ts

Tests collection name formatting utilities.

### 1.4 useTableSearch.ts

Tests search query building and debouncing.

---

## Phase 2: State Management Composables (Core)

**Effort**: Medium | **Impact**: Critical | **Mocking: Nuxt composables**

### 2.1 useCrouton.ts (284 lines) - HIGHEST PRIORITY

The central modal/slideover state machine. Tests nested form management.

```typescript
// Mock setup
vi.mock('#app', () => ({
  useRoute: () => ({ path: '/dashboard', params: { team: 'test-team' } }),
  useState: vi.fn((key, init) => ref(init())),
  useToast: () => ({ add: vi.fn() }),
  $fetch: vi.fn()
}))

describe('useCrouton', () => {
  describe('state initialization', () => {
    it('initializes with empty croutonStates array')
    it('showCrouton is false when no states')
    it('loading is notLoading when no states')
  })

  describe('open()', () => {
    it('creates new state with correct id format')
    it('sets action correctly for create/update/delete/view')
    it('adds state to croutonStates array')
    it('respects MAX_DEPTH limit of 5')
    it('shows toast when max depth reached')
    it('blocks open when errors exist')
  })

  describe('nested modals', () => {
    it('allows opening multiple modals up to MAX_DEPTH')
    it('tracks each modal state independently')
    it('close() removes only topmost state')
    it('closeAll() clears all states')
  })

  describe('update/view fetch', () => {
    it('fetches item data for update action')
    it('fetches item data for view action')
    it('uses RESTful path for restful fetchStrategy')
    it('uses query params for query fetchStrategy')
    it('handles super-admin route path')
  })

  describe('pagination', () => {
    it('setPagination merges with existing pagination')
    it('getPagination returns defaults for unknown collection')
    it('getDefaultPagination uses collection config defaults')
  })
})
```

### 2.2 useCollections.ts (105 lines)

Tests collection config registry.

```typescript
vi.mock('#app', () => ({
  useAppConfig: () => ({
    croutonCollections: {
      products: { layer: 'shop', apiPath: 'shop-products', componentName: 'ShopProductsForm' },
      posts: { layer: 'blog', references: { authorId: 'users' } }
    }
  })
}))

describe('useCollections', () => {
  describe('getConfig', () => {
    it('returns config for registered collection')
    it('returns undefined for unregistered collection')
  })

  describe('componentMap', () => {
    it('builds componentMap from configs with componentName')
    it('is reactive')
  })

  describe('dependentFieldComponentMap', () => {
    it('builds map from configs with dependentFieldComponents')
    it('excludes collections without dependent components')
  })
})
```

### 2.3 useTeamContext.ts

Tests team ID/slug extraction from route.

```typescript
describe('useTeamContext', () => {
  describe('getTeamId', () => {
    it('extracts teamId from route params')
    it('extracts from [team] param')
    it('extracts from [id] param')
    it('returns undefined when no team param')
  })

  describe('getTeamSlug', () => {
    it('returns team slug from route')
  })
})
```

---

## Phase 3: API Composables (Integration)

**Effort**: High | **Impact**: Critical | **Mocking: $fetch, Nuxt hooks**

### 3.1 useCollectionQuery.ts (183 lines)

Tests data fetching with caching.

```typescript
vi.mock('#app', () => ({
  useFetch: vi.fn(),
  useRoute: () => ({ path: '/teams/test-team/products', params: { team: 'test-team' } }),
  computed: vi.fn(fn => ({ value: fn() }))
}))

describe('useCollectionQuery', () => {
  describe('cache key generation', () => {
    it('generates key with collection name')
    it('includes query params in key')
    it('different queries produce different keys')
  })

  describe('API path resolution', () => {
    it('uses team-scoped path for normal routes')
    it('uses super-admin path for admin routes')
    it('applies proxy endpoint when configured')
  })

  describe('response handling', () => {
    it('normalizes array response')
    it('normalizes paginated response with items')
    it('applies transform when proxy configured')
    it('returns empty array for null data')
  })

  describe('error handling', () => {
    it('throws for unregistered collection')
    it('logs error when team context missing')
  })
})
```

### 3.2 useCollectionMutation.ts (331 lines)

Tests CRUD operations and cache invalidation.

```typescript
vi.mock('#app', () => ({
  $fetch: vi.fn(),
  useNuxtApp: () => ({
    payload: { data: {} },
    hooks: { callHook: vi.fn() }
  }),
  refreshNuxtData: vi.fn()
}))

describe('useCollectionMutation', () => {
  describe('create', () => {
    it('POSTs to correct endpoint')
    it('invalidates collection cache after success')
    it('emits crouton:mutation hook')
    it('shows success toast')
    it('shows error toast on failure')
    it('refreshes referenced collection caches')
  })

  describe('update', () => {
    it('PATCHes to correct endpoint with id')
    it('invalidates both item and collection cache')
    it('emits crouton:mutation hook with updates')
  })

  describe('deleteItems', () => {
    it('DELETEs each item in parallel')
    it('invalidates item caches for deleted ids')
    it('shows count in success toast')
  })

  describe('cache invalidation', () => {
    it('finds all cache keys with collection prefix')
    it('refreshes referenced collections from config')
    it('handles array references')
  })
})
```

---

## Phase 4: Complex Composables

**Effort**: High | **Impact**: Medium

### 4.1 Tree Composables

- `useTreeDrag.ts` - Drag-and-drop logic
- `useTreeMutation.ts` - Tree structure mutations
- `useTreeItemState.ts` - Tree item expand/collapse state

```typescript
describe('useTreeMutation', () => {
  describe('moveNode', () => {
    it('updates parent reference')
    it('recalculates path')
    it('updates depth')
    it('reorders siblings')
  })
})
```

### 4.2 Dependent Fields

- `useDependentFieldResolver.ts` - Resolves dependent field values

### 4.3 UI State

- `useExpandableSlideover.ts` - Slideover expand/collapse
- `useCroutonError.ts` - Error tracking

---

## Phase 5: Lower Priority

These are simpler or less critical:

- `useUsers.ts` - User data fetching
- `useT.ts` - Translation helper
- `useContentToc.ts` - Table of contents
- `useExternalCollection.ts` - External data sources
- `useCollectionItem.ts` - Single item fetching
- `useCroutonMutate.ts` - Legacy mutation helper

---

## Test Infrastructure Setup

### Directory Structure

```
packages/nuxt-crouton/
├── app/composables/
│   ├── __tests__/
│   │   ├── useCollectionProxy.test.ts  # Existing
│   │   ├── useTableData.test.ts        # Phase 1
│   │   ├── useTableColumns.test.ts     # Phase 1
│   │   ├── useCrouton.test.ts          # Phase 2
│   │   ├── useCollections.test.ts      # Phase 2
│   │   ├── useCollectionQuery.test.ts  # Phase 3
│   │   └── useCollectionMutation.test.ts # Phase 3
│   └── *.ts
├── vitest.config.ts
└── package.json
```

### Vitest Configuration

```typescript
// packages/nuxt-crouton/vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['app/composables/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['app/composables/**/*.ts'],
      exclude: ['app/composables/__tests__/**']
    }
  }
})
```

### Test Utilities

Create shared mocks for Nuxt composables:

```typescript
// app/composables/__tests__/test-utils.ts
import { vi } from 'vitest'
import { ref, computed, reactive } from 'vue'

export const createNuxtMocks = (overrides = {}) => ({
  useRoute: () => ({
    path: '/teams/test-team/products',
    params: { team: 'test-team' }
  }),
  useState: vi.fn((key, init) => ref(init())),
  useAppConfig: () => ({ croutonCollections: {} }),
  useToast: () => ({ add: vi.fn() }),
  useFetch: vi.fn(),
  $fetch: vi.fn(),
  useNuxtApp: () => ({
    payload: { data: {} },
    hooks: { callHook: vi.fn() }
  }),
  refreshNuxtData: vi.fn(),
  computed,
  ref,
  reactive,
  ...overrides
})
```

---

## Coverage Goals

| Phase | Target | Composables |
|-------|--------|-------------|
| Phase 1 | 25% | 4 pure logic composables |
| Phase 2 | 50% | + 3 state management |
| Phase 3 | 75% | + 2 API composables |
| Phase 4 | 90% | + 5 complex composables |
| Phase 5 | 95% | + 6 remaining |

---

## Prioritized Implementation Order

1. **useTableData.ts** - Easy pure functions, high value for table display
2. **useTableColumns.ts** - Column generation logic
3. **useCrouton.ts** - Core modal state machine (most complex but most critical)
4. **useCollections.ts** - Config registry
5. **useCollectionMutation.ts** - CRUD operations
6. **useCollectionQuery.ts** - Data fetching
7. **useTeamContext.ts** - Team extraction
8. Tree composables as a group
9. Remaining composables

---

## Success Criteria

- [ ] All Phase 1-3 composables have >80% line coverage
- [ ] All public functions have at least one test
- [ ] Edge cases documented and tested
- [ ] CI runs tests on every PR
- [ ] No regressions when refactoring

---

## Estimated Effort

| Phase | Composables | Est. Hours |
|-------|-------------|------------|
| Phase 1 | 4 | 4-6 |
| Phase 2 | 3 | 8-12 |
| Phase 3 | 2 | 6-8 |
| Phase 4 | 5 | 10-15 |
| Phase 5 | 6 | 4-6 |
| **Total** | **20** | **32-47 hours** |

---

## Next Steps

1. Verify vitest is set up in package (check package.json)
2. Create test-utils.ts with shared mocks
3. Start with `useTableData.test.ts` as first implementation
4. Establish patterns, then parallelize remaining Phase 1 tests