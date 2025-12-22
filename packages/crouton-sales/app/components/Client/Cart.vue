<template>
  <UCard class="flex flex-col h-full" :ui="{ root: 'rounded-none', body: 'flex-1 overflow-y-auto', footer: 'space-y-4' }">
    <!-- Cart items -->
    <p v-if="items.length === 0" class="text-center text-muted py-8">
      Cart is empty
    </p>

    <div v-else class="space-y-2">
      <div
        v-for="(item, index) in items"
        :key="`${item.product.id}-${index}`"
        class="flex items-center gap-3 py-2"
      >
        <div class="flex-1 min-w-0 space-y-1">
          <p class="font-medium truncate">{{ item.product.title }}</p>
          <p
            v-for="option in getSelectedOptionLabels(item)"
            :key="option"
            class="text-xs text-muted truncate pl-2"
          >
            {{ option }}
          </p>
        </div>

        <span :key="calculateItemPrice(item) * item.quantity" class="w-16 text-right text-sm text-muted shrink-0 animate-pop">${{ (calculateItemPrice(item) * item.quantity).toFixed(2) }}</span>

        <div class="flex items-center gap-1 shrink-0">
          <UButton
            icon="i-lucide-minus"
            size="xs"
            color="neutral"
            variant="soft"
            square
            @click="$emit('updateQuantity', index, item.quantity - 1)"
          />
          <span :key="item.quantity" class="w-6 text-center text-sm animate-pop">{{ item.quantity }}</span>
          <UButton
            icon="i-lucide-plus"
            size="xs"
            color="neutral"
            variant="soft"
            square
            @click="$emit('updateQuantity', index, item.quantity + 1)"
          />
        </div>
      </div>
    </div>

    <template #footer>
      <SalesClientCartTotal :count="itemCount" :total="total" />

      <div v-if="clientRequired && !hasClient && items.length > 0" class="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning">
        <UIcon name="i-lucide-alert-triangle" class="text-warning shrink-0" />
        <span class="text-sm text-warning font-medium">Please select a client to proceed</span>
      </div>

      <div class="grid grid-cols-2 gap-2">
        <UButton
          label="Clear"
          color="neutral"
          variant="soft"
          size="lg"
          block
          :disabled="items.length === 0"
          @click="$emit('clear')"
        />
        <UButton
          label="Pay"
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
import type { CartItem, ProductOption } from '../../types'

const props = defineProps<{
  items: CartItem[]
  total: number
  disabled: boolean
  clientRequired?: boolean
  hasClient?: boolean
}>()

const itemCount = computed(() => {
  return props.items.reduce((count, item) => count + item.quantity, 0)
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

// Calculate item price including option modifiers
function calculateItemPrice(item: CartItem): number {
  let price = Number(item.product.price)
  if (item.selectedOptions && item.product.options) {
    const optionIds = Array.isArray(item.selectedOptions)
      ? item.selectedOptions
      : [item.selectedOptions]
    for (const id of optionIds) {
      const option = item.product.options.find((o: ProductOption) => o.id === id)
      if (option?.priceModifier) {
        price += option.priceModifier
      }
    }
  }
  return price
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
