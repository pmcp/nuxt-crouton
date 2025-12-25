# Collection Export Implementation Plan

## Overview

Add data export capabilities to `@friendlyinternet/nuxt-crouton` core package, enabling users to export collection data to CSV and JSON formats.

---

## Motivation

- Standard admin panel feature - users expect to export their data
- Useful for reporting, backups, data migration
- Simple to implement with no external dependencies
- Pairs well with existing `useCollectionQuery` composable

---

## Dependencies

**No new dependencies required.**

CSV and JSON export can be handled with native JavaScript. No need for papaparse or similar libraries for basic export functionality.

---

## API Design

### Composable: `useCollectionExport`

```typescript
interface ExportField {
  /** Field key in the data */
  key: string
  /** Header label for export (defaults to key) */
  label?: string
  /** Transform value before export */
  transform?: (value: any, row: any) => any
}

interface ExportOptions {
  /** Specific fields to include (default: all) */
  fields?: (string | ExportField)[]
  
  /** Fields to exclude from export */
  excludeFields?: string[]
  
  /** Custom filename (without extension) */
  filename?: string
  
  /** Include metadata fields (createdAt, updatedAt, etc.) */
  includeMetadata?: boolean
  
  /** Include ID field */
  includeId?: boolean
  
  /** Transform each row before export */
  transformRow?: (row: any) => any
  
  /** Date format for date fields */
  dateFormat?: 'iso' | 'locale' | 'timestamp'
  
  /** How to handle nested objects/arrays in CSV */
  flattenNested?: boolean
}

interface UseCollectionExportReturn {
  /** Export provided rows to CSV */
  exportCSV: (rows: any[], options?: ExportOptions) => void
  
  /** Export provided rows to JSON */
  exportJSON: (rows: any[], options?: ExportOptions) => void
  
  /** Export with fetch (for server-side filtering) */
  exportWithQuery: (
    format: 'csv' | 'json',
    query?: Record<string, any>,
    options?: ExportOptions
  ) => Promise<void>
  
  /** Loading state for async exports */
  isExporting: Ref<boolean>
}
```

### Default Excluded Fields

These fields are excluded by default (can be overridden):

```typescript
const DEFAULT_EXCLUDED = ['teamId']
```

---

## Implementation

### File: `packages/nuxt-crouton/app/composables/useCollectionExport.ts`

```typescript
import { ref } from 'vue'
import type { Ref } from 'vue'

// Types
export interface ExportField {
  key: string
  label?: string
  transform?: (value: any, row: any) => any
}

export interface ExportOptions {
  fields?: (string | ExportField)[]
  excludeFields?: string[]
  filename?: string
  includeMetadata?: boolean
  includeId?: boolean
  transformRow?: (row: any) => any
  dateFormat?: 'iso' | 'locale' | 'timestamp'
  flattenNested?: boolean
}

export interface UseCollectionExportReturn {
  exportCSV: (rows: any[], options?: ExportOptions) => void
  exportJSON: (rows: any[], options?: ExportOptions) => void
  exportWithQuery: (
    format: 'csv' | 'json',
    query?: Record<string, any>,
    options?: ExportOptions
  ) => Promise<void>
  isExporting: Ref<boolean>
}

// Metadata fields that are often excluded
const METADATA_FIELDS = ['createdAt', 'updatedAt', 'createdBy', 'updatedBy']
const DEFAULT_EXCLUDED = ['teamId']

export function useCollectionExport(collection: string): UseCollectionExportReturn {
  const isExporting = ref(false)
  const { teamId } = useTeamContext()
  
  /**
   * Resolve field configuration
   */
  function resolveFields(
    rows: any[],
    options: ExportOptions
  ): ExportField[] {
    if (!rows.length) return []
    
    const sampleRow = rows[0]
    let fieldKeys: string[]
    
    if (options.fields) {
      // Use specified fields
      fieldKeys = options.fields.map(f => typeof f === 'string' ? f : f.key)
    } else {
      // Use all fields from first row
      fieldKeys = Object.keys(sampleRow)
    }
    
    // Apply exclusions
    const excludeSet = new Set([
      ...DEFAULT_EXCLUDED,
      ...(options.excludeFields || []),
      ...(!options.includeId ? ['id'] : []),
      ...(!options.includeMetadata ? METADATA_FIELDS : []),
    ])
    
    fieldKeys = fieldKeys.filter(key => !excludeSet.has(key))
    
    // Convert to ExportField objects
    return fieldKeys.map(key => {
      const fieldConfig = options.fields?.find(
        f => (typeof f === 'string' ? f : f.key) === key
      )
      
      if (typeof fieldConfig === 'object') {
        return fieldConfig
      }
      
      return { key, label: key }
    })
  }

  /**
   * Format a value for export
   */
  function formatValue(
    value: any,
    field: ExportField,
    row: any,
    options: ExportOptions
  ): any {
    // Apply custom transform first
    if (field.transform) {
      value = field.transform(value, row)
    }
    
    // Handle null/undefined
    if (value == null) {
      return ''
    }
    
    // Handle dates
    if (value instanceof Date) {
      switch (options.dateFormat) {
        case 'timestamp':
          return value.getTime()
        case 'locale':
          return value.toLocaleString()
        case 'iso':
        default:
          return value.toISOString()
      }
    }
    
    // Handle arrays and objects
    if (typeof value === 'object') {
      if (options.flattenNested) {
        return JSON.stringify(value)
      }
      // For CSV, always stringify
      return JSON.stringify(value)
    }
    
    return value
  }

  /**
   * Escape a value for CSV
   */
  function escapeCSV(value: any): string {
    if (value == null) return ''
    
    const str = String(value)
    
    // Check if we need to quote
    const needsQuoting = str.includes(',') || 
                         str.includes('"') || 
                         str.includes('\n') ||
                         str.includes('\r')
    
    if (needsQuoting) {
      // Escape double quotes by doubling them
      return `"${str.replace(/"/g, '""')}"`
    }
    
    return str
  }

  /**
   * Generate CSV content
   */
  function generateCSV(rows: any[], options: ExportOptions = {}): string {
    if (!rows.length) return ''
    
    const fields = resolveFields(rows, options)
    
    // Header row
    const headers = fields.map(f => escapeCSV(f.label || f.key))
    const headerLine = headers.join(',')
    
    // Data rows
    const dataLines = rows.map(row => {
      // Apply row transform
      const transformedRow = options.transformRow 
        ? options.transformRow(row) 
        : row
      
      return fields
        .map(field => {
          const value = transformedRow[field.key]
          const formatted = formatValue(value, field, transformedRow, options)
          return escapeCSV(formatted)
        })
        .join(',')
    })
    
    return [headerLine, ...dataLines].join('\n')
  }

  /**
   * Generate JSON content
   */
  function generateJSON(rows: any[], options: ExportOptions = {}): string {
    const fields = resolveFields(rows, options)
    const fieldKeys = new Set(fields.map(f => f.key))
    
    const exportData = rows.map(row => {
      // Apply row transform
      const transformedRow = options.transformRow 
        ? options.transformRow(row) 
        : row
      
      // Filter to only included fields
      const filtered: Record<string, any> = {}
      
      for (const field of fields) {
        const value = transformedRow[field.key]
        filtered[field.key] = formatValue(value, field, transformedRow, options)
      }
      
      return filtered
    })
    
    return JSON.stringify(exportData, null, 2)
  }

  /**
   * Trigger file download
   */
  function downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8` })
    const url = URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.style.display = 'none'
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    // Clean up
    URL.revokeObjectURL(url)
  }

  /**
   * Generate filename with timestamp
   */
  function generateFilename(options: ExportOptions, extension: string): string {
    const base = options.filename || collection
    const timestamp = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    return `${base}-${timestamp}.${extension}`
  }

  // ============ Public Methods ============

  /**
   * Export rows to CSV file
   */
  function exportCSV(rows: any[], options: ExportOptions = {}): void {
    if (!rows.length) {
      console.warn('[useCollectionExport] No data to export')
      return
    }
    
    const csv = generateCSV(rows, options)
    const filename = generateFilename(options, 'csv')
    downloadFile(csv, filename, 'text/csv')
  }

  /**
   * Export rows to JSON file
   */
  function exportJSON(rows: any[], options: ExportOptions = {}): void {
    if (!rows.length) {
      console.warn('[useCollectionExport] No data to export')
      return
    }
    
    const json = generateJSON(rows, options)
    const filename = generateFilename(options, 'json')
    downloadFile(json, filename, 'application/json')
  }

  /**
   * Export with server query (fetches all matching data)
   */
  async function exportWithQuery(
    format: 'csv' | 'json',
    query: Record<string, any> = {},
    options: ExportOptions = {}
  ): Promise<void> {
    isExporting.value = true
    
    try {
      // Fetch all data (remove pagination limits)
      const { apiPath } = useCollections().getConfig(collection)
      const url = apiPath.replace('{teamId}', teamId.value)
      
      const data = await $fetch(url, {
        query: {
          ...query,
          limit: 10000, // Or use a configurable max
          page: undefined,
        },
      })
      
      const rows = Array.isArray(data) ? data : data.items || data.data || []
      
      if (format === 'csv') {
        exportCSV(rows, options)
      } else {
        exportJSON(rows, options)
      }
    } catch (error) {
      console.error('[useCollectionExport] Export failed:', error)
      throw error
    } finally {
      isExporting.value = false
    }
  }

  return {
    exportCSV,
    exportJSON,
    exportWithQuery,
    isExporting,
  }
}
```

---

## Component: `CroutonExportButton`

A ready-to-use export dropdown button.

### File: `packages/nuxt-crouton/app/components/ExportButton.vue`

```vue
<script setup lang="ts">
import type { ExportOptions } from '../composables/useCollectionExport'

interface Props {
  /** Collection name */
  collection: string
  
  /** Data rows to export */
  rows: any[]
  
  /** Available export formats */
  formats?: ('csv' | 'json')[]
  
  /** Export options passed to composable */
  options?: ExportOptions
  
  /** Button variant */
  variant?: 'solid' | 'outline' | 'ghost' | 'soft' | 'link'
  
  /** Button size */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  
  /** Button color */
  color?: string
  
  /** Disable the button */
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  formats: () => ['csv', 'json'],
  variant: 'ghost',
  size: 'sm',
  disabled: false,
})

const emit = defineEmits<{
  export: [format: 'csv' | 'json', rows: any[]]
  error: [error: Error]
}>()

const { exportCSV, exportJSON } = useCollectionExport(props.collection)

const dropdownItems = computed(() => {
  return props.formats.map(format => [{
    label: `Export as ${format.toUpperCase()}`,
    icon: format === 'csv' 
      ? 'i-lucide-file-spreadsheet' 
      : 'i-lucide-file-json',
    disabled: props.disabled || !props.rows?.length,
    click: () => handleExport(format),
  }])
})

function handleExport(format: 'csv' | 'json') {
  try {
    if (format === 'csv') {
      exportCSV(props.rows, props.options)
    } else {
      exportJSON(props.rows, props.options)
    }
    emit('export', format, props.rows)
  } catch (error) {
    emit('error', error as Error)
  }
}

// Single format mode (no dropdown)
const isSingleFormat = computed(() => props.formats.length === 1)

function handleSingleClick() {
  if (isSingleFormat.value) {
    handleExport(props.formats[0])
  }
}
</script>

<template>
  <!-- Single format: regular button -->
  <UButton
    v-if="isSingleFormat"
    :variant="variant"
    :size="size"
    :color="color"
    :disabled="disabled || !rows?.length"
    icon="i-lucide-download"
    @click="handleSingleClick"
  >
    <slot>Export {{ formats[0].toUpperCase() }}</slot>
  </UButton>
  
  <!-- Multiple formats: dropdown -->
  <UDropdown
    v-else
    :items="dropdownItems"
    :popper="{ placement: 'bottom-end' }"
  >
    <UButton
      :variant="variant"
      :size="size"
      :color="color"
      :disabled="disabled || !rows?.length"
      icon="i-lucide-download"
      trailing-icon="i-lucide-chevron-down"
    >
      <slot>Export</slot>
    </UButton>
  </UDropdown>
</template>
```

---

## Usage Examples

### Basic Export

```vue
<script setup lang="ts">
const { items } = await useCollectionQuery('posts')
const { exportCSV, exportJSON } = useCollectionExport('posts')
</script>

<template>
  <div>
    <UButton @click="exportCSV(items)">Export CSV</UButton>
    <UButton @click="exportJSON(items)">Export JSON</UButton>
  </div>
</template>
```

### With Export Button Component

```vue
<script setup lang="ts">
const { items } = await useCollectionQuery('posts')
</script>

<template>
  <CroutonExportButton
    collection="posts"
    :rows="items"
    :formats="['csv', 'json']"
  />
</template>
```

### Custom Fields & Labels

```vue
<script setup lang="ts">
const { items } = await useCollectionQuery('posts')
const { exportCSV } = useCollectionExport('posts')

function handleExport() {
  exportCSV(items.value, {
    fields: [
      { key: 'title', label: 'Post Title' },
      { key: 'status', label: 'Publication Status' },
      { key: 'createdAt', label: 'Created Date' },
      { 
        key: 'author', 
        label: 'Author Name',
        transform: (author) => author?.name || 'Unknown'
      },
    ],
    includeMetadata: true,
    filename: 'blog-posts-export',
  })
}
</script>
```

### Flatten References

```vue
<script setup lang="ts">
const { items } = await useCollectionQuery('posts')
const { exportCSV } = useCollectionExport('posts')

function handleExport() {
  exportCSV(items.value, {
    transformRow: (row) => ({
      ...row,
      // Flatten nested category object
      categoryName: row.category?.name,
      categoryId: row.category?.id,
      // Flatten tags array
      tags: row.tags?.join(', '),
    }),
    excludeFields: ['category'], // Exclude original nested object
  })
}
</script>
```

### Export with Current Filters

```vue
<script setup lang="ts">
const searchQuery = ref('')
const statusFilter = ref('published')

const query = computed(() => ({
  search: searchQuery.value,
  status: statusFilter.value,
}))

const { items } = await useCollectionQuery('posts', { query })
const { exportWithQuery, isExporting } = useCollectionExport('posts')

async function handleExport() {
  // Exports ALL data matching current filters (not just current page)
  await exportWithQuery('csv', query.value, {
    filename: `posts-${statusFilter.value}`,
  })
}
</script>

<template>
  <UButton 
    @click="handleExport" 
    :loading="isExporting"
  >
    Export All Matching
  </UButton>
</template>
```

### Integration in Table Header

```vue
<script setup lang="ts">
const { items } = await useCollectionQuery('products')
</script>

<template>
  <CroutonCollection
    :rows="items"
    collection="products"
  >
    <template #header>
      <div class="flex justify-between items-center p-4">
        <h2>Products</h2>
        <div class="flex gap-2">
          <CroutonExportButton
            collection="products"
            :rows="items"
            :options="{ excludeFields: ['teamId', 'id'] }"
          />
          <UButton @click="open('create', 'products')">
            Add Product
          </UButton>
        </div>
      </div>
    </template>
  </CroutonCollection>
</template>
```

---

## Edge Cases & Error Handling

### Empty Data

```typescript
function exportCSV(rows: any[], options: ExportOptions = {}): void {
  if (!rows.length) {
    // Option 1: Silent no-op with warning
    console.warn('[useCollectionExport] No data to export')
    return
    
    // Option 2: Could show a toast
    // useToast().add({ title: 'No data to export', color: 'amber' })
  }
  // ... rest of export
}
```

### Large Datasets

For very large exports, consider:

```typescript
// Future enhancement: streaming export
async function exportLargeCSV(query: Record<string, any>) {
  // Fetch in batches
  let page = 1
  const pageSize = 1000
  const allRows: any[] = []
  
  while (true) {
    const batch = await fetchBatch(page, pageSize, query)
    if (!batch.length) break
    allRows.push(...batch)
    page++
  }
  
  exportCSV(allRows)
}
```

### Special Characters

The `escapeCSV` function handles:
- Commas in values
- Double quotes (escaped as `""`)
- Newlines in values
- Unicode characters (via UTF-8 BOM option)

---

## Future Enhancements

### Phase 2: Excel Export (XLSX)

Would require a dependency like `xlsx` or `exceljs`:

```typescript
// Future: useCollectionExport
function exportXLSX(rows: any[], options?: ExportOptions): void {
  // Requires: pnpm add xlsx
  import('xlsx').then(XLSX => {
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Data')
    XLSX.writeFile(wb, `${collection}.xlsx`)
  })
}
```

### Phase 3: Import

Import is more complex (validation, conflicts, UI for column mapping). Could be a separate composable:

```typescript
// Future: useCollectionImport
interface ImportResult {
  success: number
  failed: number
  errors: Array<{ row: number; error: string }>
}

function useCollectionImport(collection: string) {
  async function importCSV(file: File): Promise<ImportResult>
  async function importJSON(file: File): Promise<ImportResult>
  function parseCSV(content: string): any[]
  // ... validation, conflict resolution
}
```

### Phase 4: Export Presets

Save common export configurations:

```typescript
// app.config.ts
export default defineAppConfig({
  crouton: {
    export: {
      presets: {
        'posts-minimal': {
          collection: 'posts',
          fields: ['title', 'status', 'createdAt'],
          excludeFields: ['content'],
        },
        'posts-full': {
          collection: 'posts',
          includeMetadata: true,
          includeId: true,
        },
      },
    },
  },
})
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `app/composables/useCollectionExport.ts` | Create |
| `app/components/ExportButton.vue` | Create |
| `app/composables/index.ts` | Export new composable |
| `README.md` | Document new feature |

---

## Testing Plan

1. **Unit tests** for `useCollectionExport`:
   - CSV generation with various data types
   - JSON generation
   - Field filtering (include/exclude)
   - Custom transforms
   - Empty data handling
   - Special character escaping

2. **Component tests** for `CroutonExportButton`:
   - Dropdown renders correct options
   - Disabled state when no data
   - Click triggers export

3. **E2E tests**:
   - Click export → file downloads
   - Downloaded file has correct content
   - Filename includes date

---

## Estimated Effort

- Composable implementation: 2-3 hours
- Component implementation: 1 hour
- Testing: 2 hours
- Documentation: 1 hour

**Total: ~6-7 hours**

---

## Migration / Breaking Changes

None - this is a new additive feature.
