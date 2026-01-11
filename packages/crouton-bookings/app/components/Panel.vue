<script setup lang="ts">
import type { Booking, LocationData, SettingsData } from '../types/booking'

interface FilterState {
  statuses: string[]
  locations: string[]
  showCancelled: boolean
}

interface Props {
  /**
   * Bookings data. If not provided, will fetch using useBookingsList.
   * Provide this when you want to manage data externally.
   */
  bookings?: Booking[]
  /** Locations data. Required if bookings prop is provided. */
  locations?: LocationData[]
  /** Settings data. Required if bookings prop is provided. */
  settings?: SettingsData | null
  /** Loading state. Only used when bookings prop is provided. */
  loading?: boolean
  /** Error state. Only used when bookings prop is provided. */
  error?: Error | null
  /** Initial filter state */
  initialFilters?: Partial<FilterState>
  /** Title shown in the header. Set to empty string to hide header. */
  title?: string
  /** Empty state message when no bookings */
  emptyMessage?: string
}

const props = withDefaults(defineProps<Props>(), {
  bookings: undefined,
  locations: undefined,
  settings: undefined,
  loading: false,
  error: undefined,
  initialFilters: () => ({}),
  title: 'My Bookings',
  emptyMessage: 'Your bookings will appear here',
})

const emit = defineEmits<{
  /** Emitted when a booking is created */
  created: []
  /** Emitted when filters change */
  'update:filters': [filters: FilterState]
}>()

// Determine if we're using internal data fetching
const useInternalData = props.bookings === undefined

// Internal data fetching (only used when bookings prop not provided)
const internalData = useInternalData ? useBookingsList() : null

// Resolved data - use props if provided, otherwise use internal data
const resolvedBookings = computed(() => {
  return props.bookings ?? internalData?.bookings.value ?? []
})

const resolvedLocations = computed(() => {
  return props.locations ?? internalData?.locations.value ?? []
})

const resolvedSettings = computed(() => {
  return props.settings ?? internalData?.settings.value ?? null
})

const resolvedLoading = computed(() => {
  if (useInternalData) {
    return internalData?.loading.value ?? false
  }
  return props.loading
})

const resolvedError = computed(() => {
  if (useInternalData) {
    return internalData?.error.value ?? null
  }
  return props.error ?? null
})

// Refresh function (only available with internal data)
async function refresh() {
  if (internalData) {
    await internalData.refresh()
  }
}

// Ref for Calendar control (to sync with list scroll)
const calendarRef = ref<{ goToDate: (date: Date) => void } | null>(null)

// Hovered date (from calendar OR list) - used to highlight bookings/calendar days
const hoveredDate = ref<Date | null>(null)

// Filter state (status, location and showCancelled toggle)
const filterState = ref<FilterState>({
  statuses: props.initialFilters.statuses ?? [],
  locations: props.initialFilters.locations ?? [],
  showCancelled: props.initialFilters.showCancelled ?? false,
})

// Emit filter changes
watch(filterState, (newFilters) => {
  emit('update:filters', { ...newFilters })
}, { deep: true })

// Inline creation state - date where we're creating a booking
const creatingAtDate = ref<Date | null>(null)

// Scroll to date - triggers scroll after booking creation
const scrollToDate = ref<Date | null>(null)

// Check if any filters are active
const hasActiveFilters = computed(() => {
  return filterState.value.statuses.length > 0
    || filterState.value.locations.length > 0
    || filterState.value.showCancelled
})

// Apply filters to bookings
const filteredBookings = computed(() => {
  let result = resolvedBookings.value

  // Filter cancelled bookings based on toggle
  // By default (showCancelled = false), hide cancelled bookings
  if (!filterState.value.showCancelled) {
    result = result.filter(booking => booking.status !== 'cancelled')
  }

  // Filter by specific statuses if provided
  if (filterState.value.statuses.length > 0) {
    result = result.filter(booking =>
      filterState.value.statuses.includes(booking.status),
    )
  }

  // Filter by location
  if (filterState.value.locations.length > 0) {
    result = result.filter(booking =>
      filterState.value.locations.includes(booking.location),
    )
  }

  return result
})

// Handle calendar hover - scroll to date and highlight
function onCalendarHover(date: Date | null) {
  hoveredDate.value = date
}

// Handle calendar day click - start inline creation at that date
function onCalendarDayClick(date: Date) {
  creatingAtDate.value = date
}

// Handle booking created - refresh the list and scroll to new booking
async function onBookingCreated() {
  // Store the date before clearing
  const dateToScrollTo = creatingAtDate.value
  creatingAtDate.value = null

  // Refresh to get the new booking
  await refresh()

  // Scroll to the newly created booking
  if (dateToScrollTo) {
    scrollToDate.value = dateToScrollTo
  }

  emit('created')
}

// Handle cancel creation
function onCancelCreate() {
  creatingAtDate.value = null
}

// Handle list scroll - sync calendar to top visible date (week changes)
function onTopVisibleDateChange(date: Date) {
  calendarRef.value?.goToDate(date)
}

// Handle click on booking date - navigate calendar and highlight
function onDateClick(date: Date) {
  calendarRef.value?.goToDate(date)
  hoveredDate.value = date
}

// Expose methods for external control
defineExpose({
  refresh,
  goToDate: (date: Date) => calendarRef.value?.goToDate(date),
})
</script>

<template>
  <div class="flex flex-col gap-4 h-full">
    <!-- Calendar section with integrated filters -->
    <CroutonBookingsCalendar
      ref="calendarRef"
      v-model:filters="filterState"
      :bookings="resolvedBookings"
      :locations="resolvedLocations"
      :settings="resolvedSettings"
      :highlighted-date="hoveredDate"
      :creating-at-date="creatingAtDate"
      @hover="onCalendarHover"
      @day-click="onCalendarDayClick"
    />

    <!-- List section -->
    <div class="flex-1 overflow-y-auto">
      <CroutonBookingsList
        :bookings="filteredBookings"
        :loading="resolvedLoading"
        :error="resolvedError"
        :has-active-filters="hasActiveFilters"
        :highlighted-date="hoveredDate"
        :creating-at-date="creatingAtDate"
        :scroll-to-date="scrollToDate"
        :active-location-filter="filterState.locations"
        :empty-message="emptyMessage"
        @created="onBookingCreated"
        @cancel-create="onCancelCreate"
        @top-visible-date-change="onTopVisibleDateChange"
        @date-click="onDateClick"
      />
    </div>
  </div>
</template>
