<script setup lang="ts">
import type { LocationData, SlotItem } from '../../types/booking'

interface Props {
  location: LocationData | null
  date: Date | null
  slotId: string | null
  isSubmitting?: boolean
  // Inventory mode
  quantity?: number
}

const props = withDefaults(defineProps<Props>(), {
  isSubmitting: false,
  quantity: 1,
})

const emit = defineEmits<{
  submit: []
}>()

// Format date for display
const formattedDate = computed(() => {
  if (!props.date) return ''
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(props.date)
})

// Check if inventory mode
const isInventoryMode = computed(() => props.location?.inventoryMode === true)

// Get slot label
const selectedSlot = computed<SlotItem | null>(() => {
  if (!props.location?.slots || !props.slotId) return null

  const slots = typeof props.location.slots === 'string'
    ? JSON.parse(props.location.slots)
    : props.location.slots

  if (!Array.isArray(slots)) return null

  return slots.find((s: SlotItem) => s.id === props.slotId) || null
})

const slotLabel = computed(() => {
  if (!selectedSlot.value) return ''
  return selectedSlot.value.label || selectedSlot.value.value || selectedSlot.value.id
})

// Location address
const locationAddress = computed(() => {
  if (!props.location) return ''
  const parts = [
    props.location.street,
    props.location.zip,
    props.location.city,
  ].filter(Boolean)
  return parts.join(', ')
})

const isComplete = computed(() => {
  if (isInventoryMode.value) {
    // Inventory mode: location, date, and quantity required (no slot)
    return !!props.location && !!props.date && props.quantity > 0
  }
  // Slot mode: location, date, and slot required
  return !!props.location && !!props.date && !!props.slotId
})
</script>

<template>
  <div class="space-y-6">
    <div class="text-center mb-8">
      <UIcon name="i-lucide-clipboard-check" class="w-16 h-16 text-primary mx-auto mb-4" />
      <h3 class="text-xl font-semibold text-gray-900">
        Confirm Your Booking
      </h3>
      <p class="text-gray-500 mt-1">
        Please review the details below before submitting
      </p>
    </div>

    <UCard>
      <div class="space-y-4">
        <!-- Location -->
        <div class="flex items-start gap-4">
          <div class="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <UIcon name="i-lucide-map-pin" class="w-5 h-5 text-primary" />
          </div>
          <div>
            <p class="text-sm text-gray-500">
              Location
            </p>
            <p class="font-medium text-gray-900">
              {{ location?.title || 'Not selected' }}
            </p>
            <p v-if="locationAddress" class="text-sm text-gray-500">
              {{ locationAddress }}
            </p>
          </div>
        </div>

        <USeparator />

        <!-- Date -->
        <div class="flex items-start gap-4">
          <div class="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <UIcon name="i-lucide-calendar" class="w-5 h-5 text-primary" />
          </div>
          <div>
            <p class="text-sm text-gray-500">
              Date
            </p>
            <p class="font-medium text-gray-900">
              {{ formattedDate || 'Not selected' }}
            </p>
          </div>
        </div>

        <USeparator />

        <!-- Time Slot (only for slot mode) -->
        <div v-if="!isInventoryMode" class="flex items-start gap-4">
          <div class="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <UIcon name="i-lucide-clock" class="w-5 h-5 text-primary" />
          </div>
          <div>
            <p class="text-sm text-gray-500">
              Time Slot
            </p>
            <p class="font-medium text-gray-900">
              {{ slotLabel || 'Not selected' }}
            </p>
          </div>
        </div>

        <!-- Quantity (only for inventory mode) -->
        <div v-if="isInventoryMode" class="flex items-start gap-4">
          <div class="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <UIcon name="i-lucide-package" class="w-5 h-5 text-primary" />
          </div>
          <div>
            <p class="text-sm text-gray-500">
              Quantity
            </p>
            <p class="font-medium text-gray-900">
              {{ quantity }}
            </p>
          </div>
        </div>
      </div>
    </UCard>

    <div class="flex justify-center pt-4">
      <UButton
        size="lg"
        :loading="isSubmitting"
        :disabled="!isComplete || isSubmitting"
        @click="emit('submit')"
      >
        <UIcon v-if="!isSubmitting" name="i-lucide-check" class="w-5 h-5 mr-2" />
        {{ isSubmitting ? 'Submitting...' : 'Confirm Booking' }}
      </UButton>
    </div>
  </div>
</template>
