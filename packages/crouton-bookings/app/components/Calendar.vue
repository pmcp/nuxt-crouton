<script setup lang="ts">
import type { DateValue } from '@internationalized/date'
import { CalendarDate, getLocalTimeZone, today } from '@internationalized/date'
import type { Booking, LocationData, SettingsData, SlotItem } from '../types/booking'

interface FilterState {
  statuses: string[]
  locations: string[]
  showCancelled?: boolean
}

interface Props {
  bookings?: Booking[]
  locations?: LocationData[]
  settings?: SettingsData | null
  defaultView?: 'week' | 'month'
  /** Filter state for status and location filters */
  filters?: FilterState
  /** Date to highlight (from external hover, e.g., list item hover) */
  highlightedDate?: Date | null
}

const props = withDefaults(defineProps<Props>(), {
  bookings: () => [],
  locations: () => [],
  settings: null,
  defaultView: 'week',
  filters: () => ({ statuses: [], locations: [], showCancelled: false }),
  highlightedDate: null,
})

const emit = defineEmits<{
  'hover': [value: Date | null]
  'dayClick': [value: Date]
  'update:filters': [value: FilterState]
}>()

const { parseSlotIds, parseLocationSlots } = useBookingSlots()

// Ref for WeekStrip control
const weekStripRef = ref<{ goToDate: (date: Date) => void, goToToday: () => void } | null>(null)

// Navigate week strip to a specific date
function goToDate(date: Date) {
  weekStripRef.value?.goToDate(date)
}

// Expose methods for parent control
defineExpose({
  goToDate,
})

// Map visibility state
const showMap = ref(false)

// View toggle state
const currentView = ref<'week' | 'month'>(props.defaultView)

// Parse GeoJSON coordinates from location data
// Returns [lng, lat] or null if no valid coordinates
function parseLocationCoordinates(location: LocationData): [number, number] | null {
  if (!location.location) return null

  try {
    // Handle GeoJSON Point format: { "type": "Point", "coordinates": [lng, lat] }
    const geo = typeof location.location === 'string'
      ? JSON.parse(location.location)
      : location.location

    if (geo?.type === 'Point' && Array.isArray(geo.coordinates) && geo.coordinates.length >= 2) {
      return [geo.coordinates[0], geo.coordinates[1]]
    }

    // Handle simple [lng, lat] array
    if (Array.isArray(geo) && geo.length >= 2) {
      return [geo[0], geo[1]]
    }

    return null
  }
  catch {
    return null
  }
}

// Get locations with valid coordinates for the map
const locationsWithCoordinates = computed(() => {
  return props.locations
    .map(location => ({
      ...location,
      coordinates: parseLocationCoordinates(location),
    }))
    .filter(loc => loc.coordinates !== null) as Array<LocationData & { coordinates: [number, number] }>
})

// Check if we have any locations with coordinates to show map
const hasLocationsWithCoordinates = computed(() => locationsWithCoordinates.value.length > 0)

// Calculate map center from all locations with coordinates
const mapCenter = computed<[number, number]>(() => {
  const locs = locationsWithCoordinates.value
  if (locs.length === 0) return [4.9041, 52.3676] // Default to Amsterdam

  // Calculate centroid of all locations
  const sumLng = locs.reduce((sum, loc) => sum + loc.coordinates[0], 0)
  const sumLat = locs.reduce((sum, loc) => sum + loc.coordinates[1], 0)

  return [sumLng / locs.length, sumLat / locs.length]
})

// Handle marker click - toggle location filter
function onMarkerClick(locationId: string) {
  toggleLocation(locationId)
}

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
  return props.filters.statuses.length > 0 || props.filters.locations.length > 0 || props.filters.showCancelled
})

// Computed for show cancelled toggle
const showCancelled = computed({
  get: () => props.filters.showCancelled ?? false,
  set: (value: boolean) => {
    emit('update:filters', { ...props.filters, showCancelled: value })
  },
})

// Toggle status filter (kept for backward compatibility)
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

  // Filter cancelled bookings based on toggle
  // By default (showCancelled = false), hide cancelled bookings
  if (!props.filters.showCancelled) {
    result = result.filter(booking => booking.status !== 'cancelled')
  }

  // Legacy: Filter by specific statuses if provided (for backward compatibility)
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
  <div class="flex flex-col gap-3">
    <!-- Location filter cards -->
    <div v-if="locations && locations.length > 0" class="flex flex-wrap gap-2">
      <button
        v-for="location in locations"
        :key="location.id"
        class="group relative flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200"
        :class="[
          isLocationSelected(location.id)
            ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
            : 'border-default bg-default hover:border-muted hover:bg-elevated',
        ]"
        @click="toggleLocation(location.id)"
      >
        <!-- Color indicator bar -->
        <div
          class="absolute left-0 top-2 bottom-2 w-1 rounded-full transition-opacity"
          :style="{ backgroundColor: location.color || '#3b82f6' }"
          :class="isLocationSelected(location.id) ? 'opacity-100' : 'opacity-50 group-hover:opacity-75'"
        />

        <!-- Location icon -->
        <div
          class="ml-1 flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center transition-colors"
          :class="isLocationSelected(location.id) ? 'bg-primary/20' : 'bg-muted'"
        >
          <UIcon
            name="i-lucide-map-pin"
            class="w-4 h-4"
            :class="isLocationSelected(location.id) ? 'text-primary' : 'text-muted'"
          />
        </div>

        <!-- Location info -->
        <div class="flex flex-col items-start min-w-0">
          <span
            class="text-sm font-medium truncate max-w-[120px]"
            :class="isLocationSelected(location.id) ? 'text-primary' : 'text-default'"
          >
            {{ location.title }}
          </span>
          <span v-if="location.city" class="text-xs text-muted truncate max-w-[120px]">
            {{ location.city }}
          </span>
        </div>

        <!-- Selection indicator -->
        <UIcon
          v-if="isLocationSelected(location.id)"
          name="i-lucide-check"
          class="w-4 h-4 text-primary ml-1 flex-shrink-0"
        />
      </button>

      <!-- Map toggle button -->
      <button
        v-if="hasLocationsWithCoordinates"
        class="group flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200"
        :class="[
          showMap
            ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
            : 'border-default bg-default hover:border-muted hover:bg-elevated',
        ]"
        @click="showMap = !showMap"
      >
        <UIcon
          name="i-lucide-map"
          class="w-4 h-4"
          :class="showMap ? 'text-primary' : 'text-muted'"
        />
        <span
          class="text-sm font-medium"
          :class="showMap ? 'text-primary' : 'text-default'"
        >
          Map
        </span>
        <UIcon
          :name="showMap ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
          class="w-3 h-3"
          :class="showMap ? 'text-primary' : 'text-muted'"
        />
      </button>
    </div>

    <!-- Map section (collapsible) -->
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 max-h-0"
      enter-to-class="opacity-100 max-h-[300px]"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 max-h-[300px]"
      leave-to-class="opacity-0 max-h-0"
    >
      <div v-if="showMap && hasLocationsWithCoordinates" class="overflow-hidden rounded-lg">
        <CroutonMapsMap
          :center="mapCenter"
          :zoom="12"
          height="250px"
          fly-to-on-center-change
        >
          <template #default="{ map }">
            <CroutonMapsMarker
              v-for="location in locationsWithCoordinates"
              :key="location.id"
              :map="map"
              :position="location.coordinates"
              :color="location.color || '#3b82f6'"
              :popup-content="`<div class='p-2'><strong>${location.title}</strong>${location.city ? `<br><span class='text-gray-500 text-sm'>${location.city}</span>` : ''}</div>`"
              @click="onMarkerClick(location.id)"
            />
          </template>
        </CroutonMapsMap>
      </div>
    </Transition>

    <!-- Controls row: Show cancelled toggle + View toggle -->
    <div class="flex items-center gap-3">
      <!-- Show cancelled toggle -->
      <USwitch
        v-model="showCancelled"
        size="xs"
        color="error"
        label="Show cancelled"
      />

      <!-- Spacer to push view toggle to right -->
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
      ref="weekStripRef"
      size="md"
      :highlighted-date="highlightedDate"
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
          class="group relative flex flex-col items-center cursor-pointer hover:bg-elevated rounded px-1 py-0.5 transition-colors"
          @click="emit('dayClick', day.toDate(getLocalTimeZone()))"
        >
          <!-- Add booking indicator (shows on hover) -->
          <div class="absolute -top-0.5 -right-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <UIcon name="i-lucide-plus" class="size-2.5 text-primary" />
          </div>

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
