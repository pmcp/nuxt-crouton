<template>
  <UCard class="flex flex-col h-full" :ui="{ root: 'rounded-none', body: 'flex-1 overflow-y-auto', footer: 'space-y-4' }">
    <!-- Cart items -->
    <p v-if="items.length === 0" class="text-center text-muted py-8">
      {{ t('sales.cart.empty') }}
    </p>

    <div v-else class="space-y-4">
      <div v-for="group in groupedItems" :key="group.key" class="space-y-2">
        <p
          v-if="group.title"
          class="text-xs font-medium text-muted uppercase tracking-wide px-1"
        >
          {{ group.title }}
        </p>
        <SalesClientOrderLineItem
          v-for="entry in group.entries"
          :key="`${entry.item.product.id}-${entry.index}`"
          :title="entry.item.product.title"
          :price="calculateItemPrice(entry.item) * entry.item.quantity"
          :options="getSelectedOptionLabels(entry.item)"
        >
          <template #actions>
            <UButton
              icon="i-lucide-minus"
              size="xs"
              color="neutral"
              variant="soft"
              square
              @click="$emit('updateQuantity', entry.index, entry.item.quantity - 1)"
            />
            <span :key="entry.item.quantity" class="w-6 text-center text-sm animate-pop">{{ entry.item.quantity }}</span>
            <UButton
              icon="i-lucide-plus"
              size="xs"
              color="neutral"
              variant="soft"
              square
              @click="$emit('updateQuantity', entry.index, entry.item.quantity + 1)"
            />
          </template>
        </SalesClientOrderLineItem>
      </div>
    </div>

    <template #footer>
      <SalesClientCartTotal :count="itemCount" :total="total" />

      <div v-if="clientRequired && !hasClient && items.length > 0" class="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning">
        <UIcon name="i-lucide-alert-triangle" class="text-warning shrink-0" />
        <span class="text-sm text-warning font-medium">{{ t('sales.cart.selectClient') }}</span>
      </div>

      <div class="grid grid-cols-2 gap-2">
        <UButton
          :label="t('sales.cart.clear')"
          color="neutral"
          variant="soft"
          size="lg"
          block
          :disabled="items.length === 0"
          @click="$emit('clear')"
        />
        <UButton
          :label="t('sales.cart.pay')"
          size="lg"
          block
          :disabled="disabled || items.length === 0 || (clientRequired && !hasClient)"
          @click="$emit('checkout')"
        />
      </div>
    </template>
  </UCard>
</template>

<script setup lang="ts">
import type { CartItem, ProductOption, SalesCategory } from '../../types'
import { calculateItemPrice } from '../../composables/usePosOrder'
const { t } = useT()

const props = defineProps<{
  items: CartItem[]
  total: number
  disabled: boolean
  clientRequired?: boolean
  hasClient?: boolean
  /** Categories used to group + order cart items. Optional — without it items render ungrouped. */
  categories?: SalesCategory[]
}>()

const itemCount = computed(() => {
  return props.items.reduce((count, item) => count + item.quantity, 0)
})

interface CartEntry {
  item: CartItem
  /** Original index in props.items — must be used for quantity emits. */
  index: number
}

interface CartGroup {
  key: string
  title: string
  entries: CartEntry[]
}

// Order map for categories so groups follow the admin-defined display order.
const categoryOrder = computed(() => {
  const map = new Map<string, { title: string, order: number }>()
  ;(props.categories || []).forEach((category, idx) => {
    map.set(category.id, {
      title: category.title,
      order: category.displayOrder ?? idx,
    })
  })
  return map
})

// Group cart items by category, then cluster identical products within each group.
// Original indices are preserved on each entry so quantity controls stay correct.
const groupedItems = computed<CartGroup[]>(() => {
  const groups = new Map<string, CartGroup & { order: number }>()

  props.items.forEach((item, index) => {
    const categoryId = item.product.categoryId
    const meta = categoryId ? categoryOrder.value.get(categoryId) : undefined
    const key = categoryId || '__uncategorized__'

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        title: meta?.title ?? '',
        // Known categories sort by their order; unknown/uncategorized go last.
        order: meta ? meta.order : Number.MAX_SAFE_INTEGER,
        entries: [],
      })
    }
    groups.get(key)!.entries.push({ item, index })
  })

  const result = Array.from(groups.values())
  result.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title))

  // Cluster identical products (same title) next to each other within a group,
  // preserving relative insertion order for ties.
  for (const group of result) {
    group.entries.sort((a, b) =>
      a.item.product.title.localeCompare(b.item.product.title) || a.index - b.index
    )
  }

  return result
})

defineEmits<{
  updateQuantity: [index: number, quantity: number]
  remove: [index: number]
  checkout: []
  clear: []
}>()

// Get selected option labels as array
function getSelectedOptionLabels(item: CartItem): string[] {
  if (!item.selectedOptions || !item.product.options) return []
  const optionIds = Array.isArray(item.selectedOptions)
    ? item.selectedOptions
    : [item.selectedOptions]
  return optionIds
    .map(id => item.product.options?.find((o: ProductOption) => o.id === id)?.label)
    .filter((label): label is string => Boolean(label))
}


</script>

<style scoped>
.animate-pop {
  animation: pop 0.15s ease-out;
}

@keyframes pop {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
}
</style>
