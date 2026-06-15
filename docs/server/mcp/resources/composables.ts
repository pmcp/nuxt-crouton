/**
 * Composables Reference Resource
 */
export default defineMcpResource({
  uri: 'crouton://composables',
  name: 'Crouton Composables Reference',
  description: 'Reference for all generated and utility composables in Crouton',
  mimeType: 'text/markdown',
  async handler() {
    return {
      contents: [{
        uri: 'crouton://composables',
        mimeType: 'text/markdown',
        text: `# Crouton Composables Reference

## Generated Composables

For each collection, Crouton generates a composable at:
\`layers/[layer]/collections/[collection]/app/composables/use[LayerCollection].ts\`

### useProducts() Example

\`\`\`typescript
// Auto-generated composable
const {
  // Data
  data,           // Ref<Product[]> - List of items
  pending,        // Ref<boolean> - Loading state
  error,          // Ref<Error | null> - Error state

  // Actions
  refresh,        // () => Promise<void> - Refresh data
  create,         // (data: CreateProduct) => Promise<Product>
  update,         // (id: string, data: UpdateProduct) => Promise<Product>
  remove,         // (id: string) => Promise<void>

  // Pagination
  page,           // Ref<number> - Current page
  pageSize,       // Ref<number> - Items per page
  total,          // Ref<number> - Total items

  // Filtering & Sorting
  filters,        // Ref<Record<string, any>> - Active filters
  sortBy,         // Ref<string> - Sort field
  sortOrder,      // Ref<'asc' | 'desc'> - Sort direction
} = useProducts()
\`\`\`

### Usage Examples

\`\`\`vue
<script setup lang="ts">
const { data: products, pending, create, refresh } = useProducts()

// Create a new product
const newProduct = await create({
  name: 'New Product',
  price: 29.99,
  categoryId: 'cat-123'
})

// Refresh the list
await refresh()
</script>

<template>
  <div v-if="pending">Loading...</div>
  <ul v-else>
    <li v-for="product in products" :key="product.id">
      {{ product.name }} - \${{ product.price }}
    </li>
  </ul>
</template>
\`\`\`

---

## Single Item Composable

\`\`\`typescript
// Fetch a single item by ID
const { data: product, pending, error, refresh } = useProduct(id)
\`\`\`

---

## Core Utility Composables

### useCollectionForm

Form state management with validation.

\`\`\`typescript
const {
  state,          // Reactive form state
  errors,         // Validation errors
  isValid,        // Form validity
  isDirty,        // Has unsaved changes
  reset,          // Reset form to initial state
  validate,       // Trigger validation
  submit,         // Submit form
} = useCollectionForm({
  collection: 'products',
  initialData: {},
  schema: productSchema,
  onSubmit: async (data) => {
    await create(data)
  }
})
\`\`\`

### useCollectionTable

Table state management with sorting, filtering, pagination.

\`\`\`typescript
const {
  columns,        // Column definitions
  rows,           // Current page rows
  selectedRows,   // Selected row IDs
  sortBy,         // Current sort column
  sortOrder,      // Sort direction
  page,           // Current page
  pageSize,       // Items per page
  total,          // Total items
  filters,        // Active filters
  setSort,        // Set sort column/order
  setPage,        // Change page
  setFilters,     // Apply filters
  selectAll,      // Select all rows
  clearSelection, // Clear selection
} = useCollectionTable('products')
\`\`\`

### useCollectionFilters

Filter management for collections.

\`\`\`typescript
const {
  filters,        // Active filters
  availableFilters, // Filter definitions
  apply,          // Apply filters
  clear,          // Clear all filters
  toggle,         // Toggle a filter value
} = useCollectionFilters('products')
\`\`\`

### useCollectionSearch

Search functionality.

\`\`\`typescript
const {
  query,          // Search query
  results,        // Search results
  isSearching,    // Loading state
  search,         // Trigger search
  clear,          // Clear search
} = useCollectionSearch('products', {
  fields: ['name', 'description'],
  debounce: 300
})
\`\`\`

---

## Query Composables

### useCollectionQuery

Low-level query builder.

\`\`\`typescript
const { data, pending, error } = useCollectionQuery('products', {
  where: { categoryId: 'electronics' },
  orderBy: { createdAt: 'desc' },
  limit: 10,
  offset: 0
})
\`\`\`

### useInfiniteCollection

Infinite scroll support.

\`\`\`typescript
const {
  items,          // All loaded items
  hasMore,        // More items available
  loading,        // Loading state
  loadMore,       // Load next page
  refresh,        // Refresh from start
} = useInfiniteCollection('products', { pageSize: 20 })
\`\`\`

---

## Mutation Composables

### useCreateItem

\`\`\`typescript
const { mutate: createProduct, pending, error } = useCreateItem('products')
const product = await createProduct({ name: 'New', price: 10 })
\`\`\`

### useUpdateItem

\`\`\`typescript
const { mutate: updateProduct, pending, error } = useUpdateItem('products')
await updateProduct('prod-123', { price: 15 })
\`\`\`

### useDeleteItem

\`\`\`typescript
const { mutate: deleteProduct, pending, error } = useDeleteItem('products')
await deleteProduct('prod-123')
\`\`\`

### useBulkOperation

\`\`\`typescript
const { execute, pending, progress } = useBulkOperation('products')
await execute('delete', ['id1', 'id2', 'id3'])
\`\`\`

---

## Relation Composables

### useRelatedItems

\`\`\`typescript
// Get products in a category
const { data: products } = useRelatedItems('products', {
  foreignKey: 'categoryId',
  value: categoryId
})
\`\`\`

### useParentItem

\`\`\`typescript
// For hierarchical collections
const { data: parent } = useParentItem('categories', currentCategory.parentId)
\`\`\`

### useChildItems

\`\`\`typescript
// Get child items in hierarchy
const { data: children } = useChildItems('categories', parentId)
\`\`\`

---

## Best Practices

1. **Destructure only what you need** - Better for tree shaking
2. **Use computed for derived state** - Don't duplicate reactive data
3. **Handle loading states** - Always show feedback
4. **Handle errors gracefully** - Display user-friendly messages
5. **Use TypeScript** - Full type inference from schemas
`
      }]
    }
  }
})
