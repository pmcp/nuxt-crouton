<script setup lang="ts">
import type { DateValue } from '@internationalized/date'
import { CalendarDate, getLocalTimeZone, today } from '@internationalized/date'
import type { Booking, LocationData, SettingsData, SlotItem } from '../types/booking'

interface FilterState {
  statuses: string[]
  locations: string[]
}

interface Props {
  bookings?: Booking[]
  locations?: LocationData[]
  settings?: SettingsData | null
  defaultView?: 'week' | 'month'
  /** Filter state for status and location filters */
  filters?: FilterState
}

const props = withDefaults(defineProps<Props>(), {
  bookings: () => [],
  locations: () => [],
  settings: null,
  defaultView: 'week',
  filters: () => ({ statuses: [], locations: [] }),
})

const emit = defineEmits<{
  'hover': [value: Date | null]
  'dayClick': [value: Date]
  'update:filters': [value: FilterState]
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

// Parse statuses from settings
const parsedStatuses = computed(() => {
  const raw = props.settings?.statuses
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    }
    catch {
      return []
    }
  }
  return []
})

// Check if any filters are active
const hasActiveFilters = computed(() => {
  return props.filters.statuses.length > 0 || props.filters.locations.length > 0
})

// Toggle status filter
function toggleStatus(statusValue: string) {
  const current = [...props.filters.statuses]
  const index = current.indexOf(statusValue)
  if (index === -1) {
    current.push(statusValue)
  }
  else {
    current.splice(index, 1)
  }
  emit('update:filters', { ...props.filters, statuses: current })
}

// Toggle location filter
function toggleLocation(locationId: string) {
  const current = [...props.filters.locations]
  const index = current.indexOf(locationId)
  if (index === -1) {
    current.push(locationId)
  }
  else {
    current.splice(index, 1)
  }
  emit('update:filters', { ...props.filters, locations: current })
}

// Get status color
function getStatusColor(status: { id: string, color?: string }): string {
  return status.color || '#6b7280'
}

// Check if status is selected
function isStatusSelected(statusValue: string): boolean {
  return props.filters.statuses.includes(statusValue)
}

// Check if location is selected
function isLocationSelected(locationId: string): boolean {
  return props.filters.locations.includes(locationId)
}

// Filter bookings based on current filters
const filteredBookings = computed(() => {
  let result = props.bookings

  // Filter by status
  if (props.filters.statuses.length > 0) {
    result = result.filter(booking =>
      props.filters.statuses.includes(booking.status),
    )
  }

  // Filter by location
  if (props.filters.locations.length > 0) {
    result = result.filter(booking =>
      props.filters.locations.includes(booking.location),
    )
  }

  return result
})

// Group bookings by date string (YYYY-MM-DD) - uses filtered bookings
const bookingsByDate = computed(() => {
  const map = new Map<string, Booking[]>()
  for (const booking of filteredBookings.value) {
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
    <!-- Filters and view toggle on one line -->
    <div class="flex items-center gap-2 flex-wrap">
      <!-- Status filters (inline) -->
      <div v-if="parsedStatuses.length > 0" class="flex items-center gap-1">
        <UButton
          v-for="status in parsedStatuses"
          :key="status.id || status.value"
          size="xs"
          :variant="isStatusSelected(status.value || status.id) ? 'solid' : 'soft'"
          :color="isStatusSelected(status.value || status.id) ? 'primary' : 'neutral'"
          @click="toggleStatus(status.value || status.id)"
        >
          <template #leading>
            <span
              class="w-2 h-2 rounded-full"
              :style="{ backgroundColor: getStatusColor(status) }"
            />
          </template>
          {{ status.label }}
        </UButton>
      </div>

      <!-- Location filters (inline) -->
      <div v-if="locations && locations.length > 0" class="flex items-center gap-1">
        <UButton
          v-for="location in locations"
          :key="location.id"
          size="xs"
          :variant="isLocationSelected(location.id) ? 'solid' : 'soft'"
          :color="isLocationSelected(location.id) ? 'primary' : 'neutral'"
          @click="toggleLocation(location.id)"
        >
          <template #leading>
            <span
              class="w-2 h-2 rounded-full"
              :style="{ backgroundColor: location.color || '#3b82f6' }"
            />
          </template>
          {{ location.title }}
        </UButton>
      </div>

      <!-- Spacer to push toggle to right -->
      <div class="flex-1" />

      <!-- View toggle (right aligned) -->
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
