---
title: Query Composables
description: Fetch collection data with automatic caching and reactivity
icon: i-heroicons-magnifying-glass
---

## useCollectionQuery

Fetch collection data with automatic caching and reactivity.

### Type Signature

```typescript
function useCollectionQuery<T>(
  collection: string,
  options?: {
    query?: ComputedRef<Record<string, any>>
    watch?: boolean
  }
): Promise<{
  items: ComputedRef<T[]>
  data: Ref<any>
  pending: Ref<boolean>
  error: Ref<any>
  refresh: () => Promise<void>
}>
```

### Parameters

- **collection** (string) - The collection name (e.g., 'shopProducts')
- **options** (object, optional)
  - **query** (ComputedRef) - Reactive query parameters
  - **watch** (boolean) - Enable automatic refetching on query changes

### Returns

- **items** - Computed array of collection items
- **data** - Raw response data
- **pending** - Loading state
- **error** - Error state
- **refresh** - Manual refetch function

### Basic Usage

```vue
<script setup lang="ts">
const { items, pending, error, refresh } = await useCollectionQuery('shopProducts')
</script>

<template>
  <div v-if="pending">Loading...</div>
  <div v-else-if="error">Error: {{ error }}</div>
  <div v-else>
    <div v-for="product in items" :key="product.id">
      {{ product.name }}
    </div>
  </div>
</template>
```

### With Query Parameters

```vue
<script setup lang="ts">
const page = ref(1)
const search = ref('')

const { items, pending } = await useCollectionQuery('shopProducts', {
  query: computed(() => ({
    page: page.value,
    search: search.value
  }))
})
</script>
```

### With Translations

```vue
<script setup lang="ts">
const { locale } = useI18n()

const { items } = await useCollectionQuery('shopProducts', {
  query: computed(() => ({
    locale: locale.value
  }))
})

// Auto-refetches when locale changes!
</script>
```

### Caching Behavior

Each unique query gets its own cache entry:

```typescript
// Different cache keys for different queries
collection:shopProducts:{}                      // All products
collection:shopProducts:{"page":1}              // Page 1
collection:shopProducts:{"page":2}              // Page 2
collection:shopProducts:{"locale":"en"}         // English products
collection:shopProducts:{"page":1,"locale":"fr"} // Page 1, French

// After mutation, all matching caches refresh automatically
await create({ name: 'New Product' })
// → Triggers refetch for all shopProducts queries
```

---


## Related Resources

- [Data Composables](/api-reference/composables/data-composables) - Collection data management
- [Mutation Composables](/api-reference/composables/mutation-composables) - Create, update, delete operations
- [Nuxt Data Fetching](https://nuxt.com/docs/getting-started/data-fetching) - Nuxt's data fetching patterns
- [Vue Reactivity](https://vuejs.org/guide/essentials/reactivity-fundamentals.html) - Understanding Vue reactivity
