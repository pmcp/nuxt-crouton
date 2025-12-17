---
title: Mutation Composables
description: Create, update, and delete collection data with automatic cache invalidation
icon: i-heroicons-pencil-square
---

## useCollectionMutation

Mutate collection data with optimized API calls and automatic cache invalidation.

### Type Signature

```typescript
function useCollectionMutation(collection: string): {
  create: (data: any) => Promise<any>
  update: (id: string, data: any) => Promise<any>
  deleteItems: (ids: string[]) => Promise<void>
}
```

### Parameters

- **collection** (string) - The collection name

### Returns

- **create** - Create new item
- **update** - Update existing item
- **deleteItems** - Delete one or more items

### Usage

```vue
<script setup lang="ts">
const { create, update, deleteItems } = useCollectionMutation('shopProducts')

// Create
await create({
  name: 'New Product',
  price: 29.99
})

// Update
await update('product-123', {
  name: 'Updated Name'
})

// Delete
await deleteItems(['id1', 'id2'])
</script>
```

### In Generated Forms

```vue
<script setup lang="ts">
const props = defineProps<ShopProductsFormProps>()
const { create, update, deleteItems } = useCollectionMutation(props.collection)

const handleSubmit = async () => {
  if (props.action === 'create') {
    await create(state.value)
  } else if (props.action === 'update') {
    await update(state.value.id, state.value)
  } else if (props.action === 'delete') {
    await deleteItems(props.items)
  }
  close()
}
</script>
```

### When to Use

**Best for:**
- Generated forms
- Repeated operations on the same collection
- Multi-step wizards
- Bulk operations (same collection)

**Use `useCroutonMutate()` instead for:**
- One-off actions
- Quick toggle buttons
- Utility functions

---



---

## useCroutonMutate

Quick mutation API for one-off operations across any collection. **(Already documented above, but here's the expanded version)**

### Type Signature

```typescript
function useCroutonMutate(): {
  mutate: (
    action: 'create' | 'update' | 'delete',
    collection: string,
    data: any
  ) => Promise<any>
}
```

### Returns

- **mutate** - Generic mutation function for any collection

### Basic Operations

```vue
<script setup lang="ts">
const { mutate } = useCroutonMutate()

// Create new item
const newProduct = await mutate('create', 'shopProducts', {
  name: 'New Product',
  price: 29.99,
  categoryId: 'cat-123'
})

// Update existing item
const updated = await mutate('update', 'shopProducts', {
  id: 'product-123',
  name: 'Updated Name',
  price: 34.99
})

// Delete items
await mutate('delete', 'shopProducts', ['id1', 'id2'])
// Or single item
await mutate('delete', 'shopProducts', 'id1')
</script>
```

### Quick Toggle Actions

Perfect for inline buttons and quick state changes:

```vue
<script setup lang="ts">
const { mutate } = useCroutonMutate()

const toggleFeatured = async (product: Product) => {
  await mutate('update', 'shopProducts', {
    id: product.id,
    featured: !product.featured
  })
}

const togglePublished = async (post: Post) => {
  await mutate('update', 'blogPosts', {
    id: post.id,
    published: !post.published,
    publishedAt: post.published ? null : new Date().toISOString()
  })
}
</script>

<template>
  <UButton @click="toggleFeatured(product)">
    {{ product.featured ? '⭐ Unfeature' : '☆ Feature' }}
  </UButton>
  <UButton @click="togglePublished(post)">
    {{ post.published ? 'Unpublish' : 'Publish' }}
  </UButton>
</template>
```

### Cross-Collection Operations

Mutate different collections without creating multiple composable instances:

```vue
<script setup lang="ts">
const { mutate } = useCroutonMutate()

const archiveProject = async (projectId: string) => {
  // Update project status
  await mutate('update', 'projects', {
    id: projectId,
    status: 'archived',
    archivedAt: new Date().toISOString()
  })
  
  // Create audit log entry
  await mutate('create', 'auditLogs', {
    action: 'project.archived',
    projectId,
    userId: user.value.id
  })
  
  // Send notification
  await mutate('create', 'notifications', {
    type: 'project.archived',
    recipientId: project.value.ownerId,
    message: `Project ${project.value.name} was archived`
  })
}
</script>
```

### Utility Functions

Use in composables for reusable logic:

```typescript
// composables/useProductActions.ts
export function useProductActions() {
  const { mutate } = useCroutonMutate()
  
  const duplicateProduct = async (productId: string) => {
    // Fetch original
    const original = await $fetch(`/api/teams/123/shopProducts/${productId}`)
    
    // Create duplicate
    return await mutate('create', 'shopProducts', {
      ...original,
      name: `${original.name} (Copy)`,
      id: undefined  // Let server generate new ID
    })
  }
  
  const bulkUpdatePrices = async (productIds: string[], multiplier: number) => {
    for (const id of productIds) {
      const product = await $fetch(`/api/teams/123/shopProducts/${id}`)
      await mutate('update', 'shopProducts', {
        id,
        price: product.price * multiplier
      })
    }
  }
  
  return {
    duplicateProduct,
    bulkUpdatePrices
  }
}
```

### Error Handling

```vue
<script setup lang="ts">
const { mutate } = useCroutonMutate()
const toast = useToast()

const handleQuickDelete = async (id: string) => {
  try {
    await mutate('delete', 'shopProducts', [id])
    
    toast.add({
      title: 'Product deleted',
      color: 'green'
    })
  } catch (error) {
    toast.add({
      title: 'Delete failed',
      description: error.message,
      color: 'red'
    })
  }
}
</script>
```

### Validation

Update operations require an `id`:

```typescript
// ❌ ERROR: Update requires data.id
await mutate('update', 'shopProducts', {
  name: 'Updated Name'
})
// Throws: "Update requires data.id"

// ✅ GOOD: Include id
await mutate('update', 'shopProducts', {
  id: 'product-123',
  name: 'Updated Name'
})
```

### Comparison Table

| Scenario | Use This |
|----------|----------|
| Toggle button | `useCroutonMutate()` ✅ |
| Quick add/delete | `useCroutonMutate()` ✅ |
| Utility function | `useCroutonMutate()` ✅ |
| Cross-collection mutations | `useCroutonMutate()` ✅ |
| Generated form | `useCollectionMutation()` |
| Multi-step wizard | `useCollectionMutation()` |
| Repeated operations (same collection) | `useCollectionMutation()` |

### Integration with Other Composables

```vue
<script setup lang="ts">
const { mutate } = useCroutonMutate()
const { items, refresh } = await useCollectionQuery('shopProducts')

// After mutation, manually refresh query
const quickCreate = async () => {
  await mutate('create', 'shopProducts', { name: 'New Product' })
  await refresh()  // Update the list
}

// Or rely on automatic cache invalidation
const quickUpdate = async (id: string) => {
  await mutate('update', 'shopProducts', {
    id,
    featured: true
  })
  // Cache automatically refreshes!
}
</script>
```

### Best Practices

**DO:**
- ✅ Use for one-off, quick mutations
- ✅ Use for cross-collection operations
- ✅ Use in utility functions and composables
- ✅ Handle errors with try/catch

**DON'T:**
- ❌ Use for forms (use `useCollectionMutation()` instead)
- ❌ Forget the `id` field for updates
- ❌ Use for repeated operations on same collection

---


## Related Resources

- [Query Composables](/api-reference/composables/query-composables) - Data fetching patterns
- [Form Composables](/api-reference/composables/form-composables) - Form state management
- [Nuxt Data Fetching](https://nuxt.com/docs/getting-started/data-fetching) - Nuxt's data patterns
