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
  /** Date currently being used for booking creation */
  creatingAtDate?: Date | null
}

const props = withDefaults(defineProps<Props>(), {
  bookings: () => [],
  locations: () => [],
  settings: null,
  defaultView: 'week',
  filters: () => ({ statuses: [], locations: [], showCancelled: false }),
  highlightedDate: null,
  creatingAtDate: null,
})

const emit = defineEmits<{
  'hover': [value: Date | null]
  'dayClick': [value: Date]
  'update:filters': [value: FilterState]
  'hoverBooking': [bookingId: string | null]
}>()

const { parseSlotIds, parseLocationSlots } = useBookingSlots()

// Get localized location title with fallbacks
function getLocationTitle(location: LocationData): string {
  const { locale } = useI18n()
  const translations = location.translations as Record<string, { title?: string }> | undefined

  return translations?.[locale.value]?.title
    || translations?.en?.title
    || location.title
    || 'Untitled'
}

// Ref for WeekStrip control
const weekStripRef = ref<{ goToDate: (date: Date) => void, goToToday: () => void } | null>(null)

// Navigate to a specific date (works for both week and month view)
function goToDate(date: Date) {
  if (currentView.value === 'week') {
    weekStripRef.value?.goToDate(date)
  } else {
    // Update month view to show the month containing this date
    monthFocusDate.value = new CalendarDate(
      date.getFullYear(),
      date.getMonth() + 1,
      date.getDate(),
    )
  }
}

// Navigate to today
function goToToday() {
  const todayDate = today(getLocalTimeZone())
  const jsDate = todayDate.toDate(getLocalTimeZone())
  goToDate(jsDate)
  // Also highlight today as if it was clicked
  emit('hover', jsDate)
}

// Handle tab change - "today" triggers navigation, others change view
function onTabChange(value: string) {
  if (value === 'today') {
    goToToday()
  } else {
    currentView.value = value as 'week' | 'month'
  }
}

// Expose methods for parent control
defineExpose({
  goToDate,
})

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
  cancelledSlotIds: string[]
  bookings: Booking[]
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
    cancelledSlotIds: string[]
    bookings: Booking[]
  }> = []

  for (const [locationId, locationBookings] of byLocation) {
    // Find location data
    const location = props.locations.find(l => l.id === locationId)
      || locationBookings[0]?.locationData

    if (!location) continue

    // Get all slot IDs booked for this location on this day
    const bookedSlotIds: string[] = []
    const cancelledSlotIds: string[] = []
    const locationSlots = parseLocationSlots(location)

    for (const booking of locationBookings) {
      const slotIds = parseSlotIds(booking.slot)
      const isCancelled = booking.status === 'cancelled'

      // If "all-day" is booked, treat all slots as booked
      if (slotIds.includes('all-day')) {
        const allSlotIds = locationSlots.map(s => s.id)
        bookedSlotIds.push(...allSlotIds)
        if (isCancelled) {
          cancelledSlotIds.push(...allSlotIds)
        }
      }
      else {
        bookedSlotIds.push(...slotIds)
        if (isCancelled) {
          cancelledSlotIds.push(...slotIds)
        }
      }
    }

    // Get unique slot IDs
    const uniqueBookedSlotIds = [...new Set(bookedSlotIds)]
    const uniqueCancelledSlotIds = [...new Set(cancelledSlotIds)]

    indicators.push({
      locationId,
      locationTitle: getLocationTitle(location),
      color: location.color || '#3b82f6',
      slots: parseLocationSlots(location),
      bookedSlotIds: uniqueBookedSlotIds,
      cancelledSlotIds: uniqueCancelledSlotIds,
      bookings: locationBookings,
    })
  }

  // Sort indicators by location index to ensure consistent ordering across days
  indicators.sort((a, b) => {
    const indexA = props.locations.findIndex(l => l.id === a.locationId)
    const indexB = props.locations.findIndex(l => l.id === b.locationId)
    return indexA - indexB
  })

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

// Check if a date is highlighted (for month view)
function isDayHighlighted(date: Date): boolean {
  if (!props.highlightedDate) return false
  return (
    date.getFullYear() === props.highlightedDate.getFullYear()
    && date.getMonth() === props.highlightedDate.getMonth()
    && date.getDate() === props.highlightedDate.getDate()
  )
}

// Check if we're in create mode
const isCreating = computed(() => props.creatingAtDate !== null)

// Check if a date is the creating date
function isCreatingDate(date: Date): boolean {
  if (!props.creatingAtDate) return false
  return (
    date.getFullYear() === props.creatingAtDate.getFullYear()
    && date.getMonth() === props.creatingAtDate.getMonth()
    && date.getDate() === props.creatingAtDate.getDate()
  )
}

// Compute max indicators across all days for uniform row height
const maxIndicatorCount = computed(() => {
  let max = 0
  for (const [, bookings] of bookingsByDate.value) {
    // Count unique locations for this date
    const locations = new Set(bookings.map(b => b.location))
    max = Math.max(max, locations.size)
  }
  return max
})

// Calculate cell height based on max indicators
// Base height: 20px (day number) + padding
// Each indicator row: ~10px
const monthCellHeight = computed(() => {
  const baseHeight = 24 // day number + top padding
  const indicatorHeight = 10 // per indicator row
  const bottomPadding = 4
  const minHeight = 40
  return Math.max(minHeight, baseHeight + (maxIndicatorCount.value * indicatorHeight) + bottomPadding)
})
</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- View toggle (Today | Week / Month) -->
    <div class="flex justify-end items-baseline gap-1">
      <UButton
        variant="ghost"
        color="neutral"
        size="lg"
        class="rounded-lg"
        :ui="{ base: 'text-xs' }"
        @click="goToToday"
      >
        Today
      </UButton>
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
      :creating-at-date="creatingAtDate"
      @hover="onWeekHover"
      @day-click="onWeekDayClick"
    >
      <template #day="{ jsDate }">
        <div class="flex flex-col gap-0.5 mt-1 min-h-[12px]">
          <template v-for="indicator in getIndicatorsForDate(jsDate)" :key="indicator.locationId">
            <CroutonBookingsSlotIndicator
              :slots="indicator.slots"
              :booked-slot-ids="indicator.bookedSlotIds"
              :cancelled-slot-ids="indicator.cancelledSlotIds"
              :bookings="indicator.bookings"
              :color="indicator.color"
              size="xs"
              @hover-booking="(id) => emit('hoverBooking', id)"
            />
          </template>
        </div>
      </template>
    </CroutonBookingsWeekStrip>

    <!-- Month View -->
    <div v-else class="w-full">
      <UCalendar
        v-model="monthFocusDate"
        size="sm"
        :week-starts-on="1"
        :ui="{
          root: 'w-full',
          body: 'p-1',
          grid: 'w-full',
          headCell: 'text-center text-xs',
          cell: 'w-full text-center p-0.5',
          cellTrigger: 'w-full h-full p-0 rounded-md data-[selected]:bg-transparent data-[selected]:text-inherit hover:bg-transparent focus:bg-transparent',
        }"
        class="[&_table]:w-full [&_table]:table-fixed"
      >
        <template #day="{ day }">
          <div
            class="group relative w-full flex flex-col items-center justify-start pt-1 pb-1 cursor-pointer rounded-md transition-all duration-200"
            :style="{ minHeight: `${monthCellHeight}px` }"
            :class="[
              isCreatingDate(day.toDate(getLocalTimeZone()))
                ? 'bg-elevated shadow-md'
                : isDayHighlighted(day.toDate(getLocalTimeZone()))
                  ? 'bg-elevated shadow-sm'
                  : 'hover:bg-elevated/80',
              hasBookings(day.toDate(getLocalTimeZone()))
                ? 'bg-muted/30'
                : '',
            ]"
            @click="emit('hover', day.toDate(getLocalTimeZone()))"
          >
            <!-- Day number -->
            <span
              class="text-xs font-medium transition-colors"
              :class="[
                isDayHighlighted(day.toDate(getLocalTimeZone()))
                  ? 'text-primary'
                  : hasBookings(day.toDate(getLocalTimeZone()))
                    ? 'text-default'
                    : 'text-muted',
              ]"
            >
              {{ day.day }}
            </span>

            <!-- Slot indicators (all locations) -->
            <div class="flex flex-col items-center gap-0.5 mt-0.5 w-full">
              <template v-for="indicator in getIndicatorsForDate(day.toDate(getLocalTimeZone()))" :key="indicator.locationId">
                <CroutonBookingsSlotIndicator
                  :slots="indicator.slots"
                  :booked-slot-ids="indicator.bookedSlotIds"
                  :cancelled-slot-ids="indicator.cancelledSlotIds"
                  :bookings="indicator.bookings"
                  :color="indicator.color"
                  size="xs"
                  @hover-booking="(id) => emit('hoverBooking', id)"
                />
              </template>
            </div>

            <!-- Add booking tab (slides down from under the date block on hover) -->
            <button
              v-if="!isCreatingDate(day.toDate(getLocalTimeZone()))"
              type="button"
              class="absolute bottom-0 left-0 right-0 translate-y-0 flex items-center justify-center h-4 bg-neutral-700 rounded-b-md opacity-0 cursor-pointer transition-all duration-200 ease-out group-hover:translate-y-1 group-hover:opacity-100 hover:bg-neutral-600 active:scale-[0.98] z-10"
              @click.stop="emit('dayClick', day.toDate(getLocalTimeZone()))"
            >
              <UIcon name="i-lucide-plus" class="size-2.5 text-neutral-300" />
            </button>
          </div>
        </template>
      </UCalendar>
    </div>
  </div>
</template>
