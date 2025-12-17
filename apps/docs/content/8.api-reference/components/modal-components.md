---
title: Modal Components
description: Modal, slideover, and dialog components for overlay interfaces
icon: i-heroicons-window
---

## CroutonButton

Submit button for CRUD forms with built-in loading states and labels.

### Props

```typescript
interface CroutonButtonProps {
  action: 'create' | 'update' | 'delete'  // Action type
  collection: string                       // Collection name
  loading?: string                         // Loading state
  type?: 'submit' | 'button'              // Button type
}
```

### Basic Usage

```vue
<template>
  <UForm @submit="handleSubmit">
    <!-- Form fields -->

    <CroutonButton
      :action="action"
      :collection="collection"
      :loading="loading"
      type="submit"
    />
  </UForm>
</template>
```

### In Generated Forms

The button is automatically included in generated forms:

```vue
<template>
  <UForm :state="state" :schema="schema" @submit="handleSubmit">
    <UFormField label="Name" name="name">
      <UInput v-model="state.name" />
    </UFormField>

    <UFormField label="Price" name="price">
      <UInput v-model.number="state.price" type="number" />
    </UFormField>

    <!-- Button automatically shows correct label and loading state -->
    <CroutonButton
      :action="action"
      :collection="collection"
      :loading="loading"
      type="submit"
    />
  </UForm>
</template>

<script setup lang="ts">
const props = defineProps<{
  action: 'create' | 'update' | 'delete'
  collection: string
  loading: string
}>()

const { create, update, deleteItems } = useCollectionMutation(props.collection)

const handleSubmit = async () => {
  if (props.action === 'create') {
    await create(state.value)
  } else if (props.action === 'update') {
    await update(state.value.id, state.value)
  }
  close()
}
</script>
```

### Button Labels

The button automatically displays the appropriate label based on the action:

- **create** → "Create"
- **update** → "Update"
- **delete** → "Delete"

Labels are translation-ready when using the i18n extension.

### Loading States

The button shows a loading spinner when `loading` prop matches the action:

```vue
<script setup lang="ts">
const { loading } = useCrouton()

// loading.value will be 'create', 'update', or 'delete' during operations
</script>

<template>
  <CroutonButton
    action="create"
    collection="shopProducts"
    :loading="loading"
  />
  <!-- Shows spinner when loading === 'create' -->
</template>
```

### Custom Styling

Override default styles using [Nuxt UI](https://ui.nuxt.com)'s class props:

```vue
<template>
  <CroutonButton
    :action="action"
    :collection="collection"
    color="primary"
    size="lg"
    variant="solid"
  />
</template>
```

---


---

## Advanced Props

### CroutonList Complete API

```typescript
interface CroutonListProps {
  // Data
  rows: any[]                    // Array of items to display
  columns: Column[]              // Column definitions
  collection?: string            // Collection name for actions

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

### CroutonButton Complete API

```typescript
interface CroutonButtonProps {
  action: 'create' | 'update' | 'delete'  // Action type
  collection: string                       // Collection name
  loading?: string                         // Loading state identifier
  type?: 'submit' | 'button'              // HTML button type
  items?: any[]                           // Items for bulk operations
}
```


---

## Component Events

### CroutonList Events

```typescript
// Row selection
@update:selected="handleSelection"  // Emits: string[] (row IDs)

// Column visibility
@update:column-visibility="handleVisibility"  // Emits: Record<string, boolean>

// Pagination (when server-pagination enabled)
@update:page="handlePageChange"     // Emits: number
@update:page-size="handleSizeChange" // Emits: number
```

### CroutonButton Events

No custom events - uses native form submission.


---

## Component Slots

### CroutonList Slots

```vue
<template>
  <CroutonList :rows="items" :columns="columns">
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
      <!-- Customize actions shown on the right side of each list item -->
      <USelect
        :model-value="row.role"
        :items="['admin', 'member', 'viewer']"
        size="sm"
        @update:model-value="updateRole(row.id, $event)"
      />
      <UButton
        icon="i-lucide-trash"
        color="red"
        variant="ghost"
        size="sm"
        @click="handleDelete(row.id)"
      />
    </template>
  </CroutonList>
</template>
```

---


## Related Resources

- [Form Composables](/api-reference/composables/form-composables) - Modal state management
- [Nuxt UI Modal](https://ui.nuxt.com/components/modal) - Base modal component
- [Nuxt UI Slideover](https://ui.nuxt.com/components/slideover) - Base slideover component
