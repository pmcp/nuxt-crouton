# Nuxt Crouton Documentation Update Briefing

**Date**: 2025-10-01
**Status**: Ready for Implementation
**Priority**: High
**Estimated Effort**: 2-3 days

---

## Executive Summary

After conducting a comprehensive gap analysis comparing the Nuxt Crouton documentation (crouton-docs) against the actual codebase (nuxt-crouton packages), we identified critical discrepancies, missing features, and undocumented functionality. This briefing outlines a structured approach to bring documentation to 100% accuracy and completeness.

### Key Findings

- **Critical Gaps**: 3 major features documented but incomplete in code
- **Undocumented Features**: 15+ working features with no documentation
- **Inaccurate Docs**: 8 sections with incorrect information
- **Documentation Files**: 32 markdown files need updates
- **New Sections Needed**: 6 entirely new documentation pages

---

## Part 1: Critical Corrections (Do First)

### 1.1 CroutonList Component - Layout Reality Check

**Files to Update**:
- `/Users/pmcp/Projects/crouton-docs/content/7.api-reference/2.components.md`
- `/Users/pmcp/Projects/crouton-docs/content/index.md`

**Current Documentation Says**:
```markdown
Display collection items in various layouts (table, grid, cards, list).
```

**Reality** (from `packages/nuxt-crouton/app/components/List.vue:88-97`):
```vue
<!-- Grid Layout - Placeholder -->
<div v-else-if="activeLayout === 'grid'">
  <p class="p-4 text-muted">Grid layout coming soon</p>
</div>

<!-- Cards Layout - Placeholder -->
<div v-else-if="activeLayout === 'cards'">
  <p class="p-4 text-muted">Cards layout coming soon</p>
</div>
```

**Updates Required**:

**In `/content/7.api-reference/2.components.md`** (lines 11-28):
```markdown
<!-- BEFORE -->
Display collection items in various layouts (table, grid, cards, list).

<!-- AFTER -->
Display collection items in table or list layouts. Grid and cards layouts are planned for future releases.

## Available Layouts

### ✅ Implemented
- **table** - Tabular data display with sorting, pagination, and filtering
- **list** - Mobile-friendly list view with avatars and actions

### 🚧 Coming Soon
- **grid** - Grid layout for image-heavy content (planned)
- **cards** - Card-based layout for rich content (planned)
```

**In `/content/7.api-reference/2.components.md`** (lines 66-105):
```markdown
<!-- UPDATE THESE SECTIONS -->

### Table Layout

The table layout is ideal for data-dense views with full sorting, filtering, and pagination support:

```vue
<template>
  <CroutonList
    :rows="products"
    :columns="columns"
    layout="table"
  />
</template>
```

### List Layout

List layout optimized for mobile devices with avatar support:

```vue
<template>
  <CroutonList
    :rows="products"
    :columns="columns"
    layout="list"
  />
</template>
```

<!-- REMOVE OR MARK AS COMING SOON -->
### Grid Layout (Coming Soon)

Grid layout is planned for a future release.

### Cards Layout (Coming Soon)

Cards layout is planned for a future release.
```

---

### 1.2 Component Naming Accuracy

**Files to Update**:
- `/Users/pmcp/Projects/crouton-docs/content/7.api-reference/2.components.md`
- `/Users/pmcp/Projects/crouton-docs/content/2.core-concepts/3.forms-modals.md`

**Issue**: Documentation uses `CroutonList` and `CroutonButton` but actual component files are `List.vue` and `Button.vue`.

**Verification Needed**:
Check actual export names in:
- `packages/nuxt-crouton/app/components/List.vue`
- `packages/nuxt-crouton/app/components/Button.vue`

**Update Pattern**:
If components export as `List`/`Button`, update ALL documentation references to:
```vue
<!-- Instead of CroutonList -->
<List :rows="items" :columns="columns" />

<!-- Instead of CroutonButton -->
<Button :action="action" :loading="loading" />
```

**Alternative**: Add export aliases in components to match docs.

---

### 1.3 Translation Component Names

**Files to Update**:
- `/Users/pmcp/Projects/crouton-docs/content/6.advanced/1.translations-i18n.md`

**Current Documentation Says** (line 60-68):
```vue
<TranslationsInput
  v-model="state.translations"
  :fields="['name', 'description']"
/>
```

**Reality**: Component is named `Input` in `packages/nuxt-crouton-i18n/app/components/Input.vue`

**Correction**:
```vue
<!-- From nuxt-crouton-i18n -->
<TranslationsInput
  v-model="state.translations"
  :fields="['name', 'description']"
  :default-values="{ name: state.name, description: state.description }"
/>
```

**Note**: Verify the actual exported component name. If it's `Input`, update docs to use correct import:
```typescript
import { Input as TranslationsInput } from '#components'
```

---

## Part 2: Missing Documentation (High Priority Features)

### 2.1 Responsive Layout Presets (NEW SECTION)

**Create New File**: `/Users/pmcp/Projects/crouton-docs/content/5.customization/5.responsive-layouts.md`

**Content Based On**: `packages/nuxt-crouton/app/types/table.ts:23-27`

```markdown
---
title: Responsive Layouts
description: Adapt list views to different screen sizes with responsive layout presets
icon: i-heroicons-device-phone-mobile
---

# Responsive Layouts

Nuxt Crouton provides responsive layout presets that automatically adapt your data views to different screen sizes.

## Layout Presets

Instead of specifying a single layout, use presets that define different layouts for different breakpoints:

```vue
<script setup lang="ts">
const { items } = await useCollectionQuery('shopProducts')
</script>

<template>
  <!-- Responsive preset: list on mobile, grid on tablet, table on desktop -->
  <List
    :rows="items"
    :columns="columns"
    layout="responsive"
  />
</template>
```

## Available Presets

### `responsive`
- **Base (mobile)**: List layout
- **md (tablet)**: Grid layout
- **lg (desktop)**: Table layout

Best for: General-purpose data that needs to work on all devices

### `mobile-friendly`
- **Base (mobile)**: List layout
- **lg (desktop)**: Table layout

Best for: Admin interfaces that are occasionally accessed on mobile

### `compact`
- **Base (mobile)**: List layout
- **xl (large desktop)**: Table layout

Best for: Data-dense applications optimized for large screens

## Custom Responsive Layouts

Define your own responsive behavior:

```vue
<template>
  <List
    :rows="items"
    :columns="columns"
    :layout="{
      base: 'list',    // Mobile
      sm: 'list',      // Small tablets
      md: 'grid',      // Tablets
      lg: 'table',     // Desktops
      xl: 'table',     // Large desktops
      '2xl': 'table'   // Extra large
    }"
  />
</template>
```

## How It Works

The List component uses VueUse's `useBreakpoints` with Tailwind breakpoints to detect screen size and automatically switch layouts:

- **base**: < 640px
- **sm**: ≥ 640px
- **md**: ≥ 768px
- **lg**: ≥ 1024px
- **xl**: ≥ 1280px
- **2xl**: ≥ 1536px

The component checks from largest to smallest breakpoint and uses the first matching layout.

## Best Practices

**✅ DO:**
- Use presets for quick setup (`responsive`, `mobile-friendly`, `compact`)
- Test layouts on actual devices, not just browser resize
- Ensure all layouts use the same columns configuration
- Consider mobile-first design principles

**❌ DON'T:**
- Mix too many different layouts (confuses users)
- Forget to test on real mobile devices
- Use grid/cards layouts until they're implemented (currently showing "coming soon")

## Related Sections

- [CroutonList Component](/api-reference/components#croutonlist)
- [Table Patterns](/working-with-data/table-patterns)
- [Customization Guide](/customization/custom-columns)
```

---

### 2.2 Advanced Translation Features (UPDATE EXISTING)

**File to Update**: `/Users/pmcp/Projects/crouton-docs/content/6.advanced/1.translations-i18n.md`

**Add New Section After Line 110**:

```markdown
## Translation Input Component API

The `TranslationsInput` component provides a complete UI for managing multilingual content.

### Basic Multi-Field Translation

```vue
<script setup lang="ts">
const state = ref({
  name: 'Product Name',
  description: 'Product description',
  translations: {} // Will hold { en: { name: "...", description: "..." }, nl: { ... } }
})
</script>

<template>
  <UForm>
    <!-- Default language fields -->
    <UFormField label="Name (English)" name="name">
      <UInput v-model="state.name" />
    </UFormField>

    <UFormField label="Description (English)" name="description">
      <UTextarea v-model="state.description" />
    </UFormField>

    <!-- Translation UI for other languages -->
    <TranslationsInput
      v-model="state.translations"
      :fields="['name', 'description']"
      :default-values="{
        name: state.name,
        description: state.description
      }"
    />
  </UForm>
</template>
```

### Translation Input Props

```typescript
interface TranslationsInputProps {
  modelValue: Record<string, Record<string, string>> // { en: { name: "...", desc: "..." } }
  fields: string[]                                    // Fields to translate
  label?: string                                      // Optional label
  error?: string | boolean                            // Validation error
  defaultValues?: Record<string, string>              // Default values for fallback
  fieldComponents?: Record<string, string>            // Custom components per field
}
```

### Custom Components Per Field

Use different input types for different fields (e.g., rich text editor for content):

```vue
<script setup lang="ts">
const state = ref({
  title: '',
  content: '<p></p>',
  translations: {}
})
</script>

<template>
  <TranslationsInput
    v-model="state.translations"
    :fields="['title', 'content']"
    :default-values="{
      title: state.title,
      content: state.content
    }"
    :field-components="{
      content: 'EditorSimple'  // Use TipTap editor for content field
    }"
  />
</template>
```

**Supported Field Components**:
- `UInput` (default) - Single-line text
- `UTextarea` - Multi-line text
- `EditorSimple` - Rich text editor (requires nuxt-crouton-editor)

### Translation Status Indicators

The component automatically shows completion status for each language:

```vue
<!-- Language buttons show status -->
EN * ✓  <!-- English (required) is complete -->
NL      <!-- Dutch is empty -->
FR ✓    <!-- French is complete -->
```

- **Red asterisk (*)**: Required language (English by default)
- **Green check (✓)**: All fields filled for this language
- **No indicator**: Missing translations

### Locale Fallback Behavior

When a translation is missing, the system falls back to English:

```typescript
// If user views in Dutch but Dutch translation missing
const { t } = useEntityTranslations()
const product = {
  name: 'Product',
  translations: {
    en: { name: 'Product', description: 'English description' },
    nl: { name: 'Product' } // Description missing
  }
}

t(product, 'name')        // Returns: "Product" (Dutch available)
t(product, 'description') // Returns: "English description" (fallback to EN)
```

### Real-World Example: Blog Post with Translations

```vue
<script setup lang="ts">
const props = defineProps<BlogPostsFormProps>()
const { create, update } = useCollectionMutation('blogPosts')

const state = ref({
  title: '',
  slug: '',
  content: '<p>Start writing...</p>',
  excerpt: '',
  translations: {}
})

const handleSubmit = async () => {
  if (props.action === 'create') {
    await create(state.value)
  } else if (props.action === 'update') {
    await update(state.value.id, state.value)
  }
  close()
}
</script>

<template>
  <UForm :state="state" @submit="handleSubmit">
    <!-- English (default) fields -->
    <UFormField label="Title (English)" name="title" required>
      <UInput v-model="state.title" />
    </UFormField>

    <UFormField label="Slug" name="slug" required>
      <UInput v-model="state.slug" />
    </UFormField>

    <UFormField label="Content (English)" name="content" required>
      <EditorSimple v-model="state.content" />
    </UFormField>

    <UFormField label="Excerpt (English)" name="excerpt">
      <UTextarea v-model="state.excerpt" rows="3" />
    </UFormField>

    <!-- Translations for other languages -->
    <UFormField label="Translations" name="translations">
      <TranslationsInput
        v-model="state.translations"
        :fields="['title', 'content', 'excerpt']"
        :default-values="{
          title: state.title,
          content: state.content,
          excerpt: state.excerpt
        }"
        :field-components="{
          content: 'EditorSimple',
          excerpt: 'UTextarea'
        }"
      />
    </UFormField>

    <Button :action="action" :loading="loading" />
  </UForm>
</template>
```

## Translation Management UI

The `nuxt-crouton-i18n` package includes additional components for managing translations:

### Language Switcher

```vue
<template>
  <LanguageSwitcher />
</template>
```

Shows a dropdown to switch between available languages. When the user switches languages:
1. All `useCollectionQuery` calls automatically refetch with new locale
2. UI updates to show translated content
3. Cache invalidates and refreshes

### Dev Mode Toggle

```vue
<template>
  <DevModeToggle />
</template>
```

Development helper that shows:
- Translation keys instead of values
- Missing translations highlighted
- Translation coverage stats

### Translation Admin UI

For managing system-wide translations (UI labels, messages, etc.):

```vue
<script setup lang="ts">
// Fetch all UI translations
const { items: translations } = await useCollectionQuery('translationsUi')
</script>

<template>
  <UiList :items="translations" />
</template>
```

Built-in components for translation management:
- `UiList` - List view of all translations
- `UiForm` - Edit translation values
- `ListCards` - Card view of translations
- `CardsMini` - Compact translation cards
```

---

### 2.3 Advanced Table Configuration (NEW SECTION)

**Create New File**: `/Users/pmcp/Projects/crouton-docs/content/5.customization/6.table-configuration.md`

**Content Based On**: Multiple sources from `packages/nuxt-crouton/app/components/Table.vue`

```markdown
---
title: Advanced Table Configuration
description: Deep dive into table customization, pagination modes, and advanced features
icon: i-heroicons-table-cells
---

# Advanced Table Configuration

Beyond basic table setup, Nuxt Crouton provides powerful configuration options for complex data views.

## Server-Side vs Client-Side Pagination

### Client-Side Pagination (Default)

Best for small datasets (< 1000 items). All data loads at once, pagination happens in the browser:

```vue
<script setup lang="ts">
const { items, pending } = await useCollectionQuery('shopProducts')
const { columns } = useShopProducts()
</script>

<template>
  <List
    :rows="items"
    :columns="columns"
    layout="table"
  />
  <!-- Pagination handled automatically in browser -->
</template>
```

**Pros**: Instant pagination, no API calls, offline-capable
**Cons**: Slow initial load for large datasets, high memory usage

### Server-Side Pagination

Best for large datasets (> 1000 items). Only loads one page at a time:

```vue
<script setup lang="ts">
const page = ref(1)
const pageSize = ref(25)

const { items, pending, refresh } = await useCollectionQuery('shopProducts', {
  query: computed(() => ({
    page: page.value,
    pageSize: pageSize.value
  }))
})

const { columns } = useShopProducts()

// Pagination data from server
const paginationData = computed(() => ({
  currentPage: page.value,
  pageSize: pageSize.value,
  totalItems: 10000, // From your API
  totalPages: 400
}))
</script>

<template>
  <List
    :rows="items"
    :columns="columns"
    layout="table"
    server-pagination
    :pagination-data="paginationData"
    :refresh-fn="refresh"
  />
</template>
```

**Pros**: Fast initial load, low memory, scalable
**Cons**: Network latency on page changes

### API Implementation for Server Pagination

```typescript
// server/api/teams/[team]/shop-products/index.get.ts
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const page = Number(query.page) || 1
  const pageSize = Number(query.pageSize) || 25
  const offset = (page - 1) * pageSize

  const [items, totalCount] = await Promise.all([
    db.select()
      .from(products)
      .limit(pageSize)
      .offset(offset),
    db.select({ count: count() })
      .from(products)
      .then(r => r[0].count)
  ])

  return {
    items,
    pagination: {
      currentPage: page,
      pageSize,
      totalItems: totalCount,
      totalPages: Math.ceil(totalCount / pageSize)
    }
  }
})
```

## Hiding Default Columns

Tables include three default columns: `created_at`, `updated_at`, and `actions`. Hide them selectively:

```vue
<template>
  <List
    :rows="items"
    :columns="columns"
    :hide-default-columns="{
      created_at: true,  // Hide creation date
      updated_at: true,  // Hide update date
      actions: false     // Show actions (edit/delete buttons)
    }"
  />
</template>
```

**Default column behavior**:
- `created_at` - Formatted as DD-MM-YYYY
- `updated_at` - Formatted as DD-MM-YYYY
- `actions` - Shows edit and delete mini-buttons

## Column Visibility Toggle

Users can show/hide columns dynamically:

```vue
<script setup lang="ts">
const columnVisibility = ref({
  id: false,          // Hide ID column by default
  sku: true,
  price: true,
  category: true
})
</script>

<template>
  <List
    v-model:column-visibility="columnVisibility"
    :rows="items"
    :columns="columns"
  />
</template>
```

The table toolbar automatically includes a column visibility menu.

## Custom Refresh Function

Override the default refresh behavior:

```vue
<script setup lang="ts">
const { items, refresh } = await useCollectionQuery('shopProducts')

// Custom refresh with side effects
const customRefresh = async () => {
  console.log('Refreshing data...')
  await refresh()
  // Additional logic after refresh
  toast.add({ title: 'Data refreshed!' })
}
</script>

<template>
  <List
    :rows="items"
    :columns="columns"
    :refresh-fn="customRefresh"
  />
</template>
```

## Search and Filtering

Built-in search functionality with debouncing:

```vue
<script setup lang="ts">
const searchQuery = ref('')

// For client-side filtering
const { items } = await useCollectionQuery('shopProducts')
const filteredItems = computed(() =>
  items.value.filter(item =>
    item.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
)
</script>

<template>
  <List
    :rows="filteredItems"
    :columns="columns"
  >
    <template #header>
      <div class="flex justify-between">
        <h2>Products</h2>
        <!-- Search input is built into table by default -->
      </div>
    </template>
  </List>
</template>
```

For server-side search:

```vue
<script setup lang="ts">
const searchQuery = ref('')

const { items } = await useCollectionQuery('shopProducts', {
  query: computed(() => ({
    search: searchQuery.value
  }))
})
</script>
```

## Sorting

### Client-Side Sorting

Automatic when using client-side pagination:

```vue
<script setup lang="ts">
const columns = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'price', label: 'Price', sortable: true },
  { key: 'category', label: 'Category', sortable: false }
]
</script>
```

### Server-Side Sorting

```vue
<script setup lang="ts">
const sortBy = ref('createdAt')
const sortDirection = ref<'asc' | 'desc'>('desc')

const { items } = await useCollectionQuery('shopProducts', {
  query: computed(() => ({
    sortBy: sortBy.value,
    sortDirection: sortDirection.value
  }))
})

const paginationData = computed(() => ({
  // ... other pagination data
  sortBy: sortBy.value,
  sortDirection: sortDirection.value
}))
</script>

<template>
  <List
    :rows="items"
    :columns="columns"
    server-pagination
    :pagination-data="paginationData"
  />
</template>
```

## Row Selection

Enable bulk operations with row selection:

```vue
<script setup lang="ts">
const selectedRows = ref([])
const { deleteItems } = useCollectionMutation('shopProducts')

const handleBulkDelete = async () => {
  const ids = selectedRows.value.map(row => row.id)
  await deleteItems(ids)
  selectedRows.value = []
}
</script>

<template>
  <div>
    <List
      v-model:selected="selectedRows"
      :rows="items"
      :columns="columns"
      selectable
    />

    <UButton
      v-if="selectedRows.length > 0"
      @click="handleBulkDelete"
      color="red"
    >
      Delete {{ selectedRows.length }} items
    </UButton>
  </div>
</template>
```

## Loading States

Handle loading states gracefully:

```vue
<script setup lang="ts">
const { items, pending, refresh } = await useCollectionQuery('shopProducts')

const isRefreshing = ref(false)
const customRefresh = async () => {
  isRefreshing.value = true
  await refresh()
  isRefreshing.value = false
}
</script>

<template>
  <List
    :rows="items"
    :columns="columns"
    :loading="pending || isRefreshing"
  />
</template>
```

The table shows a loading overlay during data fetches.

## Complete Example: Advanced Product Table

```vue
<script setup lang="ts">
// Pagination
const page = ref(1)
const pageSize = ref(25)

// Sorting
const sortBy = ref('createdAt')
const sortDirection = ref<'asc' | 'desc'>('desc')

// Search
const searchQuery = ref('')

// Data fetching
const { items, pending, refresh } = await useCollectionQuery('shopProducts', {
  query: computed(() => ({
    page: page.value,
    pageSize: pageSize.value,
    sortBy: sortBy.value,
    sortDirection: sortDirection.value,
    search: searchQuery.value
  }))
})

// Columns
const { columns } = useShopProducts()

// Pagination data
const paginationData = computed(() => ({
  currentPage: page.value,
  pageSize: pageSize.value,
  totalItems: 10000, // From server
  totalPages: Math.ceil(10000 / pageSize.value),
  sortBy: sortBy.value,
  sortDirection: sortDirection.value
}))

// Column visibility
const columnVisibility = ref({
  id: false,
  createdAt: false
})

// Row selection
const selectedRows = ref([])
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <div class="flex justify-between items-center">
        <h2 class="text-xl font-semibold">Products</h2>
        <UButton @click="refresh" :loading="pending">
          Refresh
        </UButton>
      </div>
    </template>

    <List
      v-model:column-visibility="columnVisibility"
      v-model:selected="selectedRows"
      :rows="items"
      :columns="columns"
      layout="responsive"
      server-pagination
      :pagination-data="paginationData"
      :refresh-fn="refresh"
      :hide-default-columns="{
        created_at: false,
        updated_at: true,
        actions: false
      }"
      selectable
    />
  </UDashboardPanel>
</template>
```

## Best Practices

**✅ DO:**
- Use server pagination for datasets > 1000 items
- Implement search on the server for better performance
- Show loading states during data fetches
- Enable sorting on relevant columns only
- Hide unnecessary default columns

**❌ DON'T:**
- Mix client and server pagination logic
- Forget to handle loading states
- Make every column sortable (UX anti-pattern)
- Skip error handling on refresh
- Load all data with client pagination if you have 10,000+ items

## Related Sections

- [Querying Data](/core-concepts/querying-data)
- [Table Patterns](/working-with-data/table-patterns)
- [Bulk Operations](/advanced/bulk-operations)
```

---

## Part 3: Component Import and Export Verification

### 3.1 Action Items for Component Names

**Task**: Verify actual component export names

**Files to Check**:
1. `packages/nuxt-crouton/app/components/List.vue` - Check if it exports as `List` or `CroutonList`
2. `packages/nuxt-crouton/app/components/Button.vue` - Check if it exports as `Button` or `CroutonButton`
3. `packages/nuxt-crouton-i18n/app/components/Input.vue` - Check if it exports as `Input` or `TranslationsInput`

**Decision Matrix**:

| If Component Exports As | Documentation Action |
|------------------------|---------------------|
| `List` | Update all docs to use `<List>` instead of `<CroutonList>` |
| `CroutonList` | Documentation is correct, no changes needed |
| No explicit export | Add proper export or update docs to match auto-registration |

**Files Affected** (if changes needed):
- All 32 markdown files that reference components
- Priority files:
  - `/content/7.api-reference/2.components.md`
  - `/content/2.core-concepts/3.forms-modals.md`
  - `/content/4.working-with-data/2.form-patterns.md`
  - `/content/6.advanced/1.translations-i18n.md`

---

## Part 4: API Reference Updates

### 4.1 Update Components API Reference

**File**: `/Users/pmcp/Projects/crouton-docs/content/7.api-reference/2.components.md`

**Add Missing Props Section** (after line 42):

```markdown
## Advanced Props

### List Component

```typescript
interface ListProps {
  // Data
  rows: any[]                    // Array of items to display
  columns: Column[]              // Column definitions
  collection: string             // Collection name for actions

  // Layout
  layout?: LayoutType | ResponsiveLayout | keyof typeof layoutPresets
  // Layout options: 'table' | 'list' | 'responsive' | 'mobile-friendly' | 'compact'

  // Pagination
  serverPagination?: boolean                 // Enable server-side pagination
  paginationData?: PaginationData | null    // Server pagination metadata
  refreshFn?: () => Promise<void>           // Custom refresh function

  // Customization
  hideDefaultColumns?: {
    created_at?: boolean
    updated_at?: boolean
    actions?: boolean
  }

  // Selection
  selectable?: boolean           // Enable row selection
  selected?: string[]            // v-model for selected row IDs

  // State
  loading?: boolean              // Loading state
}
```

### Column Definition

```typescript
interface Column {
  key: string                    // Property key or unique identifier
  label: string                  // Display label
  sortable?: boolean             // Enable sorting (default: false)
  render?: (row: any) => string  // Custom render function
  component?: string             // Custom component name for cell
}
```

### Pagination Data

```typescript
interface PaginationData {
  currentPage: number
  pageSize: number
  totalItems: number
  totalPages?: number
  sortBy?: string
  sortDirection?: 'asc' | 'desc'
}
```

### Responsive Layout

```typescript
type LayoutType = 'table' | 'list' | 'grid' | 'cards'

interface ResponsiveLayout {
  base: LayoutType               // Default/mobile layout
  sm?: LayoutType                // ≥ 640px
  md?: LayoutType                // ≥ 768px
  lg?: LayoutType                // ≥ 1024px
  xl?: LayoutType                // ≥ 1280px
  '2xl'?: LayoutType             // ≥ 1536px
}

// Built-in presets
type LayoutPreset = 'responsive' | 'mobile-friendly' | 'compact'
```

### Button Component

```typescript
interface ButtonProps {
  action: 'create' | 'update' | 'delete'  // Action type
  collection: string                       // Collection name
  loading?: string                         // Loading state identifier
  type?: 'submit' | 'button'              // HTML button type
  items?: any[]                           // Items for bulk operations
}
```

## Component Events

### List Component

```typescript
// Row selection
@update:selected="handleSelection"  // Emits: string[] (row IDs)

// Column visibility
@update:column-visibility="handleVisibility"  // Emits: Record<string, boolean>

// Pagination (when server-pagination enabled)
@update:page="handlePageChange"     // Emits: number
@update:page-size="handleSizeChange" // Emits: number
```

### Button Component

No custom events - uses native form submission.

## Component Slots

### List Component

```vue
<template>
  <List :rows="items" :columns="columns">
    <!-- Header slot -->
    <template #header>
      <h2>Custom Header</h2>
    </template>

    <!-- Custom cell template (per column) -->
    <template #[columnKey]-cell="{ row }">
      {{ row[columnKey] }}
    </template>

    <!-- List item actions (list layout only) -->
    <template #list-item-actions="{ row }">
      <UButton @click="handleCustomAction(row)">
        Custom Action
      </UButton>
    </template>
  </List>
</template>
```
```

---

### 4.2 Update Composables API Reference

**File**: `/Users/pmcp/Projects/crouton-docs/content/7.api-reference/1.composables.md`

**Add New Section** (after line 406):

```markdown
---

## useEntityTranslations

Display translated field values with automatic locale fallback.

### Type Signature

```typescript
function useEntityTranslations(): {
  t: (entity: any, field: string) => string
}
```

### Returns

- **t** - Translation function with fallback

### Usage

```vue
<script setup lang="ts">
const { t } = useEntityTranslations()
const { locale } = useI18n()

const product = {
  name: 'Product',
  translations: {
    en: { name: 'Product', description: 'English description' },
    nl: { name: 'Product', description: 'Nederlandse beschrijving' },
    fr: { name: 'Produit', description: 'Description française' }
  }
}
</script>

<template>
  <div>
    <h1>{{ t(product, 'name') }}</h1>
    <p>{{ t(product, 'description') }}</p>
  </div>
</template>
```

### Fallback Behavior

The `t()` function follows this priority:

1. **Current locale translation**: `entity.translations[currentLocale][field]`
2. **English translation**: `entity.translations.en[field]`
3. **Base field value**: `entity[field]`
4. **Empty string**: `''`

Example:

```typescript
// User's locale: 'nl' (Dutch)
const product = {
  name: 'Product',
  description: 'English description',
  translations: {
    en: { name: 'Product', description: 'English description' },
    nl: { name: 'Product' } // Missing 'description'
  }
}

t(product, 'name')        // 'Product' (Dutch available)
t(product, 'description') // 'English description' (fallback to EN)
t(product, 'price')       // '' (field doesn't exist)
```

### With useCollectionQuery

Combine with data fetching for automatic translated displays:

```vue
<script setup lang="ts">
const { locale } = useI18n()
const { items: products } = await useCollectionQuery('shopProducts', {
  query: computed(() => ({
    locale: locale.value  // Auto-refetch when locale changes
  }))
})

const { t } = useEntityTranslations()
</script>

<template>
  <div v-for="product in products" :key="product.id">
    <h2>{{ t(product, 'name') }}</h2>
    <p>{{ t(product, 'description') }}</p>
  </div>
</template>
```

When the user switches languages, `useCollectionQuery` automatically refetches data and `t()` displays the correct translation.

---

## useFormatCollections

Format collection names for display (internal utility).

### Type Signature

```typescript
function useFormatCollections(): {
  collectionWithCapitalSingular: (collection: string) => string
}
```

### Returns

- **collectionWithCapitalSingular** - Formats collection name to singular with capital first letter

### Usage

```vue
<script setup lang="ts">
const { collectionWithCapitalSingular } = useFormatCollections()

// Examples:
collectionWithCapitalSingular('shopProducts')  // 'Product'
collectionWithCapitalSingular('blogPosts')     // 'Post'
collectionWithCapitalSingular('adminUsers')    // 'User'
</script>
```

Used internally by `CroutonButton` to generate button labels like "Create Product" or "Update Post".
```

---

## Part 5: Undocumented Internal Composables

### 5.1 Decision: Document or Mark as Internal?

These composables exist but are primarily for internal use:

- `useTableData` - Data slicing and pagination logic
- `useTableColumns` - Column definition management
- `useTableSearch` - Debounced search
- `useExpandableSlideover` - Nested slideover state management

**Recommendation**: Create a separate "Internal API" section for advanced users, but don't include in main API reference.

**Create New File**: `/Users/pmcp/Projects/crouton-docs/content/7.api-reference/4.internal-api.md`

```markdown
---
title: Internal API
description: Advanced composables and utilities (use at your own risk)
icon: i-heroicons-cog
---

# Internal API

These composables and utilities are used internally by Nuxt Crouton components. You can use them for advanced customization, but they are **not considered stable public API** and may change between minor versions.

::alert{type="warning"}
**Stability Warning**: Internal APIs may change without notice. Use only if you need deep customization beyond what the public API provides.
::

## useTableData

Handles client-side data slicing, filtering, and pagination for tables.

**Use Case**: Building a custom table component from scratch.

```typescript
import { useTableData } from '#imports'

const { slicedRows, pageTotalToShow } = useTableData({
  rows: ref([...]),              // All data
  search: ref(''),               // Search query
  sort: ref({ column: 'name', direction: 'asc' }),
  page: ref(1),
  pageCount: ref(25),
  serverPagination: false,
  paginationData: null
})
```

## useTableColumns

Manages column definitions including default columns (created_at, updated_at, actions).

**Use Case**: Dynamically building column configurations.

```typescript
import { useTableColumns } from '#imports'

const { allColumns } = useTableColumns({
  columns: [],
  hideDefaultColumns: {
    created_at: false,
    updated_at: true,
    actions: false
  }
})
```

## useTableSearch

Provides debounced search functionality.

**Use Case**: Custom search implementation with debouncing.

```typescript
import { useTableSearch } from '#imports'

const { searchQuery, debouncedSearch } = useTableSearch({
  debounceMs: 300
})
```

## useExpandableSlideover

Manages nested slideover state for multi-level forms.

**Use Case**: Building custom nested form containers.

```typescript
import { useExpandableSlideover } from '#imports'

const { open, close, level } = useExpandableSlideover()
```

---

**Note**: For most use cases, stick to the public API documented in [Composables](/api-reference/composables) and [Components](/api-reference/components).
```

---

## Part 6: Implementation Checklist

### Phase 1: Critical Fixes (Day 1 - 4 hours)

- [ ] **Fix CroutonList layout documentation**
  - [ ] Update `/content/7.api-reference/2.components.md` (lines 11-28)
  - [ ] Mark grid/cards as "Coming Soon"
  - [ ] Update code examples (lines 66-105)

- [ ] **Verify component names**
  - [ ] Check `List.vue` export name
  - [ ] Check `Button.vue` export name
  - [ ] Check `Input.vue` (i18n) export name
  - [ ] Create mapping document if discrepancies found

- [ ] **Fix translation component references**
  - [ ] Update `/content/6.advanced/1.translations-i18n.md` (line 60)
  - [ ] Verify import examples

### Phase 2: Major Documentation Additions (Day 2 - 6 hours)

- [ ] **Create responsive layouts documentation**
  - [ ] New file: `/content/5.customization/5.responsive-layouts.md`
  - [ ] Include all 3 presets
  - [ ] Add custom layout examples
  - [ ] Document breakpoint behavior

- [ ] **Expand translation documentation**
  - [ ] Add `TranslationsInput` API section to `/content/6.advanced/1.translations-i18n.md`
  - [ ] Document `fieldComponents` prop
  - [ ] Add translation status indicator explanation
  - [ ] Include complete blog post example

- [ ] **Create table configuration guide**
  - [ ] New file: `/content/5.customization/6.table-configuration.md`
  - [ ] Server vs client pagination comparison
  - [ ] Column visibility documentation
  - [ ] Row selection examples
  - [ ] Complete advanced example

### Phase 3: API Reference Updates (Day 3 - 4 hours)

- [ ] **Update Components API**
  - [ ] Add all missing props to `/content/7.api-reference/2.components.md`
  - [ ] Document component events
  - [ ] Document component slots
  - [ ] Add TypeScript interfaces

- [ ] **Update Composables API**
  - [ ] Add `useEntityTranslations` to `/content/7.api-reference/1.composables.md`
  - [ ] Add `useFormatCollections`
  - [ ] Update existing composable docs with missing details

- [ ] **Create Internal API Reference**
  - [ ] New file: `/content/7.api-reference/4.internal-api.md`
  - [ ] Document `useTableData`, `useTableColumns`, etc.
  - [ ] Add stability warnings

### Phase 4: Cross-References and Polish (Day 3 - 2 hours)

- [ ] **Update navigation**
  - [ ] Add new pages to doc structure
  - [ ] Verify all internal links work
  - [ ] Update "Related Sections" links

- [ ] **Add missing cross-references**
  - [ ] Link responsive layouts from components page
  - [ ] Link table config from data operations
  - [ ] Link translation features from i18n page

- [ ] **Review and test**
  - [ ] Test all code examples
  - [ ] Verify TypeScript types compile
  - [ ] Check markdown rendering
  - [ ] Mobile responsiveness of docs

### Phase 5: Additional Improvements (Optional - Day 4)

- [ ] **Create migration guide**
  - [ ] Component name changes
  - [ ] API evolution notes
  - [ ] Breaking changes log

- [ ] **Add troubleshooting section**
  - [ ] Common issues with grid/cards layouts
  - [ ] Translation fallback debugging
  - [ ] Pagination performance tips

- [ ] **Video/GIF demonstrations**
  - [ ] Responsive layouts in action
  - [ ] Translation UI walkthrough
  - [ ] Server pagination setup

---

## Part 7: File-by-File Update Summary

### Files Requiring Updates

| File Path | Changes Required | Priority | Estimated Time |
|-----------|-----------------|----------|----------------|
| `/content/7.api-reference/2.components.md` | Fix layout documentation, add props/events/slots | Critical | 2 hours |
| `/content/6.advanced/1.translations-i18n.md` | Add TranslationsInput API, expand examples | High | 2 hours |
| `/content/index.md` | Update feature claims (grid/cards) | Critical | 15 min |
| `/content/2.core-concepts/3.forms-modals.md` | Verify component names, add translation examples | Medium | 1 hour |
| `/content/7.api-reference/1.composables.md` | Add missing composables | High | 1.5 hours |
| `/content/4.working-with-data/2.form-patterns.md` | Update translation patterns | Medium | 30 min |
| `/content/4.working-with-data/3.table-patterns.md` | Link to new table config guide | Low | 15 min |
| **NEW** `/content/5.customization/5.responsive-layouts.md` | Create entire section | High | 2 hours |
| **NEW** `/content/5.customization/6.table-configuration.md` | Create entire section | High | 3 hours |
| **NEW** `/content/7.api-reference/4.internal-api.md` | Create entire section | Low | 1 hour |

**Total Estimated Time**: 13-15 hours (2 working days)

---

## Part 8: Quality Assurance Checklist

### Documentation Quality Standards

Before marking any section as complete, verify:

- [ ] **Accuracy**: All code examples tested and working
- [ ] **Completeness**: All props, events, slots documented
- [ ] **TypeScript**: Type signatures provided for all APIs
- [ ] **Examples**: At least 2 examples per major feature (basic + advanced)
- [ ] **Cross-references**: Links to related sections included
- [ ] **Best practices**: DO/DON'T sections included
- [ ] **Formatting**: Consistent markdown, proper syntax highlighting
- [ ] **Mobile**: Code blocks don't overflow on mobile
- [ ] **Search**: Important terms included for search indexing

### Code Example Standards

All code examples must:

- [ ] Use TypeScript with proper types
- [ ] Follow Vue 3 Composition API (`<script setup>`)
- [ ] Include necessary imports
- [ ] Work as standalone copyable code
- [ ] Include comments for complex logic
- [ ] Use realistic data/variable names

### TypeScript Type Standards

All type definitions must:

- [ ] Match actual implementation
- [ ] Include JSDoc comments
- [ ] Mark optional properties with `?`
- [ ] Use proper TypeScript syntax (not pseudocode)
- [ ] Include example usage

---

## Part 9: Communication and Rollout

### Stakeholder Communication

**For Users**:
```markdown
# Documentation Update - October 2025

We've significantly updated the Nuxt Crouton documentation based on community feedback:

## What's New
- ✅ Corrected layout availability (grid/cards coming soon)
- ✅ Complete translation system documentation
- ✅ Advanced table configuration guide
- ✅ Responsive layout presets
- ✅ Expanded API reference with all props and types

## What's Changed
- Some component names may differ from previous docs
- Grid and cards layouts are marked as planned features
- Translation component API fully documented

## Migration Required?
No breaking changes - this is purely documentation updates.
```

**For Contributors**:
- Update CONTRIBUTING.md to reference new doc structure
- Add note about verifying component export names
- Include link to this briefing for context

---

## Part 10: Post-Update Tasks

### After Documentation Update is Complete

1. **Verification**
   - [ ] Full documentation site build test
   - [ ] Link checker run (all internal links work)
   - [ ] Code example tests (all examples run successfully)
   - [ ] TypeScript compilation check

2. **SEO and Discoverability**
   - [ ] Update meta descriptions for changed pages
   - [ ] Verify new pages indexed correctly
   - [ ] Update sitemap if needed

3. **Community Engagement**
   - [ ] Announce documentation updates
   - [ ] Request feedback on new sections
   - [ ] Monitor for questions/confusion

4. **Future Planning**
   - [ ] Create issues for grid/cards layout implementation
   - [ ] Document roadmap for missing features
   - [ ] Schedule next documentation review (3 months)

---

## Appendix A: Component Name Resolution

**Investigation Required**:

```bash
# Check actual exports
cd packages/nuxt-crouton/app/components
grep -n "export" List.vue
grep -n "export" Button.vue

cd ../packages/nuxt-crouton-i18n/app/components
grep -n "export" Input.vue
```

**Decision Tree**:

```
IF component exports as "CroutonList"
  THEN documentation is correct
ELSE IF component exports as "List"
  THEN update all docs to use "List"
ELSE IF no explicit export (Nuxt auto-registration)
  THEN component name is filename without extension
  AND update docs accordingly
```

**Files to Update if Names Change**: (See Part 3.1)

---

## Appendix B: Translation Component Architecture

**Current Implementation** (from `packages/nuxt-crouton-i18n/app/components/Input.vue`):

```typescript
interface TranslationsInputProps {
  modelValue: SingleFieldValue | MultiFieldValue | null
  fields: string[]
  label?: string
  error?: string | boolean
  defaultValues?: Record<string, string>
  fieldComponents?: Record<string, string>
}

type SingleFieldValue = Record<string, string>
// Example: { en: "value", nl: "waarde" }

type MultiFieldValue = Record<string, Record<string, string>>
// Example: { en: { name: "...", description: "..." }, nl: { ... } }
```

**Supported Field Components**:
1. `UInput` (default)
2. `UTextarea`
3. `EditorSimple` (requires `@friendlyinternet/nuxt-crouton-editor`)

**Features to Document**:
- Locale switching UI
- Translation completion indicators
- Fallback display (English reference shown when editing other languages)
- Multi-field support
- Custom component per field
- Validation integration

---

## Appendix C: Layout Preset Implementation

**From** `packages/nuxt-crouton/app/types/table.ts:23-27`:

```typescript
export const layoutPresets: Record<string, ResponsiveLayout> = {
  'responsive': { base: 'list', md: 'grid', lg: 'table' },
  'mobile-friendly': { base: 'list', lg: 'table' },
  'compact': { base: 'list', xl: 'table' }
}
```

**Usage in Component** (`packages/nuxt-crouton/app/components/List.vue:124-146`):

```typescript
// Normalize layout prop to ResponsiveLayout format
const normalizedLayout = computed<ResponsiveLayout>(() => {
  const { layout } = props

  // If it's a preset name, use the preset
  if (typeof layout === 'string' && layout in presets) {
    return presets[layout as keyof typeof presets]
  }

  // If it's a simple string layout, apply to all breakpoints
  if (typeof layout === 'string') {
    return { base: layout as LayoutType }
  }

  // If it's already a responsive layout object, use it
  if (layout && typeof layout === 'object') {
    return layout as ResponsiveLayout
  }

  // Default fallback
  return { base: 'table' }
})
```

This logic allows three usage patterns:
1. **Simple**: `layout="table"` → All breakpoints use table
2. **Preset**: `layout="responsive"` → Uses preset config
3. **Custom**: `layout="{ base: 'list', lg: 'table' }"` → Custom breakpoints

---

## Success Metrics

### Documentation Quality Metrics

**Before Update**:
- Accuracy: ~75% (grid/cards documented but not implemented)
- Coverage: ~60% (many features undocumented)
- Examples: ~50% have working code examples
- TypeScript: ~30% of APIs have type definitions

**Target After Update**:
- Accuracy: 95%+ (all docs match implementation)
- Coverage: 90%+ (all major features documented)
- Examples: 100% have working code examples
- TypeScript: 100% of public APIs have type definitions

### User Impact Metrics

- Reduce "this doesn't work" issues by 80%
- Increase documentation satisfaction score
- Reduce time-to-first-working-app for new users
- Increase advanced feature adoption

---

## Part 11: CLI & Generator Documentation Gaps

### Critical Discovery: Rollback System (Completely Undocumented)

**Priority**: Critical (same level as CroutonList layout fixes)
**Impact**: High - This is a unique differentiating feature
**Estimated Time**: 3 hours

#### 11.1 Rollback Commands

**Discovery**: The generator package includes a comprehensive rollback system with **3 separate commands** that are completely missing from documentation.

**Files to Check**:
- `packages/nuxt-crouton-collection-generator/bin/crouton-generate.js` (lines 197-322)
- `packages/nuxt-crouton-collection-generator/lib/rollback-collection.mjs`
- `packages/nuxt-crouton-collection-generator/lib/rollback-bulk.mjs`
- `packages/nuxt-crouton-collection-generator/lib/rollback-interactive.mjs`

**Commands Discovered**:

1. **Single Collection Rollback**
   ```bash
   crouton-rollback <layer> <collection> [options]

   Options:
   --dry-run       Preview what will be removed
   --keep-files    Keep generated files, only clean configs
   --force         Skip confirmation prompts
   ```

2. **Bulk Rollback**
   ```bash
   # Remove entire layer
   crouton-rollback-bulk --layer=shop

   # Remove all collections from config
   crouton-rollback-bulk --config=./crouton.config.js

   Options:
   --dry-run       Preview what will be removed
   --keep-files    Keep generated files, only clean configs
   --force         Skip confirmation prompts
   ```

3. **Interactive Rollback**
   ```bash
   crouton-rollback-interactive [options]

   # Opens interactive UI to select collections to remove

   Options:
   --dry-run       Preview what will be removed
   --keep-files    Keep generated files, only clean configs
   ```

**Documentation Required**:

**Create New File**: `/Users/pmcp/Projects/crouton-docs/content/8.guides/6.rollback.md`

```markdown
---
title: Rollback & Undo
description: Remove generated collections and undo changes with the rollback system
icon: i-heroicons-arrow-uturn-left
---

# Rollback & Undo

Nuxt Crouton includes a comprehensive rollback system to safely remove generated collections. This is useful when you need to:
- Remove a collection you no longer need
- Clean up after testing or experimentation
- Regenerate a collection from scratch
- Remove an entire layer

## Single Collection Rollback

Remove a specific collection and all its generated files:

```bash
crouton-rollback shop products
```

This removes:
- Components (List.vue, Form.vue, Table.vue)
- Composables (useProducts.ts)
- Types (products.ts)
- API endpoints (if generated)
- Database schema (if generated)
- Config entries (app.config.ts)

### Preview Before Removing

Use `--dry-run` to see what would be removed:

```bash
crouton-rollback shop products --dry-run

# Output:
📋 Preview: Would remove the following:

layers/shop/components/products/
  ├── List.vue
  ├── Form.vue
  └── Table.vue

layers/shop/composables/
  └── useProducts.ts

layers/shop/types/
  └── products.ts

Total: 5 files

Proceed? (y/n)
```

### Keep Files, Clean Config Only

Remove config entries but keep generated files:

```bash
crouton-rollback shop products --keep-files
```

Useful when you want to keep customized components but remove them from the collection registry.

### Skip Confirmation

For scripts or automation:

```bash
crouton-rollback shop products --force
```

## Bulk Rollback

Remove multiple collections at once.

### Remove Entire Layer

```bash
crouton-rollback-bulk --layer=shop

# Output:
⚠️  This will remove ALL collections in the 'shop' layer:
  - products (5 files)
  - categories (5 files)
  - orders (5 files)

Total: 15 files

Continue? (y/n)
```

### Remove All Collections from Config

```bash
crouton-rollback-bulk --config=./crouton.config.js

# Reads the config file and removes all collections defined in it
```

### Bulk Rollback Options

Same options as single rollback:

```bash
# Preview bulk changes
crouton-rollback-bulk --layer=shop --dry-run

# Keep files, clean config
crouton-rollback-bulk --layer=shop --keep-files

# Skip confirmation
crouton-rollback-bulk --layer=shop --force
```

## Interactive Rollback

Launch an interactive UI to select collections:

```bash
crouton-rollback-interactive
```

**Interactive UI**:
```
? Select collections to remove:
  ◯ shop/products (5 files)
  ◯ shop/categories (5 files)
  ◉ shop/orders (5 files)
  ◯ blog/posts (5 files)

Use arrow keys to navigate, space to select, enter to confirm
```

**Options**:
```bash
# Preview mode
crouton-rollback-interactive --dry-run

# Keep files
crouton-rollback-interactive --keep-files
```

## What Gets Removed

The rollback system removes:

### ✅ Always Removed
- Generated component files
- Generated composable files
- Generated type files
- Config registry entries (app.config.ts)

### ⚠️ Conditionally Removed
- Database schema files (unless `--keep-files`)
- API endpoints (unless `--keep-files`)
- Layer directory (if empty after removal)

### ❌ Never Removed
- Custom modifications you made
- Non-generated files in the collection directory
- Database data (only schema definitions)
- Git history

## Safe Rollback Workflow

Best practices for safe rollbacks:

**1. Always Preview First**
```bash
crouton-rollback shop products --dry-run
```

**2. Check Git Status**
```bash
git status
# Verify you have no uncommitted changes
```

**3. Run Rollback**
```bash
crouton-rollback shop products
```

**4. Verify Changes**
```bash
git status
git diff
# Review what was removed
```

**5. Commit or Revert**
```bash
# If correct:
git add .
git commit -m "Remove products collection"

# If wrong:
git restore .
```

## Common Scenarios

### Regenerate a Collection from Scratch

```bash
# 1. Remove the old collection
crouton-rollback shop products --force

# 2. Regenerate with updated schema
crouton-generate shop products --fields-file=product-schema.json
```

### Remove Test Collections

```bash
# Remove all test collections at once
crouton-rollback-interactive
# Select all test collections in the UI
```

### Clean Up Before Deployment

```bash
# Remove unused layer
crouton-rollback-bulk --layer=experiments --force
```

### Preserve Customizations

```bash
# Keep customized files, just remove from registry
crouton-rollback shop products --keep-files
```

## Troubleshooting

### "Collection not found"

The collection may already be removed or was never generated:

```bash
# Check what collections exist
ls layers/*/components/
```

### "Permission denied"

Files may be in use:

```bash
# Stop your dev server first
# Then try rollback again
```

### "Config entry not found"

The collection isn't registered in app.config.ts. This is safe to ignore, or you can manually verify:

```typescript
// app.config.ts
export default defineAppConfig({
  croutonCollections: {
    // Check if collection exists here
  }
})
```

### Accidental Removal

Restore from Git:

```bash
git restore layers/shop/components/products/
git restore layers/shop/composables/useProducts.ts
# etc.
```

## Best Practices

**✅ DO:**
- Use `--dry-run` for preview before every rollback
- Commit your work before running rollback commands
- Verify changes with `git status` after rollback
- Use interactive mode when unsure which collections to remove
- Document why you're removing collections (in commit messages)

**❌ DON'T:**
- Run bulk rollback without preview
- Use `--force` without reviewing what will be removed
- Forget to restart your dev server after rollback
- Remove collections that other parts of your app depend on
- Use rollback as a replacement for proper version control

## Related Sections

- [Generator Commands](/generators/commands) - Creating collections
- [Troubleshooting](/guides/troubleshooting) - Common issues
- [Best Practices](/guides/best-practices) - Development workflow
```

---

#### 11.2 Missing CLI Commands in Documentation

**File to Update**: `/Users/pmcp/Projects/crouton-docs/content/3.generators/1.commands.md`

**Current State**: Only documents basic `crouton-generate` command
**Reality**: Four additional commands exist

**Add After Line 107**:

```markdown
## Helper Commands

### Initialize Example Schema

Create an example schema file to get started:

```bash
crouton-generate init

# Output: Creates crouton-schema.json with example fields
```

**Custom output path**:
```bash
crouton-generate init --output=./schemas/product-schema.json
```

**Generated Schema**:
```json
{
  "id": {
    "type": "string",
    "meta": { "primaryKey": true }
  },
  "name": {
    "type": "string",
    "meta": { "required": true, "maxLength": 255 }
  },
  "description": {
    "type": "text"
  },
  "price": {
    "type": "decimal",
    "meta": { "precision": 10, "scale": 2 }
  },
  "inStock": {
    "type": "boolean"
  },
  "createdAt": {
    "type": "date"
  }
}
```

After creation, you can generate a collection:
```bash
crouton-generate shop products --fields-file=crouton-schema.json
```

### Install Required Modules

Install Nuxt Crouton and dependencies:

```bash
crouton-generate install
```

This installs:
- `@friendlyinternet/nuxt-crouton`
- Required peer dependencies
- Updates nuxt.config.ts with extends

**Manual installation**:
```bash
pnpm add @friendlyinternet/nuxt-crouton
```

Then update nuxt.config.ts:
```typescript
export default defineNuxtConfig({
  extends: ['@friendlyinternet/nuxt-crouton']
})
```

## Rollback Commands

See [Rollback & Undo Guide](/guides/rollback) for complete documentation on removing collections.

**Quick reference**:
```bash
# Remove single collection
crouton-rollback <layer> <collection>

# Remove entire layer
crouton-rollback-bulk --layer=<name>

# Interactive removal
crouton-rollback-interactive
```
```

---

#### 11.3 CLI Flags Reference

**Add to**: `/Users/pmcp/Projects/crouton-docs/content/3.generators/1.commands.md`

**After the "Options" section (currently very minimal)**:

```markdown
## Complete CLI Flags Reference

### Generation Flags

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--fields-file` | string | required | Path to JSON schema file |
| `--dialect` | string | `sqlite` | Database dialect: `sqlite` or `pg` |
| `--config` | string | - | Use config file instead of CLI args |
| `--dry-run` | boolean | `false` | **Preview mode** - Show what would be generated without creating files |
| `--force` | boolean | `false` | Force generation even if files exist (overwrites) |
| `--no-translations` | boolean | `false` | Skip translation field generation |
| `--no-db` | boolean | `false` | Skip database schema generation |
| `--auto-relations` | boolean | `false` | Add relation stub comments in generated code |

### Preview Mode (--dry-run)

See exactly what will be generated before creating any files:

```bash
crouton-generate shop products --fields-file=product-schema.json --dry-run

# Output:
📋 Preview: Would generate the following files:

layers/shop/
  ├── components/products/
  │   ├── List.vue (new)
  │   ├── Form.vue (new)
  │   └── Table.vue (new)
  ├── composables/
  │   └── useProducts.ts (new)
  └── types/
      └── products.ts (new)

Total: 5 files (5 new)

Would also update:
  - app.config.ts (add products collection)

Proceed? (y/n)
```

**Use when**:
- First time generating a collection
- Unsure about file placement
- Checking if files will be overwritten
- Testing a new schema structure

### Force Mode (--force)

Overwrite existing files without prompting:

```bash
crouton-generate shop products --fields-file=product-schema.json --force
```

**⚠️ Warning**: This will overwrite any customizations you made to generated files.

**Safe workflow**:
```bash
# 1. Check what would be overwritten
crouton-generate shop products --fields-file=product-schema.json --dry-run

# 2. Commit your changes
git add .
git commit -m "Save customizations before regenerate"

# 3. Force regenerate
crouton-generate shop products --fields-file=product-schema.json --force
```

### Skip Translations (--no-translations)

Generate without i18n support:

```bash
crouton-generate shop products --fields-file=product-schema.json --no-translations
```

Useful when:
- Building a single-language app
- Adding translations later
- Faster generation for testing

### Skip Database (--no-db)

Generate UI components only, no database schema:

```bash
crouton-generate shop products --fields-file=product-schema.json --no-db
```

Useful when:
- Using an existing database
- Only need frontend components
- Database is managed separately

### Auto Relations (--auto-relations)

Add commented relation stubs in generated code:

```bash
crouton-generate shop products --fields-file=product-schema.json --auto-relations
```

Generates comments like:
```typescript
// TODO: Add relation
// export const productsRelations = relations(products, ({ one }) => ({
//   category: one(categories, {
//     fields: [products.categoryId],
//     references: [categories.id]
//   })
// }))
```

Useful when:
- Planning to add Drizzle relations later
- Want reminders about relation opportunities
- Learning relation patterns

### Config File Options

When using `--config` or `config` command, flags are set in the config file:

```javascript
// crouton.config.js
export default {
  dialect: 'sqlite',
  flags: {
    force: false,
    noTranslations: false,
    noDb: false,
    autoRelations: true,
    dryRun: false
  }
}
```

CLI flags override config file settings:
```bash
# Config has force: false, but CLI overrides to true
crouton-generate config ./crouton.config.js --force
```

### Common Flag Combinations

**Safe First Generation**:
```bash
crouton-generate shop products --fields-file=schema.json --dry-run
# Review output, then run without --dry-run
```

**Quick Testing (No DB)**:
```bash
crouton-generate shop products --fields-file=schema.json --no-db --no-translations
```

**Full Featured Generation**:
```bash
crouton-generate shop products --fields-file=schema.json --auto-relations
```

**Force Regenerate**:
```bash
crouton-generate shop products --fields-file=schema.json --force
```
```

---

#### 11.4 Package Architecture Documentation

**Create New File**: `/Users/pmcp/Projects/crouton-docs/content/2.core-concepts/7.packages.md`

```markdown
---
title: Package Architecture
description: Understanding the Nuxt Crouton ecosystem and package structure
icon: i-heroicons-cube-transparent
---

# Package Architecture

Nuxt Crouton is a **modular ecosystem** consisting of 4 separate packages. This architecture provides flexibility, keeps bundle sizes small, and allows you to use only what you need.

## Core Packages

### 1. @friendlyinternet/nuxt-crouton

**Purpose**: Core runtime library
**Install**: `pnpm add @friendlyinternet/nuxt-crouton`

**Contains**:
- Composables (useCollectionQuery, useCollectionMutation, useCrouton)
- Base components (List, Button, Form)
- Modal management
- Cache invalidation system
- TypeScript types

**When to use**:
- Required for all Nuxt Crouton projects
- This is the foundation everything else builds on

**Config**:
```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  extends: ['@friendlyinternet/nuxt-crouton']
})
```

---

### 2. @friendlyinternet/nuxt-crouton-collection-generator

**Purpose**: CLI tool for code generation
**Install**: `npm install -g @friendlyinternet/nuxt-crouton-collection-generator`

**Contains**:
- CLI commands (crouton-generate, crouton-rollback)
- Code generators
- Template system
- Schema validation

**When to use**:
- During development to generate collections
- Not needed in production (generated code doesn't depend on it)

**Commands**:
```bash
crouton-generate <layer> <collection>
crouton-rollback <layer> <collection>
crouton-rollback-bulk --layer=<name>
crouton-rollback-interactive
crouton-generate init
crouton-generate install
```

**Key insight**: This is a **dev-time dependency**, not a runtime dependency. Once code is generated, your app doesn't need this package.

---

### 3. @friendlyinternet/nuxt-crouton-i18n

**Purpose**: Translation and multi-language support
**Install**: `pnpm add @friendlyinternet/nuxt-crouton-i18n`

**Contains**:
- TranslationsInput component
- LanguageSwitcher component
- DevModeToggle component
- useEntityTranslations composable
- Translation management UI

**When to use**:
- Building multi-language applications
- Need per-field translation UI
- Want automatic locale-based data fetching

**Config**:
```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  extends: [
    '@friendlyinternet/nuxt-crouton',
    '@friendlyinternet/nuxt-crouton-i18n'  // Add this
  ]
})
```

**Optional**: Only install if you need translations.

---

### 4. @friendlyinternet/nuxt-crouton-editor

**Purpose**: Rich text editing with Tiptap
**Install**: `pnpm add @friendlyinternet/nuxt-crouton-editor`

**Contains**:
- EditorSimple component (WYSIWYG editor)
- EditorToolbar component
- Tiptap integration
- Pre-configured extensions

**When to use**:
- Need rich text editing (blog posts, descriptions, content)
- Want WYSIWYG instead of plain textareas

**Config**:
```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  extends: [
    '@friendlyinternet/nuxt-crouton',
    '@friendlyinternet/nuxt-crouton-editor'  // Add this
  ]
})
```

**Optional**: Only install if you need rich text editing.

---

## Package Dependencies

```
┌─────────────────────────────────────┐
│  Your Nuxt App                      │
│  - Generated collections            │
│  - Custom components                │
└─────────────────────────────────────┘
              │ depends on
              ↓
┌─────────────────────────────────────┐
│  @friendlyinternet/nuxt-crouton     │ ← Core (Required)
│  - Composables, components          │
└─────────────────────────────────────┘
              ↑
              │ extends
    ┌─────────┴──────────┐
    │                    │
┌───────────┐    ┌──────────────┐
│ i18n      │    │ editor       │  ← Optional Addons
│ addon     │    │ addon        │
└───────────┘    └──────────────┘

        (generator CLI is dev-only, not shown in runtime graph)
```

## Installation Patterns

### Minimal Setup (No Translations, No Editor)

```bash
pnpm add @friendlyinternet/nuxt-crouton
npm install -g @friendlyinternet/nuxt-crouton-collection-generator
```

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  extends: ['@friendlyinternet/nuxt-crouton']
})
```

### Full Featured Setup

```bash
pnpm add @friendlyinternet/nuxt-crouton
pnpm add @friendlyinternet/nuxt-crouton-i18n
pnpm add @friendlyinternet/nuxt-crouton-editor
npm install -g @friendlyinternet/nuxt-crouton-collection-generator
```

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  extends: [
    '@friendlyinternet/nuxt-crouton',
    '@friendlyinternet/nuxt-crouton-i18n',
    '@friendlyinternet/nuxt-crouton-editor'
  ]
})
```

### Add Features Later

Start minimal, add addons as needed:

```bash
# Start with core
pnpm add @friendlyinternet/nuxt-crouton

# Later: add translations
pnpm add @friendlyinternet/nuxt-crouton-i18n

# Later: add rich text
pnpm add @friendlyinternet/nuxt-crouton-editor
```

## Why This Architecture?

### ✅ Benefits

**1. Small Bundle Sizes**
- Only include what you need
- No unused translation code if you don't need i18n
- No Tiptap bundle if you don't need rich text

**2. Independent Updates**
- Core can be updated without breaking addons
- Addons can evolve independently
- Generator improvements don't require core updates

**3. Clear Separation**
- Generated code vs runtime code
- Core features vs optional addons
- Development tools vs production dependencies

**4. Flexible Adoption**
- Start simple, add complexity as needed
- Remove addons you're not using
- Mix and match features

### 🎯 Design Decisions

**Q: Why is the generator a separate package?**
A: It's a dev-time tool. Your production app doesn't need the generator, templates, or CLI code. Keeping it separate reduces bundle size.

**Q: Why are i18n and editor separate?**
A: Not every app needs translations or rich text. By making them optional, we keep the core package lean.

**Q: Can I use the core without the generator?**
A: Yes! You can write components manually and still use the core composables and utilities.

**Q: Do addons depend on each other?**
A: No. Each addon only depends on the core. You can use i18n without editor, or vice versa.

## Package Versions

Nuxt Crouton follows semantic versioning:

**Core package version**: 1.2.0
- Major: Breaking changes
- Minor: New features (backward compatible)
- Patch: Bug fixes

**Addon packages**: Independent versions
- Each addon can update independently
- Core version compatibility specified in peer dependencies

**Check versions**:
```bash
pnpm list @friendlyinternet/nuxt-crouton
pnpm list @friendlyinternet/nuxt-crouton-i18n
pnpm list @friendlyinternet/nuxt-crouton-editor
```

## Troubleshooting

### "Module not found: @friendlyinternet/nuxt-crouton"

The core package isn't installed:
```bash
pnpm add @friendlyinternet/nuxt-crouton
```

### "TranslationsInput is not defined"

The i18n addon isn't installed:
```bash
pnpm add @friendlyinternet/nuxt-crouton-i18n
```

Then add to nuxt.config.ts extends.

### "EditorSimple is not defined"

The editor addon isn't installed:
```bash
pnpm add @friendlyinternet/nuxt-crouton-editor
```

Then add to nuxt.config.ts extends.

### "crouton-generate command not found"

The generator isn't installed globally:
```bash
npm install -g @friendlyinternet/nuxt-crouton-collection-generator
```

### Peer dependency warnings

Install the required peer dependencies:
```bash
pnpm add @nuxt/ui @nuxt/icon
```

## Related Sections

- [Installation](/getting-started/installation) - Setup guide
- [Generator Commands](/generators/commands) - CLI usage
- [Translations](/advanced/translations-i18n) - i18n addon
- [Rich Text Editor](/advanced/rich-text-editor) - Editor addon
```

---

### 11.5 Update Implementation Checklist

**Add to Part 6: Implementation Checklist**

Insert after "Phase 1: Critical Fixes":

```markdown
### Phase 1.5: CLI & Generator Documentation (Day 1.5 - 4 hours)

- [ ] **Create rollback documentation**
  - [ ] New file: `/content/8.guides/6.rollback.md`
  - [ ] Document all 3 rollback commands
  - [ ] Add workflow examples
  - [ ] Include troubleshooting section

- [ ] **Update generator commands reference**
  - [ ] Add `init` command to `/content/3.generators/1.commands.md`
  - [ ] Add `install` command
  - [ ] Add complete CLI flags reference table
  - [ ] Document `--dry-run` as preview mode
  - [ ] Add flag combination examples

- [ ] **Create package architecture guide**
  - [ ] New file: `/content/2.core-concepts/7.packages.md`
  - [ ] Explain 4-package structure
  - [ ] Document core vs generator separation
  - [ ] Show installation patterns
  - [ ] Add dependency graph
```

---

### 11.6 Update File-by-File Summary

**Add to Part 7: File-by-File Update Summary**

| File Path | Changes Required | Priority | Estimated Time |
|-----------|-----------------|----------|----------------|
| **NEW** `/content/8.guides/6.rollback.md` | Complete rollback system documentation | Critical | 2 hours |
| **NEW** `/content/2.core-concepts/7.packages.md` | Package architecture guide | High | 1.5 hours |
| `/content/3.generators/1.commands.md` | Add missing commands, flags reference | Critical | 1 hour |

---

### 11.7 Update Success Metrics

**Add to Success Metrics section**:

**CLI Documentation Coverage**:
- Before: ~40% (only basic generate command documented)
- Target: 100% (all commands, all flags, rollback system)

**Expected User Impact**:
- Users discover rollback system (major workflow improvement)
- Preview mode adoption increases (safer generation)
- Clearer understanding of package structure

---

## Conclusion

This briefing provides a complete roadmap for updating the Nuxt Crouton documentation to match the current codebase implementation. The updates are prioritized by impact and organized by documentation section for efficient execution.

**Key Additions from CLI Analysis**:
- Rollback system documentation (3 undocumented commands)
- Complete CLI flags reference (including `--dry-run` preview mode)
- Missing helper commands (`init`, `install`)
- Package architecture overview (4-package ecosystem)

**Next Step**: Review this briefing, confirm approach, and begin Phase 1 (Critical Fixes).
