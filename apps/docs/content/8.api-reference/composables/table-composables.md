---
title: Table Composables
description: Build interactive data tables with sorting, filtering, and pagination
icon: i-heroicons-table-cells
---

::callout{type="tip" icon="i-heroicons-book-open"}
**Working with Tables**: For complete table patterns and component usage, see [Table Patterns](/patterns/tables) and [Table Components API](/api-reference/components/table-components).
::

## useTableColumns

Manages table column configuration with automatic selection column, localized headers, and conditional default columns.

### Type Signature

```typescript
interface UseTableColumnsOptions {
  columns: TableColumn[]
  hideDefaultColumns?: {
    createdAt?: boolean
    updatedAt?: boolean
    createdBy?: boolean
    updatedBy?: boolean
    actions?: boolean
  }
}

function useTableColumns(options: UseTableColumnsOptions): {
  allColumns: ComputedRef<TableColumn[]>
}
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `columns` | `TableColumn[]` | Yes | Array of column definitions for the table |
| `hideDefaultColumns` | `object` | No | Object with boolean flags to hide default columns |
| `hideDefaultColumns.createdAt` | `boolean` | No | Hide 'createdAt' column (default: false) |
| `hideDefaultColumns.updatedAt` | `boolean` | No | Hide 'updatedAt' column (default: false) |
| `hideDefaultColumns.createdBy` | `boolean` | No | Hide 'createdBy' column (default: false) |
| `hideDefaultColumns.updatedBy` | `boolean` | No | Hide 'updatedBy' column (default: false) |
| `hideDefaultColumns.actions` | `boolean` | No | Hide 'actions' column (default: false) |

### Returns

| Property | Type | Description |
|----------|------|-------------|
| `allColumns` | `ComputedRef<TableColumn[]>` | Computed array of all columns including selection column and default columns |

### Return Values Detail

**allColumns**: A computed reactive reference containing:
- **Selection column** (first): CroutonTableCheckbox for row selection with "select all" header
- **Custom columns**: Your provided columns in the order specified
- **Default columns** (appended): createdAt, updatedAt, createdBy, updatedBy, actions (unless hidden)

### Basic Usage

Simple table with all default columns:

```vue
<script setup lang="ts">
import type { TableColumn } from '@crouton/types'

const { allColumns } = useTableColumns({
  columns: [
    {
      accessorKey: 'name',
      id: 'name',
      header: 'Product Name',
      sortable: true
    },
    {
      accessorKey: 'price',
      id: 'price',
      header: 'Price',
      sortable: true
    }
  ]
})
</script>

<template>
  <CroutonTable :columns="allColumns" :rows="products" />
</template>
```

### Hide Specific Default Columns

Remove timestamps and audit columns:

```vue
<script setup lang="ts">
const { allColumns } = useTableColumns({
  columns: [
    {
      accessorKey: 'name',
      id: 'name',
      header: 'Name'
    }
  ],
  hideDefaultColumns: {
    createdAt: true,
    updatedAt: true,
    createdBy: true,
    updatedBy: true
  }
})
</script>
```

### Hide Actions Column

For read-only tables:

```vue
<script setup lang="ts">
const { allColumns } = useTableColumns({
  columns: [
    {
      accessorKey: 'name',
      id: 'name',
      header: 'Name'
    },
    {
      accessorKey: 'email',
      id: 'email',
      header: 'Email'
    }
  ],
  hideDefaultColumns: {
    actions: true
  }
})
</script>
```

### Custom Column Configuration

With complex column definitions:

```vue
<script setup lang="ts">
const { allColumns } = useTableColumns({
  columns: [
    {
      accessorKey: 'name',
      id: 'name',
      header: 'Name',
      sortable: true,
      size: 200
    },
    {
      accessorKey: 'status',
      id: 'status',
      header: 'Status',
      cell: ({ row }: any) => h('span', {
        class: row.original.status === 'active' 
          ? 'text-green-600' 
          : 'text-gray-500'
      }, row.original.status)
    }
  ],
  hideDefaultColumns: {
    createdBy: true,
    updatedBy: true
  }
})
</script>
```

### Integration with useTableData

Combine with useTableData for complete table functionality:

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'

const rows = ref([
  { id: 1, name: 'Item 1', status: 'active' },
  { id: 2, name: 'Item 2', status: 'inactive' }
])
const search = ref('')
const sort = ref({ id: 'name', desc: false })
const page = ref(1)
const pageCount = ref(10)

const { allColumns } = useTableColumns({
  columns: [
    { accessorKey: 'name', id: 'name', header: 'Name', sortable: true },
    { accessorKey: 'status', id: 'status', header: 'Status' }
  ]
})

const { slicedRows, pageTotalToShow } = useTableData({
  rows,
  search,
  sort,
  page,
  pageCount,
  serverPagination: false
})
</script>

<template>
  <CroutonTable 
    :columns="allColumns"
    :rows="slicedRows"
    :total-items="pageTotalToShow"
  />
</template>
```

### Best Practices

**DO:**
- ✅ Use to ensure consistent column structure across tables
- ✅ Hide audit columns for read-only views
- ✅ Define custom columns with proper TypeScript types
- ✅ Use accessorKey for simple data access
- ✅ Provide sortable flag for relevant columns
- ✅ Combine with useTableData for complete solution

**DON'T:**
- ❌ Define selection column manually (it's added automatically)
- ❌ Forget to provide column headers (affects accessibility)
- ❌ Hide all default columns without reason (users expect timestamps)
- ❌ Use complex cell renderers without memoization
- ❌ Mix different table column standards

### Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Selection column missing | Not using CroutonTableCheckbox | useTableColumns handles this automatically |
| Default columns still visible | hideDefaultColumns not working | Verify property names: createdAt, updatedAt, etc. (camelCase) |
| Headers not localized | Translation keys missing | Ensure useT() provides 'table.createdAt', 'table.actions' keys |
| Column order wrong | Columns appended after custom | Define custom columns first, defaults added last |
| Sortable not working | TanStack Table not configured | Ensure parent table component handles sorting |

---


---

## useTableData

Manages table data transformation including search, filtering, sorting, and pagination (both client and server-side).

### Type Signature

```typescript
interface UseTableDataOptions {
  rows: Ref<any[]>
  search: Ref<string>
  sort: Ref<TableSort>
  page: Ref<number>
  pageCount: Ref<number>
  serverPagination: boolean
  paginationData?: PaginationData | null
}

function useTableData(options: UseTableDataOptions): {
  searchedRows: ComputedRef<any[]>
  slicedRows: ComputedRef<any[]>
  pageTotalToShow: ComputedRef<number>
  pageFrom: ComputedRef<number>
  pageTo: ComputedRef<number>
  itemCountFromServer: ComputedRef<number>
}
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `rows` | `Ref<any[]>` | Yes | Reactive array of table rows |
| `search` | `Ref<string>` | Yes | Reactive search query string |
| `sort` | `Ref<TableSort>` | Yes | Reactive sort configuration |
| `page` | `Ref<number>` | Yes | Current page number (1-indexed) |
| `pageCount` | `Ref<number>` | Yes | Items per page |
| `serverPagination` | `boolean` | Yes | Whether pagination happens on server |
| `paginationData` | `PaginationData \| null` | No | Server pagination metadata (totalItems, etc.) |

### Returns

| Property | Type | Description |
|----------|------|-------------|
| `searchedRows` | `ComputedRef<any[]>` | All rows matching search query |
| `slicedRows` | `ComputedRef<any[]>` | Rows for current page after search |
| `pageTotalToShow` | `ComputedRef<number>` | Total count after search filtering |
| `pageFrom` | `ComputedRef<number>` | Index of first item on current page (1-indexed) |
| `pageTo` | `ComputedRef<number>` | Index of last item on current page |
| `itemCountFromServer` | `ComputedRef<number>` | Total items from server (for server pagination) |

### Return Values Detail

**searchedRows**: Filtered rows based on search.value. Searches all object values case-insensitively.

**slicedRows**: 
- Client pagination: searchedRows sliced by page and pageCount
- Server pagination: rows (already paginated from server)

**pageTotalToShow**: 
- Server pagination: itemCountFromServer
- Client pagination with search: searchedRows.length
- Client pagination without search: rows.length

**pageFrom**: Starting index (1-based). Example: page 2 with pageCount 10 = 11

**pageTo**: Ending index (1-based). Clamped to actual total.

**itemCountFromServer**: From paginationData.totalItems or rows.length

### Basic Usage - Client-Side Pagination

Simple local pagination:

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'

const rows = ref([
  { id: 1, name: 'Alice', email: 'alice@example.com' },
  { id: 2, name: 'Bob', email: 'bob@example.com' },
  // ... more rows
])

const search = ref('')
const sort = ref({ id: 'name', desc: false })
const page = ref(1)
const pageCount = ref(10)

const { slicedRows, pageFrom, pageTo, pageTotalToShow } = useTableData({
  rows,
  search,
  sort,
  page,
  pageCount,
  serverPagination: false
})
</script>

<template>
  <div>
    <CroutonTable :rows="slicedRows" />
    <p>Showing {{ pageFrom }} to {{ pageTo }} of {{ pageTotalToShow }}</p>
  </div>
</template>
```

### Server-Side Pagination

Efficient pagination for large datasets:

```vue
<script setup lang="ts">
import { ref } from 'vue'

const rows = ref([])
const search = ref('')
const sort = ref({ id: 'name', desc: false })
const page = ref(1)
const pageCount = ref(10)
const paginationData = ref({ totalItems: 0 })

// Fetch from server when page/search changes
const fetchData = async () => {
  const { data } = await $fetch('/api/items', {
    query: {
      page: page.value,
      pageSize: pageCount.value,
      search: search.value,
      sortBy: sort.value.id,
      sortDesc: sort.value.desc
    }
  })
  rows.value = data.items
  paginationData.value = { totalItems: data.total }
}

const { slicedRows, pageFrom, pageTo, pageTotalToShow } = useTableData({
  rows,
  search,
  sort,
  page,
  pageCount,
  serverPagination: true,
  paginationData: paginationData.value
})

watch([page, search, sort], () => fetchData())
onMounted(() => fetchData())
</script>
```

### Client Search with Pagination

Search within current page results:

```vue
<script setup lang="ts">
const rows = ref([...myData])
const search = ref('')
const page = ref(1)
const pageCount = ref(10)

const { slicedRows, searchedRows, pageTotalToShow } = useTableData({
  rows,
  search,
  sort: ref({ id: 'name', desc: false }),
  page,
  pageCount,
  serverPagination: false
})

// Show filtered count
const resultText = computed(() => {
  return `${pageTotalToShow.value} results (searched across ${rows.value.length} items)`
})
</script>

<template>
  <div>
    <UInput v-model="search" placeholder="Search..." />
    <p class="text-sm text-gray-600">{{ resultText }}</p>
    <CroutonTable :rows="slicedRows" />
  </div>
</template>
```

### Pagination UI

Display pagination controls:

```vue
<script setup lang="ts">
const rows = ref([...myData])
const search = ref('')
const sort = ref({ id: 'name', desc: false })
const page = ref(1)
const pageCount = ref(10)

const { slicedRows, pageFrom, pageTo, pageTotalToShow } = useTableData({
  rows,
  search,
  sort,
  page,
  pageCount,
  serverPagination: false
})

const totalPages = computed(() => Math.ceil(pageTotalToShow.value / pageCount.value))

const nextPage = () => {
  if (page.value < totalPages.value) page.value++
}

const prevPage = () => {
  if (page.value > 1) page.value--
}
</script>

<template>
  <div class="space-y-4">
    <CroutonTable :rows="slicedRows" />
    
    <div class="flex items-center justify-between">
      <p class="text-sm">
        Showing {{ pageFrom }} to {{ pageTo }} of {{ pageTotalToShow }}
      </p>
      <div class="flex gap-2">
        <UButton @click="prevPage" :disabled="page === 1">Previous</UButton>
        <span>Page {{ page }} of {{ totalPages }}</span>
        <UButton @click="nextPage" :disabled="page === totalPages">Next</UButton>
      </div>
    </div>
  </div>
</template>
```

### Best Practices

**DO:**
- ✅ Use server pagination for datasets over 1000 items
- ✅ Debounce search input for server pagination
- ✅ Reset page to 1 when search changes
- ✅ Provide clear result counts to users
- ✅ Handle loading/error states during pagination
- ✅ Memoize computed values with computed()

**DON'T:**
- ❌ Use client pagination for large datasets (performance killer)
- ❌ Search all fields if you can search specific fields on server
- ❌ Forget to update totalItems from server response
- ❌ Mix server and client search (confusing results)
- ❌ Assume search works on nested objects (it searches values)

### Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Page data wrong after search | Page number not reset | Watch search changes and set `page.value = 1` |
| Server pagination not working | serverPagination false or paginationData not updated | Set serverPagination: true and update paginationData |
| Search finds nothing | Case sensitivity or nested fields | Search is case-insensitive across all top-level values |
| Pagination counts off | Server totalItems mismatch | Ensure server returns correct totalItems |
| Performance degradation | Client pagination with large dataset | Switch to serverPagination: true |

---


---

## useTableSearch

Manages table search state with automatic debouncing and error handling.

### Type Signature

```typescript
interface UseTableSearchOptions {
  initialValue?: string
  debounceMs?: number
  onSearch?: (value: string) => void | Promise<void>
}

function useTableSearch(options?: UseTableSearchOptions): {
  search: Readonly<Ref<string>>
  isSearching: Readonly<Ref<boolean>>
  handleSearch: (value: string) => void
  clearSearch: () => void
}
```

### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `initialValue` | `string` | No | `''` | Initial search text |
| `debounceMs` | `number` | No | `300` | Debounce delay in milliseconds |
| `onSearch` | `(value: string) => void \| Promise<void>` | No | `undefined` | Callback function when search executes |

### Returns

| Property | Type | Description |
|----------|------|-------------|
| `search` | `Readonly<Ref<string>>` | Current search string (readonly) |
| `isSearching` | `Readonly<Ref<boolean>>` | Whether async search is in progress |
| `handleSearch` | `(value: string) => void` | Debounced search handler |
| `clearSearch` | `() => void` | Clear search and call onSearch('') |

### Return Values Detail

**search**: Readonly ref containing current search query. Use `.value` to access.

**isSearching**: Readonly ref indicating if async onSearch callback is executing. Useful for showing loading spinner.

**handleSearch**: Debounced function that updates search and calls onSearch. Debounce delay specified by debounceMs.

**clearSearch**: Resets search to '' and calls onSearch if provided. Does not debounce.

### Basic Usage

Simple search input:

```vue
<script setup lang="ts">
const { search, handleSearch, clearSearch } = useTableSearch({
  debounceMs: 300
})
</script>

<template>
  <div class="flex gap-2">
    <UInput
      :value="search"
      placeholder="Search..."
      @input="(e) => handleSearch(e.target.value)"
    />
    <UButton @click="clearSearch">Clear</UButton>
  </div>
</template>
```

### With Server Search

Search that queries the server:

```vue
<script setup lang="ts">
const results = ref([])

const { search, isSearching, handleSearch } = useTableSearch({
  debounceMs: 500,
  onSearch: async (query) => {
    if (query === '') {
      results.value = []
      return
    }
    
    try {
      const { data } = await $fetch('/api/search', {
        query: { q: query }
      })
      results.value = data
    } catch (error) {
      console.error('Search failed:', error)
    }
  }
})
</script>

<template>
  <div>
    <div class="flex gap-2">
      <UInput
        :value="search"
        placeholder="Search..."
        @input="(e) => handleSearch(e.target.value)"
      />
      <UIcon v-if="isSearching" class="animate-spin" />
    </div>
    <div v-if="results.length > 0" class="mt-4">
      <div v-for="result in results" :key="result.id" class="p-2 border">
        {{ result.title }}
      </div>
    </div>
  </div>
</template>
```

### Search with URL Updates

Sync search with URL query parameters:

```vue
<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const initialSearch = route.query.q as string || ''

const { search, handleSearch, clearSearch } = useTableSearch({
  initialValue: initialSearch,
  debounceMs: 300,
  onSearch: async (query) => {
    // Update URL
    await router.push({
      query: { ...route.query, q: query || undefined }
    })
  }
})

// Sync when query param changes
watch(() => route.query.q, (newQuery) => {
  if (newQuery !== search.value) {
    handleSearch(newQuery as string || '')
  }
})
</script>
```

### Search with Async Validation

Show search status and validation:

```vue
<script setup lang="ts">
const searchStatus = ref('')
const searchError = ref('')

const { search, isSearching, handleSearch, clearSearch } = useTableSearch({
  onSearch: async (query) => {
    searchStatus.value = 'Searching...'
    searchError.value = ''
    
    try {
      // Validate query
      if (query.length < 2) {
        searchStatus.value = 'Enter at least 2 characters'
        return
      }
      
      // Perform search
      const results = await $fetch('/api/search', { query: { q: query } })
      searchStatus.value = `Found ${results.length} results`
    } catch (error) {
      searchError.value = 'Search failed. Please try again.'
      searchStatus.value = ''
    }
  }
})
</script>

<template>
  <div>
    <UInput
      :value="search"
      placeholder="Search..."
      @input="(e) => handleSearch(e.target.value)"
      :disabled="isSearching"
    />
    
    <div v-if="isSearching" class="text-sm text-gray-600 mt-2">
      Searching...
    </div>
    <div v-else-if="searchError" class="text-sm text-red-600 mt-2">
      {{ searchError }}
    </div>
    <div v-else-if="searchStatus" class="text-sm text-gray-600 mt-2">
      {{ searchStatus }}
    </div>
    
    <UButton 
      v-if="search"
      @click="clearSearch"
      variant="ghost"
      size="sm"
    >
      Clear
    </UButton>
  </div>
</template>
```

### Best Practices

**DO:**
- ✅ Use debounce to reduce server load (300-500ms typical)
- ✅ Show isSearching state with loading indicator
- ✅ Handle errors in onSearch callback
- ✅ Use clearSearch for quick reset
- ✅ Validate query length before searching
- ✅ Provide user feedback on search results

**DON'T:**
- ❌ Use debounceMs < 200 (too aggressive)
- ❌ Perform expensive operations on every keystroke
- ❌ Forget to handle empty search (should clear results)
- ❌ Ignore isSearching state (users think nothing is happening)
- ❌ Search without server-side validation

### Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Search fires too often | debounceMs too low | Increase to 300-500ms |
| Search fires not at all | handleSearch not called | Ensure bound to @input event properly |
| isSearching never resets | Error in onSearch callback | Add try/catch and finally block |
| Clear button doesn't reset | clearSearch not updating parent state | Parent must watch search.value and reset state |
| Debounce not working | Direct mutation of search.value | Always use handleSearch() method |

---


## Related Resources

- [Table Components](/api-reference/components/table-components) - Table UI components
- [Query Composables](/api-reference/composables/query-composables) - Data fetching for tables
- [Nuxt UI Table](https://ui.nuxt.com/components/table) - Nuxt UI table component
