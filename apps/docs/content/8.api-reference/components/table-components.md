---
title: Table Components
description: Data table components with sorting, filtering, and pagination
icon: i-heroicons-table-cells
---

## CroutonTable

A powerful data table component with sorting, filtering, pagination, and row selection. Used internally by CroutonCollection for table layout mode.

::callout{icon="i-heroicons-information-circle" color="blue"}
**Note**: CroutonTable is typically used through CroutonCollection's `layout="table"` prop. Use this component directly only when you need fine-grained control over table behavior.
::

### Props

```typescript
interface TableProps {
  // Required props
  columns: TableColumn[]                     // Column definitions
  rows: any[]                               // Data rows to display
  collection: string                        // Collection name for CRUD operations

  // Optional props
  serverPagination?: boolean                // Enable server-side pagination (default: false)
  paginationData?: PaginationData | null    // Pagination metadata (default: null)
  refreshFn?: () => Promise<void>           // Refresh function for server pagination
  sortable?: boolean | SortableOptions      // Enable drag-and-drop row reordering (default: false)
  hideDefaultColumns?: {                    // Hide automatically-added columns
    createdAt?: boolean
    updatedAt?: boolean
    createdBy?: boolean
    updatedBy?: boolean
    actions?: boolean
  }
}

// Sortable Options
interface SortableOptions {
  handle?: boolean     // Show drag handle column (default: true)
  animation?: number   // SortableJS animation duration in ms (default: 150)
  disabled?: boolean   // Temporarily disable drag-and-drop (default: false)
}

// Column Definition
interface TableColumn {
  id?: string
  accessorKey?: string                      // Field key in data
  header: string | ((props: any) => any)   // Column header text or component
  cell?: (props: any) => any               // Custom cell renderer
  sortable?: boolean                        // Enable sorting (default: false)
  enableSorting?: boolean                   // Alternative sorting flag
  enableHiding?: boolean                    // Allow hiding column
}

// Pagination Data
interface PaginationData {
  currentPage: number
  pageSize: number
  totalItems: number
  totalPages?: number
  sortBy?: string
  sortDirection?: 'asc' | 'desc'
}
```

### Props Details

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `columns` | `TableColumn[]` | *required* | Column definitions for table headers and cells |
| `rows` | `any[]` | *required* | Array of data objects to display |
| `collection` | `string` | *required* | Collection name (used for CRUD modal actions) |
| `serverPagination` | `boolean` | `false` | Use server-side pagination instead of client-side |
| `paginationData` | `PaginationData \| null` | `null` | Pagination metadata (required for server pagination) |
| `refreshFn` | `() => Promise<void>` | `undefined` | Function to refresh data (required for server pagination) |
| `hideDefaultColumns` | `object` | `{}` | Control visibility of auto-generated columns |

### Slots

#### `header` (Pass-through)

Customize the entire header section:

```vue
<template #header>
  <CroutonTableHeader
    :collection="collection"
    :create-button="true"
  />
</template>
```

#### Dynamic Cell Slots

All slots are passed through to Nuxt UI's UTable for custom cell rendering:

```vue
<template #location-cell="{ row }">
  <CroutonItemCardMini
    :id="row.original.location"
    collection="locations"
  />
</template>

<template #status-cell="{ row }">
  <UBadge
    :color="row.original.status === 'active' ? 'green' : 'gray'"
  >
    {{ row.original.status }}
  </UBadge>
</template>
```

#### Pre-defined Column Slots

CroutonTable provides default renderers for common columns (can be hidden via `hideDefaultColumns`):

- **`createdBy-cell`** - Shows user avatar and name (via CroutonUsersCardMini)
- **`createdAt-cell`** - Formatted date/time
- **`updatedBy-cell`** - Shows user avatar and name
- **`updatedAt-cell`** - Formatted date/time
- **`actions-cell`** - Edit and delete buttons (via CroutonItemButtonsMini)

### Basic Usage

::callout{type="tip" icon="i-heroicons-book-open"}
**Query Examples**: For complete `useCollectionQuery` patterns, see [Querying Data](/fundamentals/querying).
::

```vue
<template>
  <CroutonTable
    :collection="collection"
    :columns="columns"
    :rows="users"
  >
    <template #header>
      <CroutonTableHeader
        :collection="collection"
        :create-button="true"
      />
    </template>
  </CroutonTable>
</template>

<script setup lang="ts">
const { items: users } = await useCollectionQuery('users')

const columns = [
  { accessorKey: 'name', header: 'Name', sortable: true },
  { accessorKey: 'email', header: 'Email', sortable: true },
  { accessorKey: 'role', header: 'Role' }
]
</script>
```

### Features

#### Sorting

Client-side and server-side sorting on sortable columns:

```vue
<script setup lang="ts">
const columns = [
  { accessorKey: 'name', header: 'Name', sortable: true },
  { accessorKey: 'createdAt', header: 'Created', sortable: true },
  { accessorKey: 'email', header: 'Email' }  // Not sortable
]
</script>

<template>
  <CroutonTable
    collection="users"
    :columns="columns"
    :rows="users"
  />
</template>
```

**Behavior:**
- Click column header to sort
- Click again to reverse direction
- Default sort: `createdAt` descending
- Server pagination: triggers API call with `sortBy` and `sortDirection`

#### Search and Filtering

Built-in search bar with debounced input (300ms):

```vue
<template>
  <CroutonTable
    collection="bookings"
    :columns="columns"
    :rows="bookings"
  >
    <template #header>
      <CroutonTableHeader
        :collection="collection"
        :create-button="true"
      />
      <!-- Search component automatically included -->
    </template>
  </CroutonTable>
</template>
```

**Search behavior:**
- Case-insensitive string matching
- Searches across all visible columns
- Filters rows in real-time
- Resets to page 1 on new search

#### Pagination

**Client-side pagination** (default):

```vue
<template>
  <CroutonTable
    collection="products"
    :columns="columns"
    :rows="allProducts"
  />
</template>
```

**Server-side pagination**:

```vue
<template>
  <CroutonTable
    collection="users"
    :columns="columns"
    :rows="users"
    server-pagination
    :pagination-data="paginationData"
    :refresh-fn="refresh"
  />
</template>

<script setup lang="ts">
const page = ref(1)
const pageSize = ref(10)

const { data: response, refresh } = await useFetch('/api/users', {
  query: { page, pageSize }
})

const users = computed(() => response.value?.items || [])
const paginationData = computed(() => ({
  currentPage: response.value?.page || 1,
  pageSize: response.value?.pageSize || 10,
  totalItems: response.value?.total || 0,
  totalPages: Math.ceil((response.value?.total || 0) / pageSize.value)
}))
</script>
```

**Page sizes**: 5, 10, 20, 30, 40

#### Row Selection

Select rows with checkboxes for bulk operations:

```vue
<template>
  <CroutonTable
    collection="users"
    :columns="columns"
    :rows="users"
  >
    <template #header>
      <div class="flex items-center justify-between p-4">
        <CroutonTableHeader :collection="collection" />
        <UButton
          v-if="selectedRows.length > 0"
          color="red"
          @click="handleBulkDelete"
        >
          Delete {{ selectedRows.length }} items
        </UButton>
      </div>
    </template>
  </CroutonTable>
</template>

<script setup lang="ts">
const selectedRows = ref([])

const handleBulkDelete = async () => {
  const ids = selectedRows.value.map(row => row.id)
  // Perform bulk delete
}
</script>
```

**Features:**
- Select individual rows
- Select all rows (header checkbox)
- Selected count badge
- Bulk delete button in TableActions

#### Column Visibility

Toggle column visibility via dropdown menu:

```vue
<template>
  <CroutonTable
    collection="bookings"
    :columns="columns"
    :rows="bookings"
  >
    <template #header>
      <CroutonTableHeader :collection="collection" />
      <!-- Column visibility dropdown in TableActions -->
    </template>
  </CroutonTable>
</template>
```

**Default hidden:** `id` column

**Toggle location:** TableActions component (eye icon dropdown)

### Hide Default Columns

Control which auto-generated columns appear:

```vue
<template>
  <CroutonTable
    collection="products"
    :columns="columns"
    :rows="products"
    :hide-default-columns="{
      createdAt: true,
      updatedAt: true,
      createdBy: true,
      updatedBy: true,
      actions: false  // Keep actions column
    }"
  />
</template>
```

### Custom Cell Rendering

Use slots for rich cell content:

```vue
<template>
  <CroutonTable
    collection="bookings"
    :columns="columns"
    :rows="bookings"
  >
    <!-- Related entity -->
    <template #location-cell="{ row }">
      <CroutonItemCardMini
        :id="row.original.location"
        collection="locations"
      />
    </template>

    <!-- Date formatting -->
    <template #date-cell="{ row }">
      <CroutonDate :date="row.original.date" format="long" />
    </template>

    <!-- Status badge -->
    <template #status-cell="{ row }">
      <UBadge
        :color="row.original.status === 'confirmed' ? 'green' : 'yellow'"
      >
        {{ row.original.status }}
      </UBadge>
    </template>

    <!-- Avatar group -->
    <template #attendees-cell="{ row }">
      <UAvatarGroup :max="3">
        <UAvatar
          v-for="attendee in row.original.attendees"
          :key="attendee.id"
          :alt="attendee.name"
          :src="attendee.avatar"
          size="xs"
        />
      </UAvatarGroup>
    </template>
  </CroutonTable>
</template>
```

### Loading States

Automatic loading overlay during server pagination:

```vue
<template>
  <CroutonTable
    collection="users"
    :columns="columns"
    :rows="users"
    server-pagination
    :pagination-data="paginationData"
    :refresh-fn="refresh"
  />
  <!-- Loading overlay appears automatically during refresh -->
</template>
```

**Loading behavior:**
- Semi-transparent overlay
- Spinner icon
- Table fades to 50% opacity
- Triggered on page change, sort, or refresh

### Usage Examples

#### Basic Table with Pagination

```vue
<template>
  <CroutonTable
    collection="bookings"
    :columns="columns"
    :rows="bookings"
    server-pagination
    :pagination-data="paginationData"
    :refresh-fn="refresh"
  />
</template>

<script setup lang="ts">
const { items: bookings, refresh } = await useCollectionQuery('bookings')

const paginationData = computed(() => ({
  currentPage: 1,
  pageSize: 20,
  totalItems: bookings.value.length,
  totalPages: Math.ceil(bookings.value.length / 20)
}))

const columns = [
  { accessorKey: 'name', header: 'Name', sortable: true },
  { accessorKey: 'date', header: 'Date', sortable: true },
  { accessorKey: 'status', header: 'Status' }
]
</script>
```

#### Custom Header with Actions

```vue
<template>
  <CroutonTable collection="bookings">
    <template #header>
      <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900">
        <h2 class="text-lg font-semibold">Bookings</h2>
        <div class="flex items-center gap-4">
          <UButton
            @click="open('create', 'bookings')"
            icon="i-heroicons-plus"
            color="primary"
          >
            New Booking
          </UButton>
          <CroutonTableSearch />
        </div>
      </div>
    </template>
  </CroutonTable>
</template>

<script setup lang="ts">
const { open } = useCrouton()
</script>
```

#### Custom Cell Renderers

```vue
<template>
  <CroutonTable collection="bookings">
    <!-- Reference item with CardMini -->
    <template #location-cell="{ row }">
      <CroutonItemCardMini
        :id="row.original.location"
        collection="locations"
      />
    </template>

    <!-- Formatted date -->
    <template #date-cell="{ row }">
      <CroutonDate :date="row.original.date" format="medium" />
    </template>

    <!-- Status badge with color -->
    <template #status-cell="{ row }">
      <UBadge
        :color="getStatusColor(row.original.status)"
        variant="subtle"
      >
        {{ row.original.status }}
      </UBadge>
    </template>
  </CroutonTable>
</template>

<script setup lang="ts">
const getStatusColor = (status: string) => {
  const colors = {
    confirmed: 'green',
    pending: 'yellow',
    cancelled: 'red'
  }
  return colors[status] || 'gray'
}
</script>
```

### Sub-Components

CroutonTable uses several sub-components that can be customized:

- **CroutonTableHeader** - Header with title and create button
- **CroutonTableSearch** - Search input with debouncing
- **CroutonTablePagination** - Pagination controls
- **CroutonTableActions** - Bulk actions and column visibility
- **CroutonItemButtonsMini** - Edit/delete buttons for rows

See [Table Components](#table-components) for detailed documentation.

### Composables Used

CroutonTable leverages these composables internally:

- **useTableData** - Data filtering, searching, pagination logic
- **useTableColumns** - Column management with default columns
- **useCrouton** - Modal/form state management
- **useT** - Translation/i18n support

See [Composables Reference](/api-reference/composables) for details.

### Troubleshooting

#### Sorting Not Working

If column sorting doesn't respond:

1. **Check `sortable` prop**: Must be `true` on column definition
2. **Server pagination**: Ensure `refreshFn` triggers API call with sort params
3. **Column key**: Verify `accessorKey` matches data field name

#### Search Not Filtering

If search doesn't filter results:

1. **Check data structure**: Search works on string fields only
2. **Server pagination**: Implement search on backend, not client-side
3. **Case sensitivity**: Search is case-insensitive by default

#### Pagination Not Updating

If pagination controls don't work:

1. **Server pagination**: Must provide `paginationData` and `refreshFn`
2. **Total items**: Ensure `totalItems` in paginationData is correct
3. **Page change**: Verify `refreshFn` is called on page change

---


---

## Table Components

These four components work together to provide a complete table interface experience. They are designed to be used within `CroutonTable` or custom table layouts.

### TableHeader

Dashboard navbar header with optional create button functionality for collection tables. Displays the collection title and allows users to trigger the creation of new items.

#### Props

```typescript
interface TableHeaderProps {
  title?: string          // Display title for the header (default: '')
  collection?: string     // Collection name for routing/actions (default: '')
  createButton?: boolean  // Show/hide create button (default: false)
}
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | `''` | Title text displayed in the left section of the navbar |
| `collection` | `string` | `''` | Collection identifier used for formatting and routing (e.g., 'users', 'articles') |
| `createButton` | `boolean` | `false` | Controls visibility of the "Create" button in the right section |

#### Slots

**`#extraButtons`**

Located in the right section, before the create button. Allows injection of additional action buttons.

```vue
<TableHeader collection="users" :create-button="true">
  <template #extraButtons>
    <UButton icon="i-lucide-filter">Filter</UButton>
    <UButton icon="i-lucide-download">Export</UButton>
  </template>
</TableHeader>
```

#### Features

**Automatic Collection Name Formatting**
Uses `useFormatCollections().collectionWithCapitalSingular()` to convert collection names (e.g., "articles" → "Article")

**Responsive Create Button Label**
Shows full label on medium+ screens, abbreviated on mobile:
- Mobile: "Create"
- Desktop: "Create [Collection Name]" (e.g., "Create Article")

**Integrated Modal Triggering**
Calls `useCrouton().open('create', collection)` to open create modal

#### Basic Usage

```vue
<template>
  <UDashboardPanel>
    <template #header>
      <TableHeader
        :collection="collection"
        :create-button="true"
        title="User Management"
      />
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
const collection = 'users'
</script>
```

#### With Extra Buttons

```vue
<template>
  <TableHeader
    collection="articles"
    :create-button="true"
  >
    <template #extraButtons>
      <UButton
        icon="i-lucide-filter"
        color="gray"
        variant="ghost"
        @click="openFilters"
      >
        Filter
      </UButton>
      <UButton
        icon="i-lucide-download"
        color="gray"
        variant="ghost"
        @click="exportData"
      >
        Export
      </UButton>
    </template>
  </TableHeader>
</template>

<script setup lang="ts">
const openFilters = () => {
  // Open filter modal
}

const exportData = () => {
  // Export table data
}
</script>
```

#### Integration with CroutonTable

TableHeader is automatically used when the `create` prop is set on `CroutonTable`:

```vue
<template>
  <CroutonTable
    :collection="collection"
    :rows="rows"
    :columns="columns"
    :create="true"  <!-- TableHeader with create button -->
  />
</template>
```

---

### TableSearch

Debounced search input component for filtering table data. Implements best practices for search UX by preventing excessive API calls during typing.

#### Props

```typescript
interface TableSearchProps {
  modelValue: string      // Current search value (required)
  placeholder?: string    // Input placeholder text (default: 'Search...')
  debounceMs?: number    // Debounce delay in milliseconds (default: 300)
}
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | `string` | *required* | Two-way bound search value (v-model) |
| `placeholder` | `string` | `'Search...'` | Placeholder text shown in empty input |
| `debounceMs` | `number` | `300` | Milliseconds to wait before emitting search value |

#### Events

```typescript
emit('update:modelValue', value: string)  // Emitted after debounce period
```

| Event | Payload | Description |
|-------|---------|-------------|
| `update:modelValue` | `string` | Emitted when user stops typing (after debounce delay). Enables `v-model` usage. |

#### Features

**Automatic Debouncing**
Uses VueUse's `useDebounceFn` to prevent excessive updates during typing

**v-model Compatible**
Implements Vue 3's v-model pattern with `modelValue` prop and `update:modelValue` emit

**Icon Integration**
Includes a search icon (`i-lucide-search`) for better UX

**Configurable Debounce**
Allows customization of debounce timing per use case (default 300ms is optimal for most searches)

**Responsive Width**
Uses `max-w-sm` class for consistent sizing

#### Basic Usage

```vue
<template>
  <div>
    <TableSearch
      v-model="search"
      placeholder="Search users..."
    />
    <CroutonTable
      :rows="filteredRows"
      :columns="columns"
    />
  </div>
</template>

<script setup lang="ts">
const search = ref('')
const { items } = await useCollectionQuery('users')

const filteredRows = computed(() =>
  search.value
    ? items.value.filter(u => u.name.includes(search.value))
    : items.value
)
</script>
```

#### Custom Debounce Timing

```vue
<template>
  <TableSearch
    v-model="search"
    placeholder="Search products..."
    :debounce-ms="500"
  />
</template>

<script setup lang="ts">
const search = ref('')

// With longer debounce for expensive searches
watch(search, async (value) => {
  await $fetch('/api/expensive-search', {
    query: { q: value }
  })
})
</script>
```

#### Integration with CroutonTable

TableSearch is automatically included in `CroutonTable` when search functionality is enabled:

```vue
<template>
  <CroutonTable
    :collection="collection"
    :rows="rows"
    :columns="columns"
    searchable  <!-- Includes TableSearch -->
  />
</template>
```

#### Troubleshooting

**Search not triggering**
- **Problem**: Search updates aren't being detected
- **Solution**: Ensure you're using `v-model` with a reactive ref, not a plain variable

**Too many API calls**
- **Problem**: Search is making too many requests
- **Solution**: Increase `debounceMs` to 500-1000ms for expensive operations

**Search resets on page change**
- **Problem**: Search value is lost when navigating
- **Solution**: Store search in URL query params or global state

---

### TablePagination

Comprehensive pagination controls including page size selector, current page indicator, and page navigation. Displays contextual information about the current data view (e.g., "Showing 1 to 10 of 100 results").

#### Props

```typescript
interface TablePaginationProps {
  page: number            // Current page number (1-indexed) (required)
  pageCount: number       // Items per page (required)
  totalItems: number      // Total number of items across all pages (required)
  loading?: boolean       // Disables controls during loading (default: false)
  pageSizes?: number[]   // Available page size options (default: [5, 10, 20, 30, 40])
}
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `page` | `number` | *required* | Current active page (starts at 1) |
| `pageCount` | `number` | *required* | Number of items shown per page |
| `totalItems` | `number` | *required* | Total count of items in the dataset |
| `loading` | `boolean` | `false` | When true, disables pagination controls |
| `pageSizes` | `number[]` | `[5, 10, 20, 30, 40]` | Array of available page size options for dropdown |

#### Events

```typescript
emit('update:page', value: number)       // Emitted when user changes page
emit('update:pageCount', value: number)  // Emitted when user changes page size
```

| Event | Payload | Description |
|-------|---------|-------------|
| `update:page` | `number` | Emitted when user navigates to different page (clicking page buttons) |
| `update:pageCount` | `number` | Emitted when user selects different page size from dropdown |

#### Features

**Internationalization Support**
Uses `useT()` composable for all displayed text, making it fully translatable

**Smart Range Display**
Automatically calculates and displays "Showing X to Y of Z results" with proper edge case handling:
- Returns 0 when no items exist
- Correctly handles last page with fewer items than page size

**Page Size Selector**
Dropdown for changing items per page (rows per page)

**Accessible Controls**
UPagination component with proper ARIA labels

**Loading State Management**
Disables controls during data fetching to prevent race conditions

**Computed Page Ranges**
Automatically calculates `pageFrom` and `pageTo` based on current page and count

#### Basic Usage

```vue
<template>
  <div>
    <CroutonTable
      :rows="data?.items || []"
      :columns="columns"
    />
    <TablePagination
      :page="page"
      :page-count="pageCount"
      :total-items="data?.pagination?.totalItems || 0"
      :loading="pending"
      @update:page="handlePageChange"
      @update:page-count="handlePageCountChange"
    />
  </div>
</template>

<script setup lang="ts">
const page = ref(1)
const pageCount = ref(10)

const { data, pending, refresh } = await useCollectionQuery({
  collection: 'users',
  pagination: {
    currentPage: page.value,
    pageSize: pageCount.value
  }
})

async function handlePageChange(newPage: number) {
  page.value = newPage
  await refresh()
}

async function handlePageCountChange(newCount: number) {
  pageCount.value = newCount
  page.value = 1 // Reset to first page
  await refresh()
}
</script>
```

#### Custom Page Sizes

```vue
<template>
  <TablePagination
    :page="page"
    :page-count="pageCount"
    :total-items="total"
    :page-sizes="[10, 25, 50, 100]"
    @update:page="page = $event"
    @update:page-count="handlePageCountChange"
  />
</template>

<script setup lang="ts">
const page = ref(1)
const pageCount = ref(10)
const total = ref(100)

function handlePageCountChange(newCount: number) {
  pageCount.value = newCount
  page.value = 1 // Always reset to first page
  // Fetch new data
}
</script>
```

#### With Loading State

```vue
<template>
  <div>
    <CroutonTable
      :rows="rows"
      :columns="columns"
      :loading="loading"
    />
    <TablePagination
      :page="page"
      :page-count="pageCount"
      :total-items="totalItems"
      :loading="loading"
      @update:page="loadPage"
      @update:page-count="loadPageCount"
    />
  </div>
</template>

<script setup lang="ts">
const page = ref(1)
const pageCount = ref(10)
const totalItems = ref(0)
const loading = ref(false)
const rows = ref([])

async function loadPage(newPage: number) {
  loading.value = true
  page.value = newPage
  try {
    const { data } = await $fetch('/api/users', {
      query: { page: newPage, limit: pageCount.value }
    })
    rows.value = data.items
    totalItems.value = data.total
  } finally {
    loading.value = false
  }
}

async function loadPageCount(newCount: number) {
  pageCount.value = newCount
  await loadPage(1) // Reset to first page
}
</script>
```

#### Integration with CroutonTable

TablePagination is automatically used in `CroutonTable` when pagination is enabled:

```vue
<template>
  <CroutonTable
    :collection="collection"
    :rows="rows"
    :columns="columns"
    :server-pagination="true"
    :pagination-data="paginationData"
  />
</template>
```

#### Troubleshooting

**Pagination controls disabled**
- **Problem**: Buttons are grayed out and unclickable
- **Solution**: Check if `loading` prop is set to `true`

**Wrong page range displayed**
- **Problem**: "Showing 1 to 10 of 0 results" even though items exist
- **Solution**: Ensure `totalItems` prop reflects the actual total count, not just current page items

**Page reset doesn't work**
- **Problem**: Changing page size doesn't reset to page 1
- **Solution**: Manually set `page.value = 1` in the `@update:page-count` handler

**Page count out of sync**
- **Problem**: Can navigate beyond the last page
- **Solution**: Recalculate total pages: `Math.ceil(totalItems / pageCount)`

---

### TableActions

Provides batch action controls for table rows, including delete functionality and column visibility management. Implements a standard "bulk actions toolbar" pattern common in data tables.

#### Props

```typescript
interface TableActionsProps {
  selectedRows: any[]                    // Array of selected row objects (required)
  collection: string                     // Collection name for routing (required)
  table?: any                           // Table API instance from UTable (optional)
  onDelete?: (ids: string[]) => void   // Custom delete handler (optional)
  onColumnVisibilityChange?: (column: string, visible: boolean) => void  // Optional
}
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `selectedRows` | `any[]` | *required* | Array of selected row objects (from table selection) |
| `collection` | `string` | *required* | Collection identifier for delete operations |
| `table` | `any` | `undefined` | TanStack Table API instance for column management |
| `onDelete` | `Function` | `undefined` | Custom delete handler. If not provided, uses `useCrouton().open()` |
| `onColumnVisibilityChange` | `Function` | `undefined` | Custom handler for column visibility changes |

#### Events

```typescript
emit('delete', ids: string[])                                     // Emitted when delete is triggered
emit('update:columnVisibility', column: string, visible: boolean) // Emitted when column visibility changes
```

| Event | Payload | Description |
|-------|---------|-------------|
| `delete` | `string[]` | Emitted with array of IDs when delete button is clicked |
| `update:columnVisibility` | `column: string, visible: boolean` | Emitted when user toggles column visibility in dropdown |

#### Features

**Dynamic Delete Button State**
- Shows count of selected items
- Changes color from neutral to error when items are selected
- Disabled when no rows selected
- Pluralizes "item/items" correctly

**Flexible Delete Handling**
- If `onDelete` prop provided: uses custom handler
- If not provided: opens Crouton delete modal via `useCrouton().open('delete', ...)`

**Column Visibility Management**
- Dropdown menu showing all hideable columns
- Checkbox toggles for each column
- Uses TanStack Table API for column management
- Only shows columns with `getCanHide()` returning true

**Smart Column Formatting**
Uses `upperFirst()` from scule to format column IDs to display names (e.g., 'createdAt' → 'CreatedAt')

**Internationalization**
Uses `useT()` for button labels

#### Basic Usage

```vue
<template>
  <div>
    <div class="flex items-center justify-between gap-3">
      <TableSearch v-model="search" />
      <TableActions
        :selected-rows="selectedRows"
        collection="users"
        :table="tableRef"
        @delete="handleDelete"
      />
    </div>
    <CroutonTable
      v-model:row-selection="selectedRows"
      ref="tableRef"
      :rows="rows"
      :columns="columns"
      selection
    />
  </div>
</template>

<script setup lang="ts">
const selectedRows = ref([])
const tableRef = ref()

async function handleDelete(ids: string[]) {
  console.log('Deleted:', ids)
  // Refresh data
  await refresh()
}
</script>
```

#### Custom Delete Handler

```vue
<template>
  <TableActions
    :selected-rows="selectedRows"
    collection="users"
    :on-delete="customDelete"
    @delete="refreshTable"
  />
</template>

<script setup lang="ts">
const selectedRows = ref([])

async function customDelete(ids: string[]) {
  const confirmed = await showConfirmation()
  if (!confirmed) return

  await $fetch('/api/bulk-delete', {
    method: 'DELETE',
    body: { ids }
  })

  // Show success notification
  toast.add({
    title: 'Success',
    description: `Deleted ${ids.length} items`
  })
}

async function refreshTable() {
  // Refresh table data
  selectedRows.value = []
}
</script>
```

#### Column Visibility Control

```vue
<template>
  <div>
    <TableActions
      :selected-rows="selectedRows"
      collection="products"
      :table="tableRef"
      @update:column-visibility="handleColumnVisibilityChange"
    />
    <UTable
      ref="tableRef"
      :data="rows"
      :columns="columns"
    />
  </div>
</template>

<script setup lang="ts">
const tableRef = ref()
const selectedRows = ref([])

function handleColumnVisibilityChange(column: string, visible: boolean) {
  console.log(`Column ${column} visibility: ${visible}`)
  // Optionally persist to local storage or API
  localStorage.setItem(`column-${column}`, String(visible))
}
</script>
```

#### With Multiple Actions

```vue
<template>
  <div class="flex items-center gap-2">
    <TableActions
      :selected-rows="selectedRows"
      collection="articles"
      :table="tableRef"
      @delete="handleDelete"
    />

    <!-- Additional custom actions -->
    <UButton
      v-if="selectedRows.length > 0"
      color="blue"
      variant="soft"
      @click="bulkPublish"
    >
      Publish {{ selectedRows.length }} item{{ selectedRows.length > 1 ? 's' : '' }}
    </UButton>

    <UButton
      v-if="selectedRows.length > 0"
      color="gray"
      variant="soft"
      @click="bulkExport"
    >
      Export Selected
    </UButton>
  </div>
</template>

<script setup lang="ts">
const selectedRows = ref([])
const tableRef = ref()

async function handleDelete(ids: string[]) {
  // Handle delete
}

async function bulkPublish() {
  const ids = selectedRows.value.map(row => row.id)
  await $fetch('/api/articles/bulk-publish', {
    method: 'POST',
    body: { ids }
  })
  selectedRows.value = []
}

async function bulkExport() {
  const ids = selectedRows.value.map(row => row.id)
  window.location.href = `/api/export?ids=${ids.join(',')}`
}
</script>
```

#### Integration with CroutonTable

TableActions is automatically used in `CroutonTable` when selection is enabled:

```vue
<template>
  <CroutonTable
    :collection="collection"
    :rows="rows"
    :columns="columns"
    selection  <!-- Enables row selection and TableActions -->
  />
</template>
```

#### Troubleshooting

**Delete button always disabled**
- **Problem**: Button is grayed out even when rows are selected
- **Solution**: Ensure `selectedRows` is a non-empty array

**Column visibility not working**
- **Problem**: Toggling columns doesn't hide/show them
- **Solution**: Ensure `table` prop is passed with the table ref from `UTable`

**Delete confirmation not showing**
- **Problem**: Items are deleted immediately without confirmation
- **Solution**: The component relies on `useCrouton()` for confirmation. Provide a custom `onDelete` handler if you need custom confirmation logic.

**Wrong items being deleted**
- **Problem**: Selected items don't match deleted items
- **Solution**: Ensure all rows have a unique `id` property. The component assumes `row.id` exists.

**Type errors with table prop**
- **Problem**: TypeScript errors about `table` prop being `any`
- **Solution**: This is a known limitation. The component currently uses `any` type. You can safely ignore or cast to proper TanStack Table types.

---


---


---

## CroutonTableActions

Action buttons for table operations: bulk delete and column visibility toggle.

### Props

```typescript
interface TableActionsProps {
  selectedRows: any[]
  collection: string
  table?: any // TanStack Table instance
  onDelete?: (ids: string[]) => void
}
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `selectedRows` | `any[]` | - | Array of selected table rows |
| `collection` | `string` | - | Collection name for delete operation |
| `table` | `any` | - | TanStack Table API instance |
| `onDelete` | `Function` | - | Custom delete handler (optional) |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `delete` | `string[]` | Emitted when delete is triggered with array of IDs |
| `update:columnVisibility` | `column: string, visible: boolean` | Emitted when column visibility changes |

### Features

- **Bulk Delete**: Delete multiple selected rows at once
- **Dynamic Button State**: Delete button color changes when items selected
- **Column Visibility**: Dropdown menu to show/hide columns
- **i18n Support**: Uses translation keys for labels
- **Disabled State**: Delete button disabled when no rows selected
- **Custom Delete Handler**: Override default delete behavior

### Usage

#### Basic Usage

```vue
<template>
  <CroutonTableActions
    :selected-rows="selectedRows"
    :collection="collection"
    :table="tableInstance"
    @delete="handleDelete"
  />
</template>

<script setup lang="ts">
const selectedRows = ref([])
const collection = 'products'
const tableInstance = ref(null)

const handleDelete = (ids: string[]) => {
  console.log('Deleting items:', ids)
}
</script>
```

#### With Custom Delete Handler

```vue
<template>
  <CroutonTableActions
    :selected-rows="selected"
    collection="users"
    :on-delete="customDeleteHandler"
    @delete="afterDelete"
  />
</template>

<script setup lang="ts">
const selected = ref([])

const customDeleteHandler = async (ids: string[]) => {
  // Custom delete logic
  await api.users.deleteBatch(ids)
  toast.success(`Deleted ${ids.length} users`)
}

const afterDelete = (ids: string[]) => {
  // Refresh table or update UI
  refreshTable()
}
</script>
```

#### Column Visibility Control

```vue
<template>
  <CroutonTableActions
    :selected-rows="[]"
    collection="orders"
    :table="table"
    @update:columnVisibility="handleColumnToggle"
  />
</template>

<script setup lang="ts">
import { useVueTable } from '@tanstack/vue-table'

const table = useVueTable({
  // ... table config
})

const handleColumnToggle = (column: string, visible: boolean) => {
  console.log(`Column ${column} visibility: ${visible}`)
}
</script>
```

#### Integration with CroutonTable

```vue
<template>
  <div>
    <CroutonTableActions
      :selected-rows="selectedRows"
      :collection="collection"
      :table="tableRef"
      @delete="refreshData"
    />
    
    <CroutonTable
      v-model:selected-rows="selectedRows"
      :rows="data"
      :columns="columns"
      @table-ready="(t) => tableRef = t"
    />
  </div>
</template>

<script setup lang="ts">
const selectedRows = ref([])
const tableRef = ref(null)
const collection = 'products'
</script>
```

### Delete Button States

| State | Color | Variant | Disabled |
|-------|-------|---------|----------|
| No selection | `neutral` | `subtle` | `true` |
| Items selected | `error` | `subtle` | `false` |

### Column Visibility Menu

The dropdown menu includes:
- All columns where `column.getCanHide()` returns true
- Checkbox for each column
- Label auto-formatted with `upperFirst()` (e.g., "firstName" → "FirstName")
- Click to toggle visibility

```vue
<!-- Column menu structure -->
<UDropdownMenu :items="columnVisibilityItems">
  <UButton
    label="Display"
    color="neutral"
    variant="outline"
    trailing-icon="i-lucide-settings-2"
  />
</UDropdownMenu>
```

::callout{icon="i-heroicons-information-circle" color="blue"}
**Translation Keys**: The component uses `tString('table.display')` for the button label. Ensure your translation system has this key defined.
::

---


---

## CroutonTableCheckbox

Wrapper component for table row selection checkbox with indeterminate support.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | `boolean \| 'indeterminate'` | - | Checkbox state (checked/unchecked/indeterminate) |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update:modelValue` | `boolean \| 'indeterminate'` | Emitted when checkbox state changes |

### Features

- **Indeterminate State**: Supports three-state checkbox (checked/unchecked/indeterminate)
- **UCheckbox Wrapper**: Thin wrapper around Nuxt UI's UCheckbox
- **Type-Safe**: TypeScript support for all three states

### Usage

#### Basic Usage

```vue
<template>
  <CroutonTableCheckbox v-model="selected" />
</template>

<script setup lang="ts">
const selected = ref(false)
</script>
```

#### Indeterminate State

```vue
<template>
  <CroutonTableCheckbox v-model="checkboxState" />
</template>

<script setup lang="ts">
const checkboxState = ref<boolean | 'indeterminate'>('indeterminate')

// State can be:
// - true (checked)
// - false (unchecked)
// - 'indeterminate' (partially checked, shown as dash/minus)
</script>
```

#### Header "Select All" Checkbox

```vue
<template>
  <table>
    <thead>
      <tr>
        <th>
          <CroutonTableCheckbox
            :model-value="headerCheckboxState"
            @update:model-value="handleSelectAll"
          />
        </th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="row in rows" :key="row.id">
        <td>
          <CroutonTableCheckbox v-model="row.selected" />
        </td>
      </tr>
    </tbody>
  </table>
</template>

<script setup lang="ts">
const rows = ref([
  { id: 1, selected: false },
  { id: 2, selected: true },
  { id: 3, selected: false }
])

const headerCheckboxState = computed<boolean | 'indeterminate'>(() => {
  const selectedCount = rows.value.filter(r => r.selected).length
  if (selectedCount === 0) return false
  if (selectedCount === rows.value.length) return true
  return 'indeterminate'
})

const handleSelectAll = (state: boolean | 'indeterminate') => {
  const newState = state === true
  rows.value.forEach(row => row.selected = newState)
}
</script>
```

#### With TanStack Table

```vue
<template>
  <table>
    <thead>
      <tr v-for="headerGroup in table.getHeaderGroups()">
        <th v-for="header in headerGroup.headers">
          <CroutonTableCheckbox
            v-if="header.id === 'select'"
            :model-value="table.getIsAllRowsSelected() ? true : 
                         table.getIsSomeRowsSelected() ? 'indeterminate' : false"
            @update:model-value="table.toggleAllRowsSelected()"
          />
        </th>
      </tr>
    </thead>
  </table>
</template>
```

### State Values

| Value | Visual | Meaning |
|-------|--------|---------|
| `false` | Empty box | Not selected |
| `true` | Checkmark | Selected |
| `'indeterminate'` | Dash/minus | Partially selected |

::callout{icon="i-heroicons-information-circle" color="blue"}
**TanStack Integration**: This component is designed to work seamlessly with TanStack Table's selection state management.
::

---


---

## CroutonTableHeader

Header component for data tables with optional create button.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | `''` | Header title text |
| `collection` | `string` | `''` | Collection name (used for create action) |
| `createButton` | `boolean` | `false` | Show create button |

### Slots

| Slot | Description |
|------|-------------|
| `extraButtons` | Additional buttons in header right area |

### Features

- **Dashboard Navbar**: Built on UDashboardNavbar
- **Create Button**: Opens create modal for collection
- **Responsive Label**: Hides collection name on mobile (< md)
- **Extra Buttons Slot**: Add custom header actions
- **Auto-Formatting**: Formats collection name with capital singular

### Usage

#### Basic Usage

```vue
<template>
  <CroutonTableHeader
    title="All Products"
    collection="products"
    create-button
  />
</template>
```

#### With Extra Buttons

```vue
<template>
  <CroutonTableHeader
    title="User Management"
    collection="users"
    create-button
  >
    <template #extraButtons>
      <UButton
        color="neutral"
        variant="outline"
        icon="i-lucide-download"
        @click="exportUsers"
      >
        Export
      </UButton>
      <UButton
        color="neutral"
        variant="outline"
        icon="i-lucide-filter"
        @click="openFilters"
      >
        Filters
      </UButton>
    </template>
  </CroutonTableHeader>
</template>

<script setup lang="ts">
const exportUsers = () => {
  // Export logic
}

const openFilters = () => {
  // Open filters modal
}
</script>
```

#### Without Create Button

```vue
<template>
  <CroutonTableHeader
    title="System Logs"
    collection="logs"
  />
  <!-- No create button shown -->
</template>
```

#### Complete Table Page Example

```vue
<template>
  <div>
    <CroutonTableHeader
      title="Products"
      collection="products"
      create-button
    >
      <template #extraButtons>
        <UButton
          icon="i-lucide-upload"
          variant="outline"
          @click="importProducts"
        >
          Import
        </UButton>
      </template>
    </CroutonTableHeader>

    <CroutonTable
      :rows="products"
      :columns="columns"
    />
  </div>
</template>

<script setup lang="ts">
const { open } = useCrouton()
const products = ref([])

const importProducts = () => {
  // Import logic
}
</script>
```

### Create Button Behavior

When clicked, the create button:
1. Calls `useCrouton().open('create', collection)`
2. Opens the create modal/form for the specified collection
3. Logs debug info to console (collection name, button state)

### Responsive Design

| Screen Size | Button Label |
|-------------|--------------|
| Mobile (< md) | "Create" |
| Desktop (md+) | "Create {CollectionSingular}" |

Example:
- `collection="products"` → Mobile: "Create", Desktop: "Create Product"
- `collection="users"` → Mobile: "Create", Desktop: "Create User"

::callout{icon="i-heroicons-information-circle" color="blue"}
**Collection Formatting**: Uses `useFormatCollections().collectionWithCapitalSingular()` to format collection names (e.g., "products" → "Product").
::

---


---

## CroutonTablePagination

Pagination controls for tables with page size selector and result summary.

### Props

```typescript
interface TablePaginationProps {
  page: number
  pageCount: number
  totalItems: number
  loading?: boolean
  pageSizes?: number[]
}
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `page` | `number` | - | Current page number (1-indexed) |
| `pageCount` | `number` | - | Items per page |
| `totalItems` | `number` | - | Total number of items across all pages |
| `loading` | `boolean` | `false` | Disable pagination during loading |
| `pageSizes` | `number[]` | `[5, 10, 20, 30, 40]` | Available page size options |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update:page` | `number` | Emitted when page changes |
| `update:pageCount` | `number` | Emitted when page size changes |

### Features

- **Page Navigation**: UPagination component for page selection
- **Page Size Selector**: Dropdown to change items per page
- **Result Summary**: Shows "Showing X to Y of Z results"
- **i18n Support**: Uses translation keys for labels
- **Loading State**: Disables controls when loading
- **Border Top**: Visual separator from table content

### Usage

#### Basic Usage

```vue
<template>
  <CroutonTablePagination
    v-model:page="currentPage"
    v-model:page-count="itemsPerPage"
    :total-items="totalItems"
    :loading="isLoading"
  />
</template>

<script setup lang="ts">
const currentPage = ref(1)
const itemsPerPage = ref(10)
const totalItems = ref(250)
const isLoading = ref(false)

watch([currentPage, itemsPerPage], () => {
  fetchData()
})
</script>
```

#### Custom Page Sizes

```vue
<template>
  <CroutonTablePagination
    v-model:page="page"
    v-model:page-count="pageSize"
    :total-items="total"
    :page-sizes="[10, 25, 50, 100]"
  />
</template>

<script setup lang="ts">
const page = ref(1)
const pageSize = ref(25)
const total = ref(1000)
</script>
```

#### With Table Integration

```vue
<template>
  <div class="space-y-4">
    <CroutonTable
      :rows="paginatedData"
      :columns="columns"
    />
    
    <CroutonTablePagination
      v-model:page="pagination.page"
      v-model:page-count="pagination.pageSize"
      :total-items="data.length"
      :loading="fetching"
    />
  </div>
</template>

<script setup lang="ts">
const data = ref([]) // All data
const pagination = ref({ page: 1, pageSize: 20 })
const fetching = ref(false)

const paginatedData = computed(() => {
  const start = (pagination.value.page - 1) * pagination.value.pageSize
  const end = start + pagination.value.pageSize
  return data.value.slice(start, end)
})

const fetchData = async () => {
  fetching.value = true
  // Fetch data
  fetching.value = false
}
</script>
```

#### Server-Side Pagination

```vue
<template>
  <div>
    <CroutonTable :rows="serverData" :columns="columns" />
    
    <CroutonTablePagination
      v-model:page="serverPage"
      v-model:page-count="serverPageSize"
      :total-items="serverTotal"
      :loading="serverLoading"
    />
  </div>
</template>

<script setup lang="ts">
const serverPage = ref(1)
const serverPageSize = ref(10)
const serverTotal = ref(0)
const serverLoading = ref(false)
const serverData = ref([])

const fetchPage = async () => {
  serverLoading.value = true
  const response = await $fetch('/api/data', {
    params: {
      page: serverPage.value,
      pageSize: serverPageSize.value
    }
  })
  serverData.value = response.data
  serverTotal.value = response.total
  serverLoading.value = false
}

watch([serverPage, serverPageSize], fetchPage, { immediate: true })
</script>
```

### Result Summary Format

The summary displays:
```
Rows per page: [10 ▼]  Showing 11 to 20 of 250 results
```

Calculations:
- `pageFrom`: `(page - 1) * pageCount + 1`
- `pageTo`: `Math.min(page * pageCount, totalItems)`

Example with page=2, pageCount=10, totalItems=95:
- Shows: "Showing **11** to **20** of **95** results"

### Translation Keys

The component uses these translation keys:
- `table.rowsPerPageColon`
- `table.rowsPerPage` (for select label)
- `table.showing`
- `table.to`
- `table.of`
- `table.results`

::callout{icon="i-heroicons-information-circle" color="blue"}
**Sticky Footer**: Use `mt-auto` class on parent container to keep pagination at bottom of available space.
::

---


---

## CroutonTableSearch

Debounced search input for filtering table data.

### Props

```typescript
interface TableSearchProps {
  modelValue: string
  placeholder?: string
  debounceMs?: number
}
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | `string` | - | Search query string (v-model) |
| `placeholder` | `string` | `'Search...'` | Input placeholder text |
| `debounceMs` | `number` | `300` | Debounce delay in milliseconds |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update:modelValue` | `string` | Emitted after debounce when search value changes |

### Features

- **Debounced Input**: Uses VueUse `useDebounceFn` for performance
- **Search Icon**: Built-in magnifying glass icon
- **Max Width**: Constrained to `max-w-sm` (24rem)
- **Configurable Delay**: Adjust debounce timing
- **Empty State**: Emits empty string when cleared

### Usage

#### Basic Usage

```vue
<template>
  <CroutonTableSearch v-model="searchQuery" />
</template>

<script setup lang="ts">
const searchQuery = ref('')

watch(searchQuery, (query) => {
  console.log('Searching for:', query)
  // Fetch filtered data
})
</script>
```

#### Custom Placeholder and Debounce

```vue
<template>
  <CroutonTableSearch
    v-model="query"
    placeholder="Search products..."
    :debounce-ms="500"
  />
</template>

<script setup lang="ts">
const query = ref('')
// Emits after 500ms of no typing
</script>
```

#### Integrated with Table

```vue
<template>
  <div class="space-y-4">
    <div class="flex justify-between">
      <CroutonTableSearch
        v-model="searchQuery"
        placeholder="Search users..."
      />
      <UButton color="primary" @click="createUser">
        Create User
      </UButton>
    </div>

    <CroutonTable
      :rows="filteredUsers"
      :columns="columns"
    />
  </div>
</template>

<script setup lang="ts">
const searchQuery = ref('')
const users = ref([])

const filteredUsers = computed(() => {
  if (!searchQuery.value) return users.value
  
  const query = searchQuery.value.toLowerCase()
  return users.value.filter(user =>
    user.name.toLowerCase().includes(query) ||
    user.email.toLowerCase().includes(query)
  )
})
</script>
```

#### With Loading State

```vue
<template>
  <div class="relative">
    <CroutonTableSearch
      v-model="search"
      placeholder="Type to search..."
    />
    <div
      v-if="searching"
      class="absolute right-2 top-2"
    >
      <UIcon name="i-lucide-loader-2" class="animate-spin" />
    </div>
  </div>
</template>

<script setup lang="ts">
const search = ref('')
const searching = ref(false)

watch(search, async (query) => {
  if (!query) return
  
  searching.value = true
  await fetchSearchResults(query)
  searching.value = false
})
</script>
```

#### Server-Side Search

```vue
<template>
  <CroutonTableSearch
    v-model="serverSearch"
    placeholder="Search..."
    :debounce-ms="400"
  />
</template>

<script setup lang="ts">
const serverSearch = ref('')

watch(serverSearch, async (query) => {
  const { data } = await useFetch('/api/search', {
    params: { q: query }
  })
  // Update results
})
</script>
```

### Debounce Behavior

Without debouncing, every keystroke would trigger a search:
```
User types: "hello"
Without debounce: 5 searches (h, he, hel, hell, hello)
With 300ms debounce: 1 search (hello) - after user stops typing
```

Example debounce values:
- `100ms` - Very responsive, still reduces load significantly
- `300ms` - Default, good balance
- `500ms` - Slower response, fewer API calls
- `1000ms` - Very slow, minimal API calls

::callout{icon="i-heroicons-information-circle" color="blue"}
**Performance**: Debouncing is crucial for server-side searches to avoid excessive API calls. The default 300ms works well for most use cases.
::

---


## Related Resources

- [Table Composables](/api-reference/composables/table-composables) - Table data management
- [Nuxt UI Table](https://ui.nuxt.com/components/table) - Base table component
- [Table Patterns](/patterns/tables) - Table composition patterns
