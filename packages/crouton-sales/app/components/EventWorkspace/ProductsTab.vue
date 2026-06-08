<script setup lang="ts">
import { useSortable } from '@vueuse/integrations/useSortable'
import type { SalesEvent } from '~~/layers/sales/collections/events/types'
import type { SalesProduct } from '~~/layers/sales/collections/products/types'

const props = defineProps<{ event: SalesEvent }>()

const { t } = useT()
const { open } = useCrouton()

const eventQuery = computed(() => ({ eventId: props.event.id }))

const { items: products, pending: productsPending } = await useCollectionQuery('salesProducts', { query: eventQuery })
const { items: categories } = await useCollectionQuery('salesCategories', { query: eventQuery })

const selectedCategoryId = ref<string | null>(null)

// sortOrder is a nullable integer — treat null/undefined as 0
const orderOf = (p: SalesProduct) => Number(p.sortOrder ?? 0) || 0

const productCountsByCategory = computed(() => {
  const counts: Record<string, number> = {}
  const list = (products.value as SalesProduct[] | null) || []
  for (const p of list) {
    if (p.categoryId) counts[p.categoryId] = (counts[p.categoryId] || 0) + 1
  }
  return counts
})

const filteredProducts = computed(() => {
  const list = [...((products.value as SalesProduct[] | null) || [])]
  list.sort((a, b) => orderOf(a) - orderOf(b) || a.title.localeCompare(b.title))
  if (!selectedCategoryId.value) return list
  return list.filter(p => p.categoryId === selectedCategoryId.value)
})

// Local mutable copy that useSortable reorders in place on drop.
const orderedProducts = ref<SalesProduct[]>([])
watch(filteredProducts, (v) => { orderedProducts.value = [...v] }, { immediate: true })

const listEl = ref<HTMLElement | null>(null)
const { update } = useCollectionMutation('salesProducts')
const reordering = ref(false)

// Persist sortOrder = visual index for every item whose position changed.
async function persistOrder() {
  if (reordering.value) return
  reordering.value = true
  try {
    const writes = orderedProducts.value
      .map((p, index) => (orderOf(p) === index ? null : update(p.id, { sortOrder: index })))
      .filter(Boolean) as Promise<unknown>[]
    await Promise.all(writes)
  }
  finally {
    reordering.value = false
  }
}

// useSortable mutates orderedProducts directly on drop; onEnd fires after.
if (import.meta.client) {
  useSortable(listEl, orderedProducts, {
    animation: 150,
    handle: '.drag-handle',
    ghostClass: 'opacity-50',
    chosenClass: 'bg-elevated',
    onEnd: (evt: { oldIndex?: number, newIndex?: number }) => {
      if (evt.oldIndex !== evt.newIndex) persistOrder()
    }
  })
}

const categoryName = (id?: string) =>
  ((categories.value as { id: string, title: string }[] | null) || []).find(c => c.id === id)?.title

const priceFormatter = new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR' })
const formatPrice = (price: number) => priceFormatter.format(Number(price) || 0)

function openCreateProduct() {
  open('create', 'salesProducts', [], 'slideover', { eventId: props.event.id })
}

function openEditProduct(id: string) {
  open('update', 'salesProducts', [id], 'slideover')
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
        {{ t('sales.workspace.addProduct') }}
      </UButton>
    </div>

    <div v-if="productsPending" class="p-6 text-center text-muted">
      {{ t('sales.workspace.loadingProducts') }}
    </div>

    <ul
      v-else-if="orderedProducts.length > 0"
      ref="listEl"
      role="list"
      class="divide-y divide-default rounded-lg border border-default overflow-hidden"
    >
      <li
        v-for="product in orderedProducts"
        :key="product.id"
        class="group flex items-center gap-3 px-3 py-2.5 bg-default hover:bg-elevated/50 transition-colors cursor-pointer"
        @click="openEditProduct(product.id)"
      >
        <UIcon
          name="i-lucide-grip-vertical"
          class="drag-handle shrink-0 text-dimmed cursor-grab active:cursor-grabbing opacity-40 group-hover:opacity-100 transition-opacity"
          @click.stop
        />
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <span class="font-medium truncate">{{ product.title }}</span>
            <UBadge v-if="product.isActive === false" color="neutral" variant="subtle" size="xs">
              {{ t('sales.common.inactive') }}
            </UBadge>
            <UBadge v-if="product.hasOptions" color="primary" variant="subtle" size="xs">
              {{ t('sales.form.options') }}
            </UBadge>
          </div>
          <p
            v-if="!selectedCategoryId && categoryName(product.categoryId)"
            class="text-xs text-muted truncate"
          >
            {{ categoryName(product.categoryId) }}
          </p>
        </div>
        <span class="shrink-0 font-medium tabular-nums">{{ formatPrice(product.price) }}</span>
        <UIcon
          name="i-lucide-chevron-right"
          class="shrink-0 text-dimmed opacity-0 group-hover:opacity-100 transition-opacity"
        />
      </li>
    </ul>

    <div v-else class="p-12 text-center text-muted">
      <UIcon name="i-lucide-package" class="text-4xl mb-2" />
      <p>{{ t('sales.workspace.noProducts') }}{{ selectedCategoryId ? t('sales.workspace.inThisCategory') : '' }}</p>
      <UButton size="sm" variant="outline" class="mt-3" @click="openCreateProduct">
        {{ t('sales.workspace.addProduct') }}
      </UButton>
    </div>
  </div>
</template>
