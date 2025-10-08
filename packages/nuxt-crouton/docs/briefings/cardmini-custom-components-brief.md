# Briefing: CardMini Custom Components with Convention-Based Discovery

**Date**: 2025-10-07
**Status**: Implementation Ready
**Priority**: HIGH (Bug Fix) + MEDIUM (Enhancement)

---

## Executive Summary

This briefing covers two related improvements to the CardMini component:

1. **Bug Fix** (CRITICAL): Fix broken CardMini caused by collection system refactor
2. **Enhancement** (FEATURE): Enable convention-based custom CardMini components per collection

The solution maintains simplicity while providing flexibility for custom card layouts without configuration overhead.

---

## Part 1: Bug Fix - Broken CardMini Component

### Current Issue

**File**: `packages/nuxt-crouton/app/components/CardMini.vue:47`

**Error**:
```
TypeError: Cannot read properties of undefined (reading 'value')
```

**Root Cause**:
```js
// BROKEN (line 47)
const item = computed(() => useCollections()[props.collection].value.find(i => i.id === props.id))
```

After the collection system refactor, `useCollections()` only returns configuration data:
- `componentMap` - component name registry
- `getConfig()` - collection config lookup
- `configs` - raw config registry

It **no longer returns reactive data** for collection items.

### Solution: Create `useCollectionItem` Composable

**File**: `packages/nuxt-crouton/app/composables/useCollectionItem.ts`

A new composable that fetches individual items by ID, following the architecture pattern established by `useCollectionQuery`.

**API**:
```ts
const { item, pending, error, refresh } = await useCollectionItem(
  'bookingsLocations',  // collection name
  () => props.id         // reactive ID reference
)
```

**Features**:
- Fetches single item from API: `/api/teams/{team}/{collection}/{id}`
- Supports super-admin routes: `/api/super-admin/{collection}/{id}`
- Reactive ID parameter for prop changes
- Nuxt cache integration with cache key: `collection-item:{collection}:{id}`
- Works with both internal and external collections

**Implementation Details**:

```ts
import type { Ref, ComputedRef } from 'vue'

interface CollectionItemReturn<T = any> {
  item: ComputedRef<T | null>
  pending: Ref<boolean>
  error: Ref<any>
  refresh: () => Promise<void>
}

export async function useCollectionItem<T = any>(
  collection: string,
  id: string | Ref<string> | (() => string)
): Promise<CollectionItemReturn<T>> {
  const route = useRoute()
  const collections = useCollections()
  const config = collections.getConfig(collection)

  if (!config) {
    throw new Error(`Collection "${collection}" not registered`)
  }

  const apiPath = config.apiPath || collection
  const itemId = computed(() => unref(id))

  // Generate cache key
  const cacheKey = computed(() => `collection-item:${collection}:${itemId.value}`)

  // Determine full API path based on route context
  const fullApiPath = computed(() => {
    if (route.path.includes('/super-admin/')) {
      return `/api/super-admin/${apiPath}/${itemId.value}`
    }
    return `/api/teams/${route.params.team}/${apiPath}/${itemId.value}`
  })

  const { data, pending, error, refresh } = await useFetch(
    fullApiPath.value,
    {
      key: cacheKey.value,
      watch: [itemId]
    }
  )

  const item = computed(() => data.value as T | null)

  return { item, pending, error, refresh }
}
```

### CardMini Update

**Update** `packages/nuxt-crouton/app/components/CardMini.vue`:

```vue
<script setup>
const { open } = useCrouton()
const props = defineProps({
  id: { type: String, required: true },
  collection: { type: String, required: true }
})

// NEW: Use the new composable
const { item, pending } = await useCollectionItem(props.collection, () => props.id)
</script>
```

---

## Part 2: Enhancement - Convention-Based Custom CardMini

### Problem Statement

Currently, all reference fields display using the same generic CardMini layout (just shows `title` field). Users need the ability to customize card layouts per collection without:
- Manual configuration files
- Component registration overhead
- Breaking existing defaults

### Use Cases

1. **Users collection** (external, SuperSaaS): Show avatar, name, email
2. **Locations collection**: Show address, map icon, status badge
3. **Products collection**: Show thumbnail, price, stock level
4. **Default behavior**: Generic title display (current)

### Solution: Convention-Based Component Discovery

Use Nuxt's auto-import system to automatically discover and use custom CardMini components based on naming conventions.

**No configuration required** - just drop a file in the right place!

---

## Implementation Design

### 1. File Conventions

#### Internal Collections (Generator-Created)

```
collections/bookings/app/components/
  ├── Form.vue
  ├── List.vue
  └── CardMini.vue  → Auto-imported as BookingsCardMini
```

#### External Collections (SuperSaaS, Auth, etc.)

```
app/components/
  ├── UsersCardMini.vue    → For external :users
  ├── TeamsCardMini.vue    → For external :teams
  └── ...
```

Or organized in subdirectory:

```
app/components/cards/
  ├── UsersCardMini.vue
  ├── TeamsCardMini.vue
  └── ...
```

Both work identically thanks to Nuxt's auto-import!

### 2. Enhanced CardMini Component

**Update** `packages/nuxt-crouton/app/components/CardMini.vue`:

```vue
<script setup lang="ts">
import { useNuxtApp } from '#app'

const props = defineProps({
  id: { type: String, required: true },
  collection: { type: String, required: true }
})

const { item, pending, error, refresh } = await useCollectionItem(
  props.collection,
  () => props.id
)

// Convert collection name to expected component name
// 'bookingsLocations' → 'BookingsLocationsCardMini'
// 'users' → 'UsersCardMini'
const componentName = computed(() => {
  const name = props.collection.charAt(0).toUpperCase() + props.collection.slice(1)
  return `${name}CardMini`
})

// Check if custom component exists in Vue's global component registry
const nuxtApp = useNuxtApp()
const customComponent = computed(() => {
  return nuxtApp.vueApp.component(componentName.value) || null
})
</script>

<template>
  <!-- Use custom component if it exists -->
  <component
    v-if="customComponent"
    :is="customComponent"
    :item="item"
    :pending="pending"
    :error="error"
    :id="id"
    :collection="collection"
    :refresh="refresh"
  />

  <!-- Default fallback rendering (current implementation) -->
  <div v-else class="group relative">
    <div class="bg-white dark:bg-gray-900 rounded-md relative z-10">
      <div class="
        border border-gray-300 dark:border-gray-700 rounded-md
        text-xs text-gray-700 dark:text-gray-200
        p-2
        shadow-sm
        transition delay-150 duration-200 ease-in-out
        bg-white
        dark:bg-gray-800/60 dark:group-hover:bg-gray-800/50"
      >
        <USkeleton v-if="pending" class="h-4 w-full" />
        <span v-else-if="item">{{ item.title }}</span>
        <span v-else-if="error" class="text-red-500">Error loading</span>
      </div>
    </div>

    <CroutonMiniButtons
      v-if="item"
      class="absolute -top-1 right-2 transition delay-150 duration-300 ease-in-out group-hover:-translate-y-6 group-hover:scale-110"
      update
      @update="open('update', collection, [id])"
      buttonClasses="pb-4"
      containerClasses="flex flex-row gap-[2px]"
    />
  </div>
</template>
```

### 3. Custom CardMini Props Contract

Any custom `*CardMini.vue` component MUST accept these props:

```ts
defineProps<{
  item: any | null          // The fetched item data
  pending: boolean          // Loading state
  error: any | null         // Error state
  id: string                // Item ID
  collection: string        // Collection name
  refresh: () => Promise<void>  // Refetch function
}>()
```

---

## Examples

### Example 1: Custom Internal Collection Card

**Scenario**: Custom card for locations collection

**File**: `collections/locations/app/components/CardMini.vue`

```vue
<script setup lang="ts">
const props = defineProps<{
  item: any
  pending: boolean
  error: any
  id: string
  collection: string
  refresh: () => Promise<void>
}>()

const { open } = useCrouton()
</script>

<template>
  <div class="group relative">
    <USkeleton v-if="pending" class="h-16 w-full rounded-md" />

    <div v-else-if="item" class="border rounded-md p-3 bg-white dark:bg-gray-800">
      <div class="flex items-start gap-3">
        <UIcon name="i-heroicons-map-pin" class="text-blue-500 mt-1" />
        <div class="flex-1">
          <div class="font-medium text-sm">{{ item.name }}</div>
          <div class="text-xs text-gray-500">{{ item.address }}</div>
          <UBadge
            v-if="item.active"
            color="green"
            size="xs"
            class="mt-1"
          >
            Active
          </UBadge>
        </div>
      </div>
    </div>

    <div v-else-if="error" class="text-red-500 text-xs p-2 border border-red-200 rounded-md">
      Failed to load location
    </div>

    <CroutonMiniButtons
      v-if="item"
      update
      @update="open('update', collection, [id])"
      class="absolute -top-1 right-2 transition delay-150 duration-300 ease-in-out group-hover:-translate-y-6 group-hover:scale-110"
      buttonClasses="pb-4"
      containerClasses="flex flex-row gap-[2px]"
    />
  </div>
</template>
```

### Example 2: Custom External Collection Card

**Scenario**: SuperSaaS users collection card

**File**: `app/components/UsersCardMini.vue`

```vue
<script setup lang="ts">
const props = defineProps<{
  item: any
  pending: boolean
  error: any
  id: string
  collection: string
  refresh: () => Promise<void>
}>()

const { open } = useCrouton()

// SuperSaaS-specific data formatting
const userInitials = computed(() => {
  if (!props.item?.full_name) return '?'
  return props.item.full_name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
})
</script>

<template>
  <div class="group relative">
    <USkeleton v-if="pending" class="h-12 w-full rounded-lg" />

    <div v-else-if="item" class="flex items-center gap-3 p-2 border rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
      <!-- Avatar -->
      <div class="flex-shrink-0">
        <img
          v-if="item.avatar_url"
          :src="item.avatar_url"
          :alt="item.full_name"
          class="w-10 h-10 rounded-full"
        />
        <div
          v-else
          class="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-medium text-sm"
        >
          {{ userInitials }}
        </div>
      </div>

      <!-- User Info -->
      <div class="flex-1 min-w-0">
        <div class="font-medium text-sm truncate">{{ item.full_name }}</div>
        <div class="text-xs text-gray-500 truncate">{{ item.email }}</div>
      </div>

      <!-- Status Badge -->
      <UBadge
        v-if="item.is_active"
        color="green"
        size="xs"
      >
        Active
      </UBadge>
    </div>

    <div v-else-if="error" class="text-red-500 text-xs p-2">
      User not found
    </div>

    <CroutonMiniButtons
      v-if="item"
      update
      @update="open('update', collection, [id])"
      class="absolute -top-1 right-2 transition delay-150 duration-300 ease-in-out group-hover:-translate-y-6 group-hover:scale-110"
      buttonClasses="pb-4"
      containerClasses="flex flex-row gap-[2px]"
    />
  </div>
</template>
```

---

## How It Works

### Discovery Flow

1. **List.vue renders** a reference field using `<CroutonCardMini>`
2. **CardMini computes** expected component name: `{Collection}CardMini`
3. **Vue registry check**: Does component exist?
   - **YES**: Render custom component with full props
   - **NO**: Render default fallback layout
4. **Zero configuration** - pure convention!

### Progressive Enhancement

```
Day 1: Use default CardMini everywhere
       ↓
Day 30: "Users should show avatars"
        → Drop UsersCardMini.vue in app/components/
        ↓
Day 60: "Locations need custom layout"
        → Add CardMini.vue to collections/locations/app/components/
        ↓
Day 90: 20 collections, 3 custom cards
        → Only customize what needs it!
```

### Why This Design Works

✅ **Zero Configuration**: No registry, no imports, no config files
✅ **Progressive Enhancement**: Start simple, customize later
✅ **Consistent Patterns**: Matches Form/List component conventions
✅ **Type-Safe**: Props contract enforced via TypeScript
✅ **Flexible**: Works for internal AND external collections
✅ **Discoverable**: Clear naming convention
✅ **Moveable**: Relocate components without code changes
✅ **Generator-Friendly**: Can scaffold custom cards

---

## Generator Integration (Optional Enhancement)

### Add Scaffold Flag

```bash
# Scaffold basic custom CardMini when generating collection
npx generate-collection locations --scaffold-card
```

**Generated file**: `collections/locations/app/components/CardMini.vue`

```vue
<script setup lang="ts">
const props = defineProps<{
  item: any
  pending: boolean
  error: any
  id: string
  collection: string
  refresh: () => Promise<void>
}>()

const { open } = useCrouton()
</script>

<template>
  <div class="group relative">
    <USkeleton v-if="pending" class="h-12 w-full rounded-md" />

    <div v-else-if="item" class="border rounded-md p-2 bg-white dark:bg-gray-800">
      <!-- TODO: Customize layout for {{ collection }} -->
      <div>{{ item.title || item.name }}</div>
    </div>

    <div v-else-if="error" class="text-red-500 text-xs p-2">
      Error loading item
    </div>

    <CroutonMiniButtons
      v-if="item"
      update
      @update="open('update', collection, [id])"
      class="absolute -top-1 right-2 transition delay-150 duration-300 ease-in-out group-hover:-translate-y-6 group-hover:scale-110"
    />
  </div>
</template>
```

### Interactive Prompt

During generation, if reference fields detected:

```bash
✓ Generated Form.vue
✓ Generated List.vue

ℹ This collection has 3 reference fields:
  - createdBy (→ users)
  - locationId (→ locations)
  - assignedTo (→ users)

Would you like to scaffold a custom CardMini for this collection? (y/N)
```

---

## Implementation Checklist

### Phase 1: Bug Fix (CRITICAL)

- [ ] Create `useCollectionItem.ts` composable
  - [ ] Implement single item fetch logic
  - [ ] Support team-scoped routes
  - [ ] Support super-admin routes
  - [ ] Add Nuxt cache integration
  - [ ] Add TypeScript types
  - [ ] Add error handling

- [ ] Update CardMini.vue
  - [ ] Replace broken line 47 with `useCollectionItem` call
  - [ ] Update template to handle pending/error states
  - [ ] Add TypeScript types for props

- [ ] Test bug fix
  - [ ] Test in List views with reference fields
  - [ ] Test with internal collections
  - [ ] Test with external collections (if connector installed)
  - [ ] Test error states
  - [ ] Run `npx nuxt typecheck`

### Phase 2: Custom Component Enhancement (FEATURE)

- [ ] Enhance CardMini.vue
  - [ ] Add component name computation
  - [ ] Add Vue registry lookup
  - [ ] Add conditional component rendering
  - [ ] Pass full props to custom components
  - [ ] Preserve default fallback

- [ ] Create props interface/documentation
  - [ ] Document props contract
  - [ ] Create TypeScript interface
  - [ ] Add JSDoc comments

- [ ] Test custom component discovery
  - [ ] Create test custom CardMini
  - [ ] Verify auto-import works
  - [ ] Verify fallback works when no custom component
  - [ ] Test with internal collection
  - [ ] Test with external collection
  - [ ] Run `npx nuxt typecheck`

### Phase 3: Generator Integration (OPTIONAL)

- [ ] Add `--scaffold-card` flag support
- [ ] Generate CardMini.vue template
- [ ] Add interactive prompt for reference fields
- [ ] Update generator documentation

### Phase 4: Documentation

- [ ] Create user documentation at `/Users/pmcp/Projects/crouton-docs/content`
  - [ ] Overview: What is CardMini?
  - [ ] How to create custom CardMini components
  - [ ] Props contract reference
  - [ ] File location conventions
  - [ ] Examples (internal + external collections)
  - [ ] Troubleshooting guide
  - [ ] Migration guide (if users had workarounds)

- [ ] Update inline code documentation
  - [ ] Add JSDoc to useCollectionItem
  - [ ] Add comments to CardMini.vue
  - [ ] Update collection generator docs

---

## Testing Strategy

### Unit Tests

```ts
// Test useCollectionItem composable
describe('useCollectionItem', () => {
  it('fetches item by ID', async () => {
    const { item, pending } = await useCollectionItem('users', '123')
    expect(pending.value).toBe(false)
    expect(item.value).toHaveProperty('id', '123')
  })

  it('handles reactive ID changes', async () => {
    const id = ref('123')
    const { item } = await useCollectionItem('users', id)

    id.value = '456'
    await nextTick()

    expect(item.value?.id).toBe('456')
  })

  it('uses correct API path for team routes', async () => {
    // Mock route with team param
    const { item } = await useCollectionItem('locations', '123')
    // Assert fetch called /api/teams/{team}/locations/123
  })
})
```

### Integration Tests

```ts
// Test CardMini with custom component
describe('CardMini', () => {
  it('renders default layout when no custom component', () => {
    const wrapper = mount(CardMini, {
      props: { collection: 'unknown', id: '123' }
    })
    expect(wrapper.find('.default-layout').exists()).toBe(true)
  })

  it('renders custom component when available', () => {
    // Register UsersCardMini globally
    const wrapper = mount(CardMini, {
      props: { collection: 'users', id: '123' }
    })
    expect(wrapper.findComponent(UsersCardMini).exists()).toBe(true)
  })
})
```

### E2E Tests (Playwright)

```ts
test('custom user card displays in table', async ({ page }) => {
  await page.goto('/teams/test-team/bookings')

  // Wait for table to load
  await page.waitForSelector('[data-testid="bookings-table"]')

  // Find user reference cell
  const userCard = page.locator('[data-testid="user-card"]').first()

  // Should show avatar and name (custom layout)
  await expect(userCard.locator('img')).toBeVisible()
  await expect(userCard).toContainText('@')  // email
})
```

---

## Risk Assessment

### Low Risk

- ✅ Backwards compatible (default rendering preserved)
- ✅ No breaking changes to existing collections
- ✅ Opt-in feature (custom cards optional)
- ✅ Follows existing Nuxt patterns

### Considerations

- 🟡 **Component naming must be strict**: `{Collection}CardMini` format required
- 🟡 **Props contract must be stable**: Breaking changes affect custom cards
- 🟡 **Performance**: Component registry check per render (negligible, cached by Vue)

### Mitigation

- Document naming convention clearly
- Version the props contract
- Provide TypeScript types for compile-time checks

---

## Success Metrics

### Bug Fix Success

- ✅ CardMini renders without errors in all List views
- ✅ Reference fields display correctly
- ✅ No TypeScript errors
- ✅ Loading states work properly

### Enhancement Success

- ✅ Custom CardMini components auto-discovered
- ✅ Default fallback works when no custom component
- ✅ Works for both internal and external collections
- ✅ Zero configuration required
- ✅ Documentation complete and clear

---

## Timeline Estimate

- **Bug Fix**: 2-3 hours
  - useCollectionItem composable: 1.5 hours
  - CardMini update: 0.5 hours
  - Testing: 1 hour

- **Enhancement**: 2-3 hours
  - Component discovery logic: 1 hour
  - Testing with examples: 1 hour
  - Documentation: 1 hour

- **Generator Integration** (optional): 2-3 hours
  - Flag implementation: 1 hour
  - Template generation: 1 hour
  - Testing: 1 hour

**Total**: 4-9 hours depending on scope

---

## Next Steps

1. ✅ **Approve briefing** - Review and sign off on approach
2. 🔧 **Implement bug fix** - Create useCollectionItem, fix CardMini
3. 🎨 **Implement enhancement** - Add custom component discovery
4. 🧪 **Test thoroughly** - Unit, integration, E2E tests
5. 📝 **Create documentation** - User-facing docs at `/Users/pmcp/Projects/crouton-docs/content`
6. 🚀 **Deploy and monitor** - Watch for issues in production

---

## Documentation Task

### Final Step: Create User Documentation

**Location**: `/Users/pmcp/Projects/crouton-docs/content`

**Files to Create**:

1. **`/Users/pmcp/Projects/crouton-docs/content/components/card-mini.md`**
   - Overview of CardMini component
   - When and where it's used
   - Default behavior

2. **`/Users/pmcp/Projects/crouton-docs/content/guides/custom-card-mini.md`**
   - How to create custom CardMini components
   - File location conventions
   - Props contract reference
   - Step-by-step examples
   - Internal vs external collections
   - Troubleshooting

3. **`/Users/pmcp/Projects/crouton-docs/content/api/use-collection-item.md`**
   - API reference for useCollectionItem composable
   - Parameters
   - Return values
   - Examples
   - Advanced usage

**Documentation Structure**:

```markdown
# Custom CardMini Components

## Overview

CardMini is a compact display component for showing related entities in tables and forms...

## Quick Start

Create a custom CardMini by adding a file to your collection:

\`\`\`
collections/locations/app/components/CardMini.vue
\`\`\`

## Props Contract

All custom CardMini components receive these props:

\`\`\`ts
defineProps<{
  item: any | null
  pending: boolean
  error: any | null
  id: string
  collection: string
  refresh: () => Promise<void>
}>()
\`\`\`

## Examples

### Internal Collection

[Full example...]

### External Collection

[Full example...]

## File Locations

- **Internal collections**: `collections/{name}/app/components/CardMini.vue`
- **External collections**: `app/components/{Name}CardMini.vue`

## Troubleshooting

**My custom card isn't showing up**
- Check file naming...
- Verify component name...

**TypeScript errors with props**
- Ensure all required props...
```

---

## Questions?

- How should we handle collections that need multiple card variants (e.g., compact vs. expanded)?
- Should we add a `size` prop for card variants?
- Do we need a way to disable the custom component lookup for specific instances?

---

**End of Briefing**
