# Collection Architecture Refactor Briefing

**Date:** 2025-09-30
**Type:** Major Architectural Change (Breaking)
**Risk Level:** 🔴 HIGH
**Estimated Effort:** 1-2 days
**Impact:** All generated collections, core composables

---

## Executive Summary

The current nuxt-crouton architecture uses a global state pattern for collection data that **fundamentally breaks** when you need:
- Pagination (page 1 data lost when loading page 2)
- Multiple filtered views of the same collection
- Independent sort states across components

We need to refactor from **global useState** to **Nuxt's useFetch with query-based caching**, preserving optimistic updates while fixing the root architectural flaw.

**This is dangerous but necessary.** Without this change, the system cannot scale beyond simple single-view CRUD tables.

---

## Current State Analysis

### The Architecture Today

```vue
<!-- Generated List.vue -->
<script setup>
const { data: roles } = await useFetch('/api/roles')
const { adminRoles: collectionAdminRoles } = useCollections()

// ❌ NON-REACTIVE: Only runs once during setup
if (roles.value) {
  collectionAdminRoles.value = roles.value
}
</script>

<template>
  <CroutonList :rows="collectionAdminRoles" />
</template>
```

**How it works:**
1. `useCollections()` creates global `useState('adminRoles', () => [])`
2. Component fetches data with `useFetch`
3. Manual one-time sync: `collectionAdminRoles.value = roles.value`
4. Component binds to global state: `:rows="collectionAdminRoles"`

**Core files:**
- `useCollections.ts` (57 lines) - Creates global state refs for each collection
- `useCrouton.ts` (658 lines) - Manages CRUD operations, updates global state
- Generated `List.vue` - Performs non-reactive sync

---

## The Problems

### Problem 1: Non-Reactive Sync (Immediate Bug)

**Issue Description:**
```vue
// If roles.value is null when this executes:
if (roles.value) {  // ← false, skips
  collectionAdminRoles.value = roles.value
}
// collectionAdminRoles stays empty FOREVER
```

**Manifestation:**
- Toggle table → list layout: List shows empty `<ul>` with no items
- Data exists in fetch result but never reaches the component
- Timing-dependent: Works if data loads fast, fails if slow

**Why It Happens:**
The `if` statement only runs once during component setup. If `useFetch` is still pending, `roles.value` is null, the assignment never happens, and there's no reactivity to try again when data arrives.

---

### Problem 2: "One State Per Collection" (Architectural Flaw)

**The Core Issue:**
```typescript
// useCollections.ts
const collections = {
  adminRoles: useState('adminRoles', () => [])  // ← Only ONE ref
}
```

Every component that uses "adminRoles" shares **the same ref**. You can't have:

#### Scenario A: Pagination
```
Main table: Shows page 1 (items 1-10)
User clicks page 2
→ Fetches page 2 (items 11-20)
→ Overwrites global state with page 2 data
→ Page 1 data LOST
→ User clicks back to page 1
→ Shows items 11-20 (wrong!)
```

#### Scenario B: Filtered Popup
```
Table view: All roles (50 items)
Opens popup: Active roles only (5 items, filtered)
→ Popup fetch overwrites global state with 5 items
→ Table now shows only 5 items (broken!)
→ Closing popup doesn't restore original 50 items
```

#### Scenario C: Multiple Views
```
Dashboard: Recent 5 roles
Admin page: All roles paginated
→ Both components fight over the same state ref
→ Last one to fetch wins
→ Other view shows wrong data
```

#### Scenario D: Sort/Filter Changes
```
Table sorted by name (A-Z)
User changes sort to date (newest first)
→ Fetches new sorted data
→ Overwrites state
→ Previous sort data lost
→ Can't toggle back without refetching
```

**Root Cause:**
Collection identity is **name only** (`'adminRoles'`), not **name + query** (`'adminRoles-page-2-active-only'`). You conflated what data is (identity) with how it's displayed (view).

---

### Problem 3: Fighting Nuxt's Patterns

**What we lose by not using `useFetch` properly:**

❌ **SSR/Hydration**
- `useFetch` serializes data from server → client
- Our manual sync bypasses this
- Potential hydration mismatches

❌ **Request Deduplication**
- Multiple components fetching same data = Nuxt dedupes
- We do manual syncs instead = doesn't leverage this

❌ **Automatic Reactivity**
- `useFetch` has `watch: [locale]` to auto-refetch
- We have to manually call `refresh()` everywhere

❌ **Built-in States**
- `pending`, `error` states come free with `useFetch`
- We have to track these manually

❌ **Cache Management**
- Nuxt manages stale-while-revalidate
- We manage our own global state cache

**We're reinventing Nuxt's wheel, but worse.**

---

### Problem 4: Code Complexity

**Current system:**
```
useCollections.ts:     57 lines  (global state registry)
useCrouton.ts:        658 lines  (everything: CRUD, optimistic, modal state)
Generated List.vue:    61 lines  (includes manual sync)
─────────────────────────────────
Total core:           715 lines
```

**The `useCrouton` composable does too much:**
- ✅ Modal/form state management (needed)
- ❌ Collection data fetching (should be `useFetch`)
- ❌ Optimistic updates (should be separate)
- ❌ Collection state syncing (should be cache-based)

Single Responsibility Principle violation → hard to understand, test, modify.

---

## Proposed Solution

### Architecture: "Query + Mutate" Pattern

**Separate concerns:**
- **Reads:** Use `useFetch` with query-based keys (Nuxt handles caching)
- **Writes:** New `useCollectionMutation` composable (optimistic updates)
- **Forms:** `useCrouton` stays focused on modal/form state only

### New Composable: `useCollectionQuery`

```typescript
// packages/nuxt-crouton/app/composables/useCollectionQuery.ts
export function useCollectionQuery(
  collection: string,
  options: { query?: ComputedRef<any> } = {}
) {
  const config = useCollectionConfig(collection)
  const route = useRoute()

  // Generate cache key based on collection + query params
  const cacheKey = computed(() => {
    const queryStr = JSON.stringify(options.query?.value || {})
    return `collection:${collection}:${queryStr}`
  })

  console.log('[useCollectionQuery] Init:', {
    collection,
    cacheKey: cacheKey.value,
    query: options.query?.value
  })

  // Use Nuxt's useFetch with proper caching
  const { data, refresh, pending, error } = await useFetch(
    () => `/api/teams/${route.params.team}/${config.apiPath}`,
    {
      key: cacheKey.value,  // ← Different query = different cache
      query: options.query,
      watch: options.query ? [options.query] : [],  // Auto-refetch
      onRequest: ({ request, options }) => {
        console.log('[useCollectionQuery] Request start:', request)
      },
      onResponse: ({ response }) => {
        console.log('[useCollectionQuery] Response:', {
          status: response.status,
          itemCount: response._data?.length || response._data?.items?.length
        })
      },
      onResponseError: ({ response }) => {
        console.error('[useCollectionQuery] Error:', response)
      }
    }
  )

  // Return normalized data structure
  const items = computed(() => {
    const val = data.value
    if (!val) return []
    if (Array.isArray(val)) return val
    if (val.items) return val.items  // Paginated response
    return []
  })

  console.log('[useCollectionQuery] Computed items:', items.value?.length)

  return {
    items,      // Reactive array of items
    refresh,    // Manual refetch function
    pending,    // Loading state
    error       // Error state
  }
}
```

**Key features:**
- ✅ Query-based cache keys: Different queries = different cache entries
- ✅ Automatic reactivity: `watch: [options.query]` refetches on changes
- ✅ Extensive logging: Track every request/response
- ✅ Works with Nuxt's SSR/cache system
- ✅ Multiple views can coexist without conflicts

---

### New Composable: `useCollectionMutation`

```typescript
// packages/nuxt-crouton/app/composables/useCollectionMutation.ts
export function useCollectionMutation(collection: string) {
  const config = useCollectionConfig(collection)
  const route = useRoute()
  const toast = useToast()

  // Get all cache keys for this collection to refresh them after mutations
  const getCacheKeys = () => {
    // In production, we'd track keys or use Nuxt's cache API
    // For now, refresh all collection data
    return [`collection:${collection}`]
  }

  return {
    async create(data: any) {
      const tempId = `temp-${Date.now()}`
      const optimistic = { ...data, id: tempId, _optimistic: true }

      console.group('[useCollectionMutation] CREATE')
      console.log('Input:', data)
      console.log('Optimistic item:', optimistic)

      // TODO: Apply optimistic update to cache
      // For now, let useFetch handle it

      try {
        const result = await $fetch(
          `/api/teams/${route.params.team}/${config.apiPath}`,
          { method: 'POST', body: data }
        )

        console.log('API Response:', result)

        // Refresh all collection queries
        await Promise.all(
          getCacheKeys().map(key => refreshNuxtData(key))
        )

        toast.add({
          title: 'Created successfully',
          icon: 'i-lucide-check',
          color: 'primary'
        })

        console.groupEnd()
        return result

      } catch (error: any) {
        console.error('API Error:', error)
        console.groupEnd()

        toast.add({
          title: 'Creation failed',
          description: error.data?.message || String(error),
          icon: 'i-lucide-octagon-alert',
          color: 'primary'
        })

        throw error
      }
    },

    async update(id: string, updates: any) {
      console.group('[useCollectionMutation] UPDATE')
      console.log('ID:', id)
      console.log('Updates:', updates)

      // TODO: Apply optimistic update to cache

      try {
        const result = await $fetch(
          `/api/teams/${route.params.team}/${config.apiPath}/${id}`,
          { method: 'PATCH', body: updates }
        )

        console.log('API Response:', result)

        // Refresh cache
        await Promise.all(
          getCacheKeys().map(key => refreshNuxtData(key))
        )

        toast.add({
          title: 'Updated successfully',
          icon: 'i-lucide-check',
          color: 'primary'
        })

        console.groupEnd()
        return result

      } catch (error: any) {
        console.error('API Error:', error)
        console.groupEnd()

        toast.add({
          title: 'Update failed',
          description: error.data?.message || String(error),
          icon: 'i-lucide-octagon-alert',
          color: 'primary'
        })

        throw error
      }
    },

    async delete(ids: string[]) {
      console.group('[useCollectionMutation] DELETE')
      console.log('IDs:', ids)

      // TODO: Optimistically remove from cache

      try {
        await Promise.all(
          ids.map(id =>
            $fetch(
              `/api/teams/${route.params.team}/${config.apiPath}/${id}`,
              { method: 'DELETE' }
            )
          )
        )

        console.log('All deletes succeeded')

        // Refresh cache
        await Promise.all(
          getCacheKeys().map(key => refreshNuxtData(key))
        )

        toast.add({
          title: `Deleted ${ids.length} item(s)`,
          icon: 'i-lucide-check',
          color: 'primary'
        })

        console.groupEnd()

      } catch (error: any) {
        console.error('API Error:', error)
        console.groupEnd()

        toast.add({
          title: 'Delete failed',
          description: error.data?.message || String(error),
          icon: 'i-lucide-octagon-alert',
          color: 'primary'
        })

        throw error
      }
    }
  }
}
```

**Key features:**
- ✅ Separate composable for mutations (Single Responsibility)
- ✅ Uses `refreshNuxtData()` to invalidate cache after mutations
- ✅ Extensive logging with console groups
- ✅ Toast notifications for feedback
- ✅ Room to add optimistic updates later (TODO markers)

---

### Updated Generator: `list-component.mjs`

```javascript
export function generateListComponent(data, config = {}) {
  const { plural, pascalCasePlural, layerPascalCase, layer } = data
  const prefixedPascalCasePlural = `${layerPascalCase}${pascalCasePlural}`
  const prefixedCamelCasePlural = `${layer}${pascalCasePlural}`
  const apiPath = `${layer}-${plural}`

  const translatableFields = config?.translations?.collections?.[plural] || []
  const hasTranslations = translatableFields.length > 0

  return `<template>
  <CroutonList
    :layout="layout"
    collection="${prefixedCamelCasePlural}"
    :columns="columns"
    :rows="${plural} || []"
    :loading="pending"
  >
    <template #header>
      <CroutonTableHeader
        title="${prefixedPascalCasePlural}"
        :collection="'${prefixedCamelCasePlural}'"
        createButton
      />
    </template>${translatableFields.map(field => `
    <template #${field}-data="{ row }">
      {{ t(row, '${field}') }}
    </template>`).join('')}
  </CroutonList>
</template>

<script setup lang="ts">
interface Props {
  layout?: 'table' | 'list' | 'grid' | 'cards'
}

const props = withDefaults(defineProps<Props>(), {
  layout: 'table'
})

console.log('[${prefixedPascalCasePlural} List] Component mounted')

${hasTranslations ? `const { t } = useEntityTranslations()
const { locale } = useI18n()` : ''}
const { columns } = use${prefixedPascalCasePlural}()

// NEW: Use query-based data fetching
const { items: ${plural}, pending } = await useCollectionQuery(
  '${prefixedCamelCasePlural}',
  {${hasTranslations ? `
    query: computed(() => ({ locale: locale.value }))` : ''}
  }
)

console.log('[${prefixedPascalCasePlural} List] Initial data:', ${plural}.value?.length, 'items')

${hasTranslations ? `// Watch for locale changes
watch(locale, (newLocale) => {
  console.log('[${prefixedPascalCasePlural} List] Locale changed to:', newLocale)
})` : ''}
</script>`
}
```

**Changes:**
- ❌ Removed: `useCollections()` destructuring
- ❌ Removed: `useFetch()` direct call
- ❌ Removed: Manual sync block (`if (data.value) { ... }`)
- ✅ Added: `useCollectionQuery()` with reactive query
- ✅ Added: Logging on mount and data changes
- ✅ Simplified: Direct binding `:rows="${plural} || []"`

---

### Updated Generator: `form-component.mjs`

```javascript
// In the template section, update the submit handler:
const formTemplate = `<UForm
  v-else
  :schema="schema"
  :state="state"
  class="space-y-4 flex flex-col justify-between h-full gap-4"
  @submit="handleSubmit"
  size="lg"
>`

// In the script section:
const scriptSection = `
const { mutate } = useCollectionMutation(collection)
const { send } = useCrouton()  // Still needed for modal state
const props = defineProps<${prefixedPascalCase}FormProps>()
const { defaultValue, schema, collection } = use${prefixedPascalCasePlural}()

// ... (existing form state logic)

const handleSubmit = async () => {
  console.log('[${prefixedPascalCase} Form] Submit:', props.action, state.value)

  try {
    if (props.action === 'create') {
      await mutate.create(state.value)
    } else if (props.action === 'update') {
      await mutate.update(state.value.id!, state.value)
    } else if (props.action === 'delete') {
      await mutate.delete(props.items)
    }

    // Close the form modal/slideover
    send('close')  // useCrouton still manages modal state

  } catch (error) {
    console.error('[${prefixedPascalCase} Form] Error:', error)
    // Error already handled by mutation composable (toast shown)
  }
}
`
```

**Changes:**
- ✅ Added: `useCollectionMutation()` for data operations
- ✅ Changed: Form submit handler to use `mutate.create/update/delete()`
- ✅ Kept: `useCrouton()` for modal state management (separation of concerns)
- ✅ Added: Logging for submit actions

---

## Migration Impact

### Files Changed in Core Package

| File | Current Lines | New Lines | Change | Description |
|------|--------------|-----------|--------|-------------|
| `useCollections.ts` | 57 | 15 | **-42** | Remove state refs, keep config only |
| `useCrouton.ts` | 658 | ~350 | **-308** | Remove data fetching logic |
| `useCollectionQuery.ts` | 0 | ~80 | **+80** | NEW: Data fetching |
| `useCollectionMutation.ts` | 0 | ~150 | **+150** | NEW: Mutations |
| **Total** | 715 | 595 | **-120** | Net simplification |

### Files Changed in Generator

| File | Lines Changed | Complexity |
|------|---------------|------------|
| `list-component.mjs` | ~15 | Simpler |
| `form-component.mjs` | ~20 | Similar |
| `composable.mjs` | 0 | No change |

### Breaking Changes

**For End Users (People Using Generated Collections):**

1. **Newly generated collections** will use new system automatically
2. **Existing collections** need manual migration:
   ```diff
   - const { adminRoles } = useCollections()
   - const { data: roles } = await useFetch(...)
   - if (roles.value) { adminRoles.value = roles.value }
   + const { items: roles, pending } = await useCollectionQuery('adminRoles')
   ```

3. **Form submissions** need update:
   ```diff
   - const { send } = useCrouton()
   - @submit="send(action, collection, state)"
   + const { mutate } = useCollectionMutation(collection)
   + @submit="handleSubmit"  // Custom handler using mutate
   ```

**Severity:** 🔴 HIGH - All existing collections break without migration

---

## Risks & Dangers

### 🔴 CRITICAL RISKS

#### Risk 1: Cache Invalidation Bugs
**Danger:** After a mutation, some views don't refresh and show stale data

**Scenario:**
```
Page A: Shows all roles (cached as "collection:adminRoles:{}")
Page B: Shows active roles (cached as "collection:adminRoles:{status:'active'}")
User creates new active role on Page B
→ refreshNuxtData("collection:adminRoles") invalidates Page A cache
→ But Page B cache key is different! Might not refresh
→ Page B shows stale data (missing new item)
```

**Mitigation:**
- Use wildcard cache key patterns: `collection:adminRoles:*`
- Or: Track all active cache keys per collection
- Test: Create item with filter applied, verify all views update

**Likelihood:** HIGH
**Impact:** HIGH
**Priority:** P0 - Must solve before launch

---

#### Risk 2: Race Conditions
**Danger:** Multiple simultaneous mutations cause data inconsistencies

**Scenario:**
```
User 1: Updates role name
User 2: Updates same role permissions (at same time)
→ Both read current state
→ Both apply optimistic updates
→ Both send PATCH requests
→ Last write wins, first update lost
```

**Mitigation:**
- Add mutation queue (serialize mutations per item)
- Add optimistic locking (ETag headers)
- Show warning if mutation in progress
- Test: Rapid double-click submit, verify behavior

**Likelihood:** MEDIUM
**Impact:** HIGH
**Priority:** P1 - Should solve

---

#### Risk 3: Memory Leaks
**Danger:** Cache grows unbounded with different query combinations

**Scenario:**
```
User paginates through 100 pages
→ Creates 100 cache entries: "collection:roles:{page:1}", "collection:roles:{page:2}", ...
→ All stay in memory
→ Browser memory grows to gigabytes
→ Tab crashes
```

**Mitigation:**
- Set `getCachedData` with TTL
- Limit cache size (LRU eviction)
- Clear cache on navigation
- Monitor: DevTools memory profiler during pagination

**Likelihood:** MEDIUM
**Impact:** MEDIUM
**Priority:** P1 - Monitor and add safeguards

---

#### Risk 4: Hydration Mismatches (SSR)
**Danger:** Server-rendered data doesn't match client fetch

**Scenario:**
```
SSR: Fetches data at request time (10:00 AM)
Client hydration: useFetch refetches (10:01 AM)
→ Data changed between renders
→ Vue hydration mismatch warning
→ Possible UI flicker or broken state
```

**Mitigation:**
- Use `initialCache` option to pass SSR data
- Set appropriate `staleTime` to prevent immediate refetch
- Test: Disable JS, verify server-rendered content

**Likelihood:** LOW (if SSR used)
**Impact:** MEDIUM
**Priority:** P2 - Test with SSR enabled

---

### ⚠️ MODERATE RISKS

#### Risk 5: Optimistic Update Rollback Complexity
**Danger:** Rollback logic gets complex with nested objects/relations

**Mitigation:**
- Start with simple refreshNuxtData() instead of manual rollback
- Add proper optimistic updates in Phase 2
- Test: Force API errors, verify UI state

---

#### Risk 6: TypeScript Type Drift
**Danger:** Generated types don't match new composable signatures

**Mitigation:**
- Run `npx nuxt typecheck` after every change
- Update type generation in generator

---

#### Risk 7: Existing Project Breakage
**Danger:** Users update generator, all collections break

**Mitigation:**
- Clear migration guide with before/after examples
- Migration script to auto-update simple cases
- Major version bump (1.x → 2.x)

---

### 🔵 LOW RISKS

#### Risk 8: Performance Regression
**Scenario:** More HTTP requests due to separate cache entries

**Mitigation:** Nuxt's request deduplication should handle this

---

#### Risk 9: Developer Confusion
**Scenario:** Two ways to do things during transition

**Mitigation:** Clear docs, deprecation warnings

---

## Testing Strategy

### Phase 1: Unit Tests (New Composables)

```typescript
// tests/composables/useCollectionQuery.test.ts
describe('useCollectionQuery', () => {
  it('fetches data with correct cache key', async () => {
    const { items, pending } = await useCollectionQuery('roles')
    expect(pending.value).toBe(true)
    await waitFor(() => expect(pending.value).toBe(false))
    expect(items.value).toBeArray()
  })

  it('creates separate cache entries for different queries', async () => {
    const query1 = await useCollectionQuery('roles', {
      query: computed(() => ({ page: 1 }))
    })
    const query2 = await useCollectionQuery('roles', {
      query: computed(() => ({ page: 2 }))
    })

    expect(query1.items.value).not.toEqual(query2.items.value)
  })

  it('auto-refetches when query changes', async () => {
    const page = ref(1)
    const { items } = await useCollectionQuery('roles', {
      query: computed(() => ({ page: page.value }))
    })

    const page1Items = items.value
    page.value = 2
    await waitFor(() => expect(items.value).not.toEqual(page1Items))
  })
})

// tests/composables/useCollectionMutation.test.ts
describe('useCollectionMutation', () => {
  it('creates item and invalidates cache', async () => {
    const { mutate } = useCollectionMutation('roles')
    const newItem = { name: 'Test Role' }

    await mutate.create(newItem)

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/roles'),
      expect.objectContaining({ method: 'POST' })
    )
    expect(mockRefreshNuxtData).toHaveBeenCalled()
  })

  it('shows toast on error', async () => {
    mockFetch.mockRejectedValue(new Error('API Error'))
    const { mutate } = useCollectionMutation('roles')

    await expect(mutate.create({})).rejects.toThrow()
    expect(mockToast.add).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Creation failed' })
    )
  })
})
```

---

### Phase 2: Integration Tests (Generated Components)

```typescript
// tests/integration/list-component.test.ts
describe('Generated List Component', () => {
  it('displays fetched data', async () => {
    mockFetch.mockResolvedValue([
      { id: '1', name: 'Role 1' },
      { id: '2', name: 'Role 2' }
    ])

    const wrapper = mount(AdminRolesList)

    await waitFor(() => {
      expect(wrapper.findAll('[data-row]')).toHaveLength(2)
    })
  })

  it('shows loading state during fetch', () => {
    const wrapper = mount(AdminRolesList)
    expect(wrapper.find('[data-loading]').exists()).toBe(true)
  })

  it('refetches when locale changes', async () => {
    const wrapper = mount(AdminRolesList)
    await wrapper.vm.$nextTick()

    mockFetch.mockClear()
    changeLocale('fr')

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ query: { locale: 'fr' } })
      )
    })
  })
})
```

---

### Phase 3: E2E Tests (Critical User Journeys)

```typescript
// tests/e2e/crud-operations.spec.ts
test('CRUD workflow with multiple views', async ({ page }) => {
  // Setup: Navigate to roles table
  await page.goto('/admin/roles')
  await expect(page.locator('table')).toBeVisible()

  // Step 1: Create new role
  await page.click('[data-action="create"]')
  await page.fill('[name="name"]', 'Test Role')
  await page.click('[type="submit"]')

  // Verify: New role appears in table
  await expect(page.locator('text=Test Role')).toBeVisible()

  // Step 2: Open filtered view in popup
  await page.click('[data-action="filter"]')
  await page.selectOption('[name="status"]', 'active')

  // Step 3: Create another role in popup
  await page.click('[data-popup-action="create"]')
  await page.fill('[name="name"]', 'Active Role')
  await page.click('[type="submit"]')

  // Verify: Both views updated correctly
  await expect(page.locator('text=Active Role')).toBeVisible()
  await page.click('[data-close-popup]')
  await expect(page.locator('table >> text=Active Role')).toBeVisible()

  // Step 4: Paginate and verify data consistency
  await page.click('[aria-label="Next page"]')
  await page.click('[aria-label="Previous page"]')
  await expect(page.locator('text=Test Role')).toBeVisible()
})

test('Handles API errors gracefully', async ({ page }) => {
  // Mock API to return error
  await page.route('**/api/**', route =>
    route.fulfill({ status: 500, body: 'Server error' })
  )

  await page.goto('/admin/roles')
  await page.click('[data-action="create"]')
  await page.fill('[name="name"]', 'Test')
  await page.click('[type="submit"]')

  // Verify: Error toast shown, modal stays open
  await expect(page.locator('text=failed')).toBeVisible()
  await expect(page.locator('[role="dialog"]')).toBeVisible()
})
```

---

### Phase 4: Manual Testing Checklist

**Before marking as complete, manually verify:**

- [ ] **Basic CRUD**
  - [ ] Create item → appears in list
  - [ ] Update item → changes reflected
  - [ ] Delete item → removed from list
  - [ ] Cancel form → no changes

- [ ] **Pagination**
  - [ ] Navigate to page 2 → shows different items
  - [ ] Navigate back to page 1 → shows original items
  - [ ] Create item on page 2 → visible on page 2
  - [ ] Navigate away and back → data persists

- [ ] **Filtering**
  - [ ] Apply filter → shows subset
  - [ ] Clear filter → shows all items
  - [ ] Create item with filter active → appears correctly
  - [ ] Multiple filtered views → independent state

- [ ] **Sorting**
  - [ ] Sort by name → order changes
  - [ ] Sort by date → order changes
  - [ ] Create item → appears in correct sort position

- [ ] **Multiple Views**
  - [ ] Open table view
  - [ ] Open popup with filtered data
  - [ ] Verify both show correct data
  - [ ] Mutate in popup → table updates
  - [ ] Close popup → table still correct

- [ ] **Error Handling**
  - [ ] Network error → toast shown
  - [ ] Validation error → form stays open
  - [ ] Optimistic update + error → UI rolls back
  - [ ] Retry after error → works

- [ ] **Performance**
  - [ ] Open DevTools memory profiler
  - [ ] Paginate through 20 pages
  - [ ] Verify memory doesn't grow unbounded
  - [ ] Check cache size in Vue DevTools

- [ ] **Translations** (if enabled)
  - [ ] Change locale → data refetches
  - [ ] Translatable fields show correct language
  - [ ] Create with translations → saves correctly

- [ ] **SSR** (if enabled)
  - [ ] View page source → data rendered
  - [ ] Disable JavaScript → content visible
  - [ ] Enable JS → no hydration errors

---

## Migration Plan

### Phase 1: Preparation (Non-Breaking)

**Goal:** Add new composables alongside old system

**Steps:**

1. **Create new composables in package**
   ```bash
   touch packages/nuxt-crouton/app/composables/useCollectionQuery.ts
   touch packages/nuxt-crouton/app/composables/useCollectionMutation.ts
   ```

2. **Implement with extensive logging**
   - Add `NUXT_CROUTON_DEBUG` env var support
   - Console groups for all operations
   - State snapshots

3. **Create test collection**
   ```bash
   # Generate a test collection to verify new system
   pnpm crouton-generate admin testItems --fields-file test-schema.json
   ```

4. **Manual verification**
   - Test CRUD operations
   - Test pagination
   - Test filtered views
   - Check memory usage

**Exit Criteria:**
- ✅ New composables work in test collection
- ✅ No breaking changes to existing collections
- ✅ All manual tests pass

**Estimated Time:** 4-6 hours

---

### Phase 2: Generator Update (Breaking)

**Goal:** Update generator to use new system

**Steps:**

1. **Update `list-component.mjs`**
   ```javascript
   // Change template binding
   :rows="${plural} || []"

   // Change script
   const { items: ${plural}, pending } = await useCollectionQuery(...)
   ```

2. **Update `form-component.mjs`**
   ```javascript
   const { mutate } = useCollectionMutation(collection)
   // Add handleSubmit function
   ```

3. **Add version flag** (optional migration path)
   ```javascript
   // In generator
   if (config.useNewArchitecture === true) {
     // Use new system
   } else {
     // Use old system (deprecated)
   }
   ```

4. **Generate test collections with new system**
   ```bash
   pnpm crouton-generate admin newTestItems --fields-file test-schema.json
   ```

5. **Compare old vs new**
   - Side-by-side comparison
   - Verify feature parity
   - Check performance

**Exit Criteria:**
- ✅ Newly generated collections use new system
- ✅ Generated code has proper logging
- ✅ Typecheck passes: `npx nuxt typecheck`
- ✅ All manual tests pass with new collections

**Estimated Time:** 2-3 hours

---

### Phase 3: Core Simplification (Breaking)

**Goal:** Remove old system from core package

**Steps:**

1. **Simplify `useCollections.ts`**
   ```diff
   - const collections = Object.keys(registry).reduce((acc, name) => {
   -   acc[name] = useState(name, () => [])
   -   return acc
   - }, {})

   + // Just return config registry
     return {
       configs: registry,
       getConfig: (name) => registry[name]
     }
   ```

2. **Simplify `useCrouton.ts`**
   ```diff
   - function getCollection() { ... }      // DELETE
   - function optimisticUpdate() { ... }   // DELETE
   - function send() { ... }               // DELETE (data parts)

   + // Keep only modal/form state management
     function open() { ... }
     function close() { ... }
   ```

3. **Update `useCollection.ts`** (if exists)
   - Migrate to use `useCollectionQuery`
   - Or mark as deprecated

4. **Search for usage**
   ```bash
   # Find any code still using old system
   grep -r "useCollections()" packages/nuxt-crouton/app
   grep -r "useCrouton().send" packages/nuxt-crouton/app
   grep -r "getCollection(" packages/nuxt-crouton/app
   ```

5. **Run full typecheck**
   ```bash
   npx nuxt typecheck
   ```

**Exit Criteria:**
- ✅ Old data fetching code removed
- ✅ No TypeScript errors
- ✅ All existing tests still pass
- ✅ Core package smaller and simpler

**Estimated Time:** 2-3 hours

---

### Phase 4: Documentation & Release

**Goal:** Ship new version with clear migration path

**Steps:**

1. **Write migration guide**
   - Before/after code examples
   - Common patterns
   - Breaking changes list
   - Troubleshooting section

2. **Update README**
   - Architecture diagram
   - New API documentation
   - Examples

3. **Create migration script** (optional)
   ```bash
   # Auto-update simple patterns
   pnpm crouton-migrate-collections
   ```

4. **Version bump**
   - Update package.json: `1.x.x` → `2.0.0`
   - Update CHANGELOG.md with breaking changes
   - Tag release

5. **Communicate changes**
   - GitHub release notes
   - Migration guide link
   - Timeline for deprecation

**Exit Criteria:**
- ✅ Documentation complete
- ✅ Migration guide tested on real collection
- ✅ Version bumped and tagged
- ✅ Release notes published

**Estimated Time:** 2-3 hours

---

## Rollback Plan

### If Things Go Wrong

**Scenario 1: Critical bug found during Phase 1/2**
```bash
# Easy: Just don't merge to main
git checkout main
# Old system still works, new system in feature branch
```

**Scenario 2: Critical bug found after Phase 3 (old system removed)**
```bash
# Option A: Revert commits
git revert <commit-hash-of-phase-3>

# Option B: Fix forward (preferred if bug is simple)
# Add missing null checks, fix cache invalidation, etc.
```

**Scenario 3: Users report breakage after release**
```bash
# Immediate: Publish previous version as 2.0.1
npm publish --tag latest-stable

# Short-term: Fix bugs in 2.1.0
# Long-term: Better testing next time
```

### Emergency Contacts
- Lead Developer: [Your Name]
- Backup: [Backup Person]
- Escalation: [Manager/Tech Lead]

---

## Success Criteria

### Must Have (P0)

- [ ] **Pagination works**: Load page 1 → page 2 → page 1, all data correct
- [ ] **Filtered views work**: Multiple filters don't interfere with each other
- [ ] **CRUD operations work**: Create/Update/Delete all function correctly
- [ ] **No TypeScript errors**: `npx nuxt typecheck` passes
- [ ] **No hydration errors**: SSR/CSR data matches (if SSR enabled)
- [ ] **Cache invalidation works**: Mutations update all affected views
- [ ] **Error handling works**: API errors show toast, don't break UI

### Should Have (P1)

- [ ] **Performance acceptable**: No memory leaks, reasonable cache size
- [ ] **Developer experience good**: Clear error messages, good logging
- [ ] **Migration guide complete**: Users can upgrade existing collections
- [ ] **Tests pass**: Unit + Integration + E2E all green

### Nice to Have (P2)

- [ ] **Optimistic updates**: Instant UI feedback (can be added post-launch)
- [ ] **Migration script**: Auto-update simple cases
- [ ] **Cache TTL**: Automatic cleanup of old entries

---

## Timeline

| Phase | Duration | Milestone |
|-------|----------|-----------|
| **Phase 1: Create New Composables** | 4-6 hours | New system working alongside old |
| **Phase 2: Update Generator** | 2-3 hours | New collections use new system |
| **Phase 3: Simplify Core** | 2-3 hours | Old system removed, core simplified |
| **Phase 4: Documentation** | 2-3 hours | Ready to ship |
| **Testing & Buffer** | 4-6 hours | Thorough verification |
| **Total** | **14-21 hours** | **~2 days** |

---

## Open Questions

1. **Do we need to support gradual migration?**
   - Option A: Big bang (all collections update at once)
   - Option B: Gradual (flag to enable new system per collection)
   - **Recommendation:** Start with Big Bang, add gradual if needed

2. **How aggressive should cache invalidation be?**
   - Option A: Conservative (refresh all collection queries on mutation)
   - Option B: Aggressive (only refresh exact cache keys affected)
   - **Recommendation:** Start conservative, optimize later

3. **Should we add optimistic updates in Phase 1?**
   - Option A: Yes (complete feature parity)
   - Option B: No (ship simpler version first, add later)
   - **Recommendation:** No - `refreshNuxtData()` is good enough for v1

4. **What about existing deployed applications?**
   - Do they need to upgrade immediately?
   - Can we provide a compatibility layer?
   - **Recommendation:** Major version bump, clear migration timeline

---

## Lessons Learned (Post-Implementation)

_To be filled out after completion_

**What went well:**
-

**What didn't go well:**
-

**What we'd do differently:**
-

**Unexpected issues:**
-

---

## Approval

**Technical Lead:** _____________ Date: _______
**Project Owner:** _____________ Date: _______

---

## Next Steps

After approval:
1. Create feature branch: `refactor/collection-architecture-v2`
2. Set up logging infrastructure
3. Begin Phase 1 implementation
4. Schedule daily check-ins during implementation
5. Plan demo/review after Phase 2

**Ready to proceed? See implementation checklist in Phase 1 above.**