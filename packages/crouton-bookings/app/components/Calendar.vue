<script setup lang="ts">
import type { DateValue } from '@internationalized/date'
import { CalendarDate, getLocalTimeZone, today } from '@internationalized/date'
import type { Booking, LocationData, SlotItem } from '../types/booking'

interface Props {
  bookings?: Booking[]
  locations?: LocationData[]
  defaultView?: 'week' | 'month'
}

const props = withDefaults(defineProps<Props>(), {
  bookings: () => [],
  locations: () => [],
  defaultView: 'week',
})

const emit = defineEmits<{
  'hover': [value: Date | null]
  'dayClick': [value: Date]
}>()

const { parseSlotIds, parseLocationSlots } = useBookingSlots()

// View toggle state
const currentView = ref<'week' | 'month'>(props.defaultView)

// For month view: track focused month (no selection)
const monthFocusDate = ref(new CalendarDate(
  new Date().getFullYear(),
  new Date().getMonth() + 1,
  1
))

// Group bookings by date string (YYYY-MM-DD)
const bookingsByDate = computed(() => {
  const map = new Map<string, Booking[]>()
  for (const booking of props.bookings) {
    const date = new Date(booking.date)
    const key = formatDateKey(date)
    if (!map.has(key)) {
      map.set(key, [])
    }
    map.get(key)!.push(booking)
  }
  return map
})

// Format date as YYYY-MM-DD for map key
function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// Get bookings for a specific date
function getBookingsForDate(date: Date): Booking[] {
  const key = formatDateKey(date)
  return bookingsByDate.value.get(key) || []
}

// Get indicators data for a specific date (grouped by location)
function getIndicatorsForDate(date: Date): Array<{
  locationId: string
  locationTitle: string
  color: string
  slots: SlotItem[]
  bookedSlotIds: string[]
}> {
  const dayBookings = getBookingsForDate(date)
  if (dayBookings.length === 0) return []

  // Group by location
  const byLocation = new Map<string, Booking[]>()
  for (const booking of dayBookings) {
    const locId = booking.location
    if (!byLocation.has(locId)) {
      byLocation.set(locId, [])
    }
    byLocation.get(locId)!.push(booking)
  }

  // Build indicators for each location
  const indicators: Array<{
    locationId: string
    locationTitle: string
    color: string
    slots: SlotItem[]
    bookedSlotIds: string[]
  }> = []

  for (const [locationId, locationBookings] of byLocation) {
    // Find location data
    const location = props.locations.find(l => l.id === locationId)
      || locationBookings[0]?.locationData

    if (!location) continue

    // Get all slot IDs booked for this location on this day
    const bookedSlotIds: string[] = []
    for (const booking of locationBookings) {
      bookedSlotIds.push(...parseSlotIds(booking.slot))
    }

    // Get unique slot IDs
    const uniqueBookedSlotIds = [...new Set(bookedSlotIds)]

    indicators.push({
      locationId,
      locationTitle: location.title || 'Unknown',
      color: location.color || '#3b82f6',
      slots: parseLocationSlots(location),
      bookedSlotIds: uniqueBookedSlotIds,
    })
  }

  return indicators
}

// Handle week strip hover
function onWeekHover(date: Date | null) {
  emit('hover', date)
}

// Handle week strip click (for booking creation)
function onWeekDayClick(date: Date) {
  emit('dayClick', date)
}

// Check if a date has bookings
function hasBookings(date: Date): boolean {
  const key = formatDateKey(date)
  return bookingsByDate.value.has(key)
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <!-- View toggle -->
    <div class="flex items-center justify-between">
      <UTabs
        v-model="currentView"
        :items="[
          { label: 'Week', value: 'week' },
          { label: 'Month', value: 'month' },
        ]"
        size="xs"
        :ui="{ trigger: 'cursor-pointer' }"
      />
    </div>

    <!-- Week View -->
    <CroutonBookingsWeekStrip
      v-if="currentView === 'week'"
      size="md"
      @hover="onWeekHover"
      @day-click="onWeekDayClick"
    >
      <template #day="{ jsDate }">
        <div class="flex flex-col gap-0.5 mt-1 min-h-[12px]">
          <template v-for="indicator in getIndicatorsForDate(jsDate)" :key="indicator.locationId">
            <CroutonBookingsSlotIndicator
              :slots="indicator.slots"
              :booked-slot-ids="indicator.bookedSlotIds"
              :color="indicator.color"
              size="xs"
            />
          </template>
        </div>
      </template>
    </CroutonBookingsWeekStrip>

    <!-- Month View -->
    <UCalendar
      v-else
      v-model="monthFocusDate"
      size="sm"
      :week-starts-on="1"
    >
      <template #day="{ day }">
        <div
          class="flex flex-col items-center cursor-pointer hover:bg-elevated rounded px-1 py-0.5 transition-colors"
          @click="emit('dayClick', day.toDate(getLocalTimeZone()))"
        >
          <span>{{ day.day }}</span>
          <div class="flex flex-col gap-0.5 mt-0.5 min-h-[8px]">
            <template v-for="indicator in getIndicatorsForDate(day.toDate(getLocalTimeZone()))" :key="indicator.locationId">
              <CroutonBookingsSlotIndicator
                :slots="indicator.slots"
                :booked-slot-ids="indicator.bookedSlotIds"
                :color="indicator.color"
                size="xs"
              />
            </template>
          </div>
        </div>
      </template>
    </UCalendar>
  </div>
</template>
