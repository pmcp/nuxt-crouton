<script setup lang="ts">
import type { DateValue } from '@internationalized/date'
import { fromDate, toCalendarDate, getLocalTimeZone } from '@internationalized/date'
import type { SlotOption } from '../../composables/useBookingAvailability'

interface Props {
  locationId: string | null
  locationSlots: SlotOption[] | null | undefined
  modelValue?: Date | null
}

const props = withDefaults(defineProps<Props>(), {
  locationId: null,
  locationSlots: () => [],
  modelValue: null
})

const emit = defineEmits<{
  'update:modelValue': [value: Date | null]
  'availableSlotsChanged': [slots: SlotOption[]]
}>()

// Refs for the composable
const locationIdRef = computed(() => props.locationId)
const locationSlotsRef = computed(() => props.locationSlots)

const {
  loading,
  fetchAvailability,
  isDateFullyBooked,
  getBookedSlotsForDate,
  getAvailableSlotsForDate
} = useBookingAvailability(locationIdRef, locationSlotsRef)

// Slots formatted for calendar indicator (excludes 'all-day')
const calendarSlots = computed(() => {
  if (!props.locationSlots) return []
  return props.locationSlots
    .filter(s => s.id !== 'all-day')
    .map(s => ({
      id: s.id,
      label: s.label || s.id,
      color: s.color || '#94a3b8',
    }))
})

// Internal calendar value (DateValue format)
const internalValue = computed({
  get: () => {
    if (!props.modelValue) return undefined
    const zonedDateTime = fromDate(props.modelValue, getLocalTimeZone())
    return toCalendarDate(zonedDateTime)
  },
  set: (value: DateValue | undefined) => {
    if (!value) {
      emit('update:modelValue', null)
      emit('availableSlotsChanged', [])
      return
    }
    const date = value.toDate(getLocalTimeZone())
    emit('update:modelValue', date)
    emit('availableSlotsChanged', getAvailableSlotsForDate(date))
  }
})

// Track current visible month for fetching availability
const currentPlaceholder = ref<DateValue | undefined>()

// Fetch availability when location changes or month changes
watch([locationIdRef, currentPlaceholder], async () => {
  if (!props.locationId) return

  // Calculate date range for current visible month(s)
  const now = new Date()
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1)
  const endDate = new Date(now.getFullYear(), now.getMonth() + 3, 0) // 3 months ahead

  await fetchAvailability(startDate, endDate)
}, { immediate: true })

// Check if a date should be disabled (fully booked)
function isDateDisabled(date: DateValue): boolean {
  return isDateFullyBooked(date)
}
</script>

<template>
  <div class="calendar-with-availability">
    <div v-if="!locationId" class="text-sm text-muted p-4 text-center">
      Select a location to view availability
    </div>

    <div v-else-if="loading" class="flex items-center justify-center p-4">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin mr-2" />
      <span class="text-sm text-muted">Loading availability...</span>
    </div>

    <UCalendar
      v-else
      v-model="internalValue"
      :is-date-disabled="isDateDisabled"
      @update:placeholder="currentPlaceholder = $event"
    >
      <template #day="{ day }">
        <div class="flex flex-col items-center">
          <span>{{ day.day }}</span>
          <CroutonBookingSlotIndicator
            v-if="calendarSlots.length > 0 && getBookedSlotsForDate(day).length > 0"
            :slots="calendarSlots"
            :booked-slot-ids="getBookedSlotsForDate(day)"
            size="xs"
          />
        </div>
      </template>
    </UCalendar>

    <!-- Legend -->
    <div class="flex items-center gap-4 mt-3 text-xs text-muted justify-center">
      <div class="flex items-center gap-1.5">
        <span class="w-2 h-2 rounded-full bg-primary" />
        <span>Booked</span>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="w-2 h-2 rounded-full bg-gray-100 dark:bg-gray-800" />
        <span>Available</span>
      </div>
    </div>
  </div>
</template>
