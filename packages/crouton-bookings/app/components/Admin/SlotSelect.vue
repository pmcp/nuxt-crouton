<script setup lang="ts">
import type { SlotOption } from '../../composables/useBookingAvailability'

interface Props {
  modelValue: string[] | null
  locationId: string | null
  availableSlots: SlotOption[]
  selectedDate: Date | null
  /** Location color to use for slot indicators */
  color?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: null,
  locationId: null,
  availableSlots: () => [],
  selectedDate: null,
  color: '#3b82f6'
})

const emit = defineEmits<{
  'update:modelValue': [value: string[] | null]
}>()

// Local value for v-model
const localValue = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// Show message based on state
const showMessage = computed(() => {
  if (!props.locationId) return 'Select a location first'
  if (!props.selectedDate) return 'Select a date first'
  if (props.availableSlots.length === 0) return 'No slots available for this date'
  return null
})

// Format slots for display
const slotOptions = computed(() =>
  props.availableSlots.map((slot, index) => ({
    value: slot.id,
    label: slot.label,
    index
  }))
)

// Handle single selection (convert to array for API)
const selectedSlot = computed({
  get: () => localValue.value?.[0] || null,
  set: (value: string | null) => {
    localValue.value = value ? [value] : null
  }
})
</script>

<template>
  <div>
    <div v-if="showMessage" class="text-sm text-muted py-2">
      {{ showMessage }}
    </div>

    <div v-else class="space-y-2">
      <!-- Slot cards for selection -->
      <div class="grid grid-cols-2 gap-2">
        <UCard
          v-for="slot in slotOptions"
          :key="slot.value"
          :class="[
            'cursor-pointer transition-all',
            selectedSlot === slot.value
              ? 'ring-2 ring-primary bg-primary/5'
              : 'hover:bg-muted/50'
          ]"
          :ui="{ body: 'p-3' }"
          @click="selectedSlot = slot.value"
        >
          <div class="flex items-center gap-2">
            <CroutonBookingSlotSingleIndicator
              :total-slots="slotOptions.length"
              :position="slot.index"
              :color="color"
              :label="slot.label"
              size="sm"
            />
            <span :class="selectedSlot === slot.value ? 'font-medium' : ''">
              {{ slot.label }}
            </span>
          </div>
        </UCard>
      </div>
    </div>
  </div>
</template>
