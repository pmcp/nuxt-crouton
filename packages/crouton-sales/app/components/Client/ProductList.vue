<template>
  <div v-if="products.length === 0" class="text-center text-muted py-8">
    No products found
  </div>
  <div v-else ref="containerRef" class="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3">
    <UCard
      v-for="product in products"
      :key="product.id"
      variant="soft"
      class="cursor-pointer"
      :ui="{ body: 'p-4' }"
      @click="handleProductClick(product)"
    >
      <!-- Product header -->
      <div class="flex justify-between items-center gap-2">
        <div class="font-medium">{{ product.title }}</div>
        <div class="flex items-center gap-2 shrink-0">
          <span class="text-muted">${{ Number(product.price).toFixed(2) }}</span>
          <UIcon v-if="hasOptions(product)" name="i-lucide-chevron-down" class="text-muted size-4 transition-transform" :class="{ 'rotate-180': activeProductId === product.id }" />
        </div>
      </div>

      <!-- Options (inside card) -->
      <Transition name="slide">
        <div
          v-if="activeProductId === product.id && hasOptions(product)"
          class="mt-4 pt-4 border-t border-default space-y-3"
          @click.stop
        >
          <!-- Multi-select mode -->
          <template v-if="isMultiSelect(product)">
            <UCheckbox
              v-for="option in getOptions(product)"
              :key="option.id"
              :model-value="isOptionSelected(product.id, option.id)"
              @update:model-value="toggleOption(product.id, option.id)"
            >
              <template #label>
                <span class="flex items-center justify-between w-full">
                  <span>{{ option.label }}</span>
                  <span v-if="option.priceModifier > 0" class="text-xs text-muted ml-2">+${{ option.priceModifier.toFixed(2) }}</span>
                </span>
              </template>
            </UCheckbox>
            <UButton
              block
              size="sm"
              color="primary"
              class="mt-3"
              @click="confirmMultiOptions(product)"
            >
              Add to Cart
            </UButton>
          </template>

          <!-- Single-select mode -->
          <div v-else class="space-y-2">
            <UButton
              v-for="option in getOptions(product)"
              :key="option.id"
              :label="option.label"
              block
              size="md"
              color="primary"
              variant="ghost"
              @click="selectOption(product, option.id)"
            >
              <template #trailing>
                <span v-if="option.priceModifier > 0" class="text-xs opacity-70 ms-auto">+${{ option.priceModifier.toFixed(2) }}</span>
                <UIcon name="i-lucide-plus" class="size-4" :class="{ 'ms-auto': !option.priceModifier }" />
              </template>
            </UButton>
          </div>
        </div>
      </Transition>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { SalesProduct, ProductOption } from '../../types'

defineProps<{
  products: SalesProduct[]
}>()

const emit = defineEmits<{
  select: [product: SalesProduct, selectedOption?: string | string[]]
}>()

const containerRef = ref<HTMLElement | null>(null)
const activeProductId = ref<string | null>(null)
const selectedOptionIds = ref<Map<string, string[]>>(new Map())

function hasOptions(product: SalesProduct): boolean {
  return !!product.hasOptions && Array.isArray(product.options) && product.options.length > 0
}

function isMultiSelect(product: SalesProduct): boolean {
  return !!product.multipleOptionsAllowed
}

function getOptions(product: SalesProduct): ProductOption[] {
  return (product.options || []) as ProductOption[]
}

function isOptionSelected(productId: string, optionId: string): boolean {
  const selected = selectedOptionIds.value.get(productId)
  return selected?.includes(optionId) ?? false
}

function toggleOption(productId: string, optionId: string) {
  const current = selectedOptionIds.value.get(productId) || []
  if (current.includes(optionId)) {
    selectedOptionIds.value.set(productId, current.filter(id => id !== optionId))
  }
  else {
    selectedOptionIds.value.set(productId, [...current, optionId])
  }
}

function confirmMultiOptions(product: SalesProduct) {
  const selected = selectedOptionIds.value.get(product.id) || []
  emit('select', product, selected.length > 0 ? selected : undefined)
  selectedOptionIds.value.delete(product.id)
}

function handleProductClick(product: SalesProduct) {
  if (hasOptions(product)) {
    // Clear previous selection if switching products
    if (activeProductId.value && activeProductId.value !== product.id) {
      selectedOptionIds.value.delete(activeProductId.value)
    }
    // Toggle expansion/active state
    activeProductId.value = activeProductId.value === product.id ? null : product.id
  }
  else {
    // No options, add directly
    emit('select', product)
  }
}

function selectOption(product: SalesProduct, optionId: string) {
  emit('select', product, optionId)
}

// Close on click outside
onClickOutside(containerRef, () => {
  if (activeProductId.value) {
    selectedOptionIds.value.delete(activeProductId.value)
  }
  activeProductId.value = null
})
</script>

<style scoped>
.slide-enter-active {
  transition: opacity 150ms ease-out, transform 150ms ease-out;
}

.slide-leave-active {
  transition: opacity 100ms ease-in, transform 100ms ease-in;
}

.slide-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}

.slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
