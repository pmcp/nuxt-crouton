<script setup lang="ts">
import type { Booking, SlotItem } from '../types/booking'

interface Props {
  booking: Booking
  highlighted?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  highlighted: false,
})

const { parseSlotIds, parseLocationSlots, getSlotLabel } = useBookingSlots()
const { getGroupLabel } = useBookingOptions()

// Is this booking cancelled?
const isCancelled = computed(() => props.booking.status === 'cancelled')

// Parse slot IDs from booking
const bookedSlotIds = computed(() => parseSlotIds(props.booking.slot))

// Parse location slots
const locationSlots = computed<SlotItem[]>(() => {
  return parseLocationSlots(props.booking.locationData)
})

// Get booked slot labels for display
const slotLabel = computed(() => {
  const slotIds = bookedSlotIds.value
  if (slotIds.length === 0) return ''
  const labels = slotIds.map(id => getSlotLabel(id, locationSlots.value))
  return labels.join(', ')
})

// Location color for slot indicator
const locationColor = computed(() => {
  return props.booking.locationData?.color || '#3b82f6'
})

// Is this an inventory mode booking?
const isInventoryMode = computed(() => {
  return props.booking.locationData?.inventoryMode === true
})
</script>

<template>
  <UCard
    variant="soft"
    :ui="{
      root: [
        'transition-all duration-200',
        isCancelled ? 'opacity-60' : '',
        highlighted ? 'ring-1 ring-primary/30 bg-primary/[0.02]' : ''
      ],
      body: 'p-2'
    }"
  >
    <div class="flex items-center gap-3">
      <!-- Date badge -->
      <CroutonBookingsDateBadge
        :date="booking.date"
        :variant="isCancelled ? 'error' : 'primary'"
        :highlighted="highlighted"
        :highlight-color="locationColor"
      />

      <!-- Content -->
      <div class="flex-1 flex flex-col gap-1 min-w-0">
        <!-- Location title -->
        <span
          class="text-sm font-medium truncate"
          :class="{ 'line-through text-muted': isCancelled }"
        >
          {{ booking.locationData?.title || 'Unknown Location' }}
        </span>

        <!-- Slot indicator or inventory -->
        <div class="flex items-center gap-2">
          <template v-if="isInventoryMode">
            <div class="flex items-center gap-1.5">
              <UIcon name="i-lucide-box" class="size-3 text-primary" />
              <span class="text-xs text-muted">{{ slotLabel }}</span>
            </div>
          </template>
          <template v-else>
            <CroutonBookingsSlotIndicator
              v-if="locationSlots.length > 0"
              :slots="locationSlots"
              :booked-slot-ids="bookedSlotIds"
              :color="isCancelled ? '#9ca3af' : locationColor"
              size="sm"
            />
            <span class="text-xs text-muted">{{ slotLabel }}</span>
          </template>
        </div>

        <!-- Group badge if present -->
        <UBadge
          v-if="booking.group"
          color="neutral"
          variant="subtle"
          size="xs"
          class="mt-0.5 w-fit"
        >
          {{ getGroupLabel(booking.group) }}
        </UBadge>
      </div>
    </div>
  </UCard>
</template>
