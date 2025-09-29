# List Component Layouts

The List component in Nuxt Crouton supports multiple layout modes with responsive breakpoint switching, allowing you to display your data in different formats based on viewport size or user preference.

## Available Layouts

- **`table`** - Traditional table view with columns and rows (default)
- **`list`** - Card-style list view with avatars and actions
- **`grid`** - Grid layout with cards (coming soon)
- **`cards`** - Card layout optimized for rich content (coming soon)

## Basic Usage

### Single Layout

Use a simple string to apply the same layout across all viewport sizes:

```vue
<!-- Table view (default) -->
<List :rows="users" :columns="columns" collection="users" />

<!-- List view -->
<List layout="list" :rows="users" collection="users" />
```

### Responsive Layouts

Define different layouts for different viewport sizes using an object:

```vue
<List
  :layout="{
    base: 'list',   // < 640px (mobile)
    sm: 'list',     // >= 640px
    md: 'list',     // >= 768px (tablet)
    lg: 'table',    // >= 1024px (desktop)
    xl: 'table',    // >= 1280px
    '2xl': 'table'  // >= 1536px
  }"
  :rows="users"
  :columns="columns"
  collection="users"
/>
```

### Layout Presets

Use built-in presets for common responsive patterns:

```vue
<!-- Responsive: list → grid → table -->
<List layout="responsive" :rows="users" collection="users" />

<!-- Mobile-friendly: list on mobile, table on desktop -->
<List layout="mobile-friendly" :rows="users" collection="users" />

<!-- Compact: list until XL screens, then table -->
<List layout="compact" :rows="users" collection="users" />
```

## List Layout Features

### Automatic Field Mapping

The list layout automatically detects common field names for display:

**Title Field Priority:**
1. `name`
2. `title`
3. `label`
4. `email`
5. `username`
6. `id`

**Subtitle Field Priority:**
1. `description`
2. `email` (if name exists)
3. `username` (if name exists)
4. `role`
5. `createdAt` (formatted as date)

**Avatar Field Priority:**
1. `avatar` (object with avatar props)
2. `image` (string URL)
3. `avatarUrl` (string URL)
4. `profileImage` (string URL)

### Custom List Item Actions

Override the default actions for list items using the `list-item-actions` slot:

```vue
<List layout="list" :rows="users" collection="users">
  <template #list-item-actions="{ row }">
    <USelect
      :model-value="row.role"
      :items="['admin', 'member', 'viewer']"
      size="sm"
    />
    <UButton
      icon="i-lucide-trash"
      color="red"
      variant="ghost"
      @click="handleDelete(row.id)"
    />
  </template>
</List>
```

## TypeScript Types

```typescript
// Layout type definitions
type LayoutType = 'table' | 'list' | 'grid' | 'cards'

interface ResponsiveLayout {
  base: LayoutType      // Default/mobile layout
  sm?: LayoutType       // >= 640px
  md?: LayoutType       // >= 768px
  lg?: LayoutType       // >= 1024px
  xl?: LayoutType       // >= 1280px
  '2xl'?: LayoutType    // >= 1536px
}

// Available presets
type LayoutPreset = 'responsive' | 'mobile-friendly' | 'compact'

// Component props
interface ListProps {
  layout?: LayoutType | ResponsiveLayout | LayoutPreset
  rows: any[]
  columns: TableColumn[]
  collection: string
  // ... other props
}
```

## Examples

### E-commerce Product List

```vue
<template>
  <List
    :layout="{
      base: 'list',
      md: 'grid',
      lg: 'table'
    }"
    :rows="products"
    :columns="productColumns"
    collection="products"
  >
    <!-- Custom list item display -->
    <template #list-item-actions="{ row }">
      <UBadge v-if="row.inStock" color="green">In Stock</UBadge>
      <UBadge v-else color="red">Out of Stock</UBadge>
      <UButton size="sm" @click="addToCart(row)">
        Add to Cart
      </UButton>
    </template>
  </List>
</template>

<script setup lang="ts">
const products = ref([
  {
    id: 1,
    name: 'Premium Headphones',
    description: 'Wireless noise-cancelling headphones',
    image: '/products/headphones.jpg',
    price: 299.99,
    inStock: true
  }
  // ...
])

const productColumns = [
  { header: 'Name', accessorKey: 'name' },
  { header: 'Price', accessorKey: 'price' },
  { header: 'Stock', accessorKey: 'inStock' }
]
</script>
```

### User Management Dashboard

```vue
<template>
  <List
    layout="mobile-friendly"
    :rows="users"
    :columns="userColumns"
    collection="users"
  >
    <template #list-item-actions="{ row }">
      <UDropdownMenu
        :items="[
          { label: 'Edit', icon: 'i-lucide-edit' },
          { label: 'Permissions', icon: 'i-lucide-shield' },
          { label: 'Delete', icon: 'i-lucide-trash', color: 'red' }
        ]"
      >
        <UButton
          icon="i-lucide-more-vertical"
          variant="ghost"
          size="sm"
        />
      </UDropdownMenu>
    </template>
  </List>
</template>

<script setup lang="ts">
const users = ref([
  {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
    role: 'admin',
    avatar: { src: '/avatars/john.jpg' },
    createdAt: '2024-01-15'
  }
  // ...
])
</script>
```

### Responsive Blog Posts

```vue
<template>
  <List
    layout="responsive"
    :rows="posts"
    collection="posts"
  >
    <!-- Table columns are still needed for table view -->
    <template #title-cell="{ row }">
      <div class="font-semibold">{{ row.title }}</div>
      <div class="text-sm text-muted">{{ row.excerpt }}</div>
    </template>
  </List>
</template>
```

## Migration Guide

If you're upgrading from a version without layout support:

1. **No changes required** - The component defaults to table layout
2. **TypeScript users** - Update imports if using types directly:
   ```typescript
   // Old
   import type { TableProps } from '@nuxt-crouton/types'

   // New (TableProps is now an alias for ListProps)
   import type { ListProps } from '@nuxt-crouton/types'
   ```

## Performance Considerations

- Layout switching is optimized with computed properties and memoization
- Breakpoint detection uses VueUse's efficient `useBreakpoints` composable
- Only the active layout is rendered (v-if ensures unmounted layouts don't consume resources)

## Extending Layouts

To add custom layouts, extend the `LayoutType` type and implement the corresponding template in the List component:

```typescript
// In your types
type CustomLayoutType = LayoutType | 'custom'

// In your component
<div v-else-if="activeLayout === 'custom'">
  <!-- Your custom layout -->
</div>
```

## Troubleshooting

### Layout Not Switching

Ensure you're using the correct breakpoint values:
- `base` (not `default`) for the base/mobile layout
- Breakpoints are checked from largest to smallest
- Use browser dev tools to verify current viewport width

### List Items Not Displaying Correctly

Check that your data includes fields the list layout can recognize:
- Add a `name`, `title`, or `label` field for the primary text
- Include `description` or similar for subtitle
- Provide image URLs in expected field names

### Custom Actions Not Working

Ensure you're using the correct slot name:
- `list-item-actions` for list layout
- Standard table cell slots for table layout