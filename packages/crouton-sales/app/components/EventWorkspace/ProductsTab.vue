<script setup lang="ts">
import type { SalesEvent } from '~~/layers/sales/collections/events/types'
import type { SalesProduct } from '~~/layers/sales/collections/products/types'

const props = defineProps<{ event: SalesEvent }>()

const { open } = useCrouton()
const { columns: productsColumns } = useSalesProducts()

const eventQuery = computed(() => ({ eventId: props.event.id }))

const { items: products, pending: productsPending } = await useCollectionQuery('salesProducts', { query: eventQuery })
const { items: categories } = await useCollectionQuery('salesCategories', { query: eventQuery })

const selectedCategoryId = ref<string | null>(null)

const productCountsByCategory = computed(() => {
  const counts: Record<string, number> = {}
  const list = (products.value as SalesProduct[] | null) || []
  for (const p of list) {
    if (p.categoryId) counts[p.categoryId] = (counts[p.categoryId] || 0) + 1
  }
  return counts
})

const filteredProducts = computed(() => {
  const list = (products.value as SalesProduct[] | null) || []
  if (!selectedCategoryId.value) return list
  return list.filter(p => p.categoryId === selectedCategoryId.value)
})

function openCreateProduct() {
  open('create', 'salesProducts', [], 'slideover', { eventId: props.event.id })
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <SalesClientCategoryTabs
        v-model="selectedCategoryId"
        :categories="(categories as any[]) || []"
        :product-counts="productCountsByCategory"
      />
      <UButton color="primary" size="sm" icon="i-lucide-plus" @click="openCreateProduct">
        Add Product
      </UButton>
    </div>
    <div v-if="productsPending" class="p-6 text-center text-muted">
      Loading products...
    </div>
    <CroutonCollection
      v-else-if="filteredProducts && filteredProducts.length > 0"
      layout="table"
      collection="salesProducts"
      :rows="filteredProducts"
      :columns="productsColumns"
      sortable
      :hide-default-columns="{ createdAt: true, updatedAt: true, createdBy: true, updatedBy: true }"
    />
    <div v-else class="p-12 text-center text-muted">
      <UIcon name="i-lucide-package" class="text-4xl mb-2" />
      <p>No products{{ selectedCategoryId ? ' in this category' : '' }}</p>
      <UButton size="sm" variant="outline" class="mt-3" @click="openCreateProduct">
        Add Product
      </UButton>
    </div>
  </div>
</template>
