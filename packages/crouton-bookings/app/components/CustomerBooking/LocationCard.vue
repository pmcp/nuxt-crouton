<script setup lang="ts">
import type { LocationData } from '../../types/booking'

interface Props {
  location: LocationData
  selected?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  selected: false,
})

const emit = defineEmits<{
  select: [location: LocationData]
}>()

// Get localized location title with fallbacks
function getLocationTitle(location: LocationData): string {
  const { locale } = useI18n()
  const translations = location.translations as Record<string, { title?: string }> | undefined

  return translations?.[locale.value]?.title
    || translations?.en?.title
    || location.title
    || 'Untitled'
}

const fullAddress = computed(() => {
  const parts = [
    props.location.street,
    props.location.zip,
    props.location.city,
  ].filter(Boolean)
  return parts.join(', ')
})

const slotCount = computed(() => {
  if (!props.location.slots) return 0
  const slots = typeof props.location.slots === 'string'
    ? JSON.parse(props.location.slots)
    : props.location.slots
  return Array.isArray(slots) ? slots.length : 0
})

// Inventory mode display
const isInventoryMode = computed(() => props.location.inventoryMode === true)
const availableQuantity = computed(() => props.location.quantity || 0)
</script>

<template>
  <UCard
    :ui="{
      root: [
        'cursor-pointer transition-all duration-200 hover:shadow-md',
        selected ? 'ring-2 ring-primary bg-primary/5' : 'hover:ring-1 hover:ring-gray-300',
      ].join(' '),
    }"
    @click="emit('select', location)"
  >
    <div class="flex items-start gap-4">
      <div
        class="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center"
        :class="selected ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'"
      >
        <UIcon name="i-lucide-map-pin" class="w-6 h-6" />
      </div>

      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <h3 class="font-semibold text-gray-900 truncate">
            {{ getLocationTitle(location) }}
          </h3>
          <UIcon
            v-if="selected"
            name="i-lucide-check-circle"
            class="w-5 h-5 text-primary flex-shrink-0"
          />
        </div>

        <p v-if="fullAddress" class="text-sm text-gray-500 mt-1 truncate">
          {{ fullAddress }}
        </p>

        <!-- Show different info for inventory vs slot mode -->
        <p v-if="isInventoryMode && availableQuantity > 0" class="text-xs text-gray-400 mt-2">
          {{ availableQuantity }} available
        </p>
        <p v-else-if="slotCount > 0" class="text-xs text-gray-400 mt-2">
          {{ slotCount }} time slot{{ slotCount === 1 ? '' : 's' }} available
        </p>
      </div>
    </div>
  </UCard>
</template>
