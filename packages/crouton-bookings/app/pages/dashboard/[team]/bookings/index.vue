<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
})

// Fetch all data
const { bookings, settings, locations, loading, error, refresh } = useBookingsList()

// Hovered date (from calendar) - used to highlight bookings
const hoveredDate = ref<Date | null>(null)

// Filter state (status, location and showCancelled toggle)
const filterState = ref({
  statuses: [] as string[],
  locations: [] as string[],
  showCancelled: false,
})

// Inline creation state - date where we're creating a booking
const creatingAtDate = ref<Date | null>(null)

// Scroll to date - triggers scroll after booking creation
const scrollToDate = ref<Date | null>(null)

// Check if any filters are active
const hasActiveFilters = computed(() => {
  return filterState.value.statuses.length > 0 || filterState.value.locations.length > 0 || filterState.value.showCancelled
})

// Apply filters to bookings
const filteredBookings = computed(() => {
  let result = bookings.value

  // Filter cancelled bookings based on toggle
  // By default (showCancelled = false), hide cancelled bookings
  if (!filterState.value.showCancelled) {
    result = result.filter(booking => booking.status !== 'cancelled')
  }

  // Legacy: Filter by specific statuses if provided (for backward compatibility)
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
}

// Handle cancel creation
function onCancelCreate() {
  creatingAtDate.value = null
}
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="My Bookings" />
    </template>

    <template #body>
      <div class="flex flex-col gap-4 h-full p-4">
        <!-- Calendar section with integrated filters -->
        <CroutonBookingsCalendar
          v-model:filters="filterState"
          :bookings="bookings"
          :locations="locations"
          :settings="settings"
          @hover="onCalendarHover"
          @day-click="onCalendarDayClick"
        />

        <!-- List section -->
        <div class="flex-1 overflow-y-auto">
          <CroutonBookingsList
            :bookings="filteredBookings"
            :loading="loading"
            :error="error"
            :has-active-filters="hasActiveFilters"
            :highlighted-date="hoveredDate"
            :creating-at-date="creatingAtDate"
            :scroll-to-date="scrollToDate"
            @created="onBookingCreated"
            @cancel-create="onCancelCreate"
          />
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
