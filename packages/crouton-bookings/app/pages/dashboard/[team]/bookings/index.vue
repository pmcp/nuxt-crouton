<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
})

const toast = useToast()

// Fetch all data
const { bookings, settings, locations, loading, error } = useBookingsList()

// Hovered date (from calendar) - used to highlight bookings
const hoveredDate = ref<Date | null>(null)

// Filter state (status and location only - no date filter)
const filterState = ref({
  statuses: [] as string[],
  locations: [] as string[],
})

// Check if any filters are active
const hasActiveFilters = computed(() => {
  return filterState.value.statuses.length > 0 || filterState.value.locations.length > 0
})

// Apply filters to bookings
const filteredBookings = computed(() => {
  let result = bookings.value

  // Filter by status
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
  // TODO: scroll list to this date
}

// Handle calendar day click - open booking creation (placeholder)
function onCalendarDayClick(date: Date) {
  toast.add({
    title: 'Create Booking',
    description: `Booking creation for ${date.toLocaleDateString()} coming soon!`,
    icon: 'i-lucide-calendar-plus',
    color: 'info',
  })
}

// Check if a booking matches the hovered date
function isBookingHighlighted(bookingDate: string | Date): boolean {
  if (!hoveredDate.value) return false
  const bDate = new Date(bookingDate)
  return (
    bDate.getFullYear() === hoveredDate.value.getFullYear()
    && bDate.getMonth() === hoveredDate.value.getMonth()
    && bDate.getDate() === hoveredDate.value.getDate()
  )
}
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="My Bookings" />
    </template>

    <template #body>
      <div class="flex flex-col gap-4 h-full p-4">
        <!-- Calendar section -->
        <CroutonBookingsCalendar
          :bookings="bookings"
          :locations="locations"
          @hover="onCalendarHover"
          @day-click="onCalendarDayClick"
        />

        <!-- Filters section -->
        <CroutonBookingsFilters
          v-model="filterState"
          :settings="settings"
          :locations="locations"
        />

        <!-- List section -->
        <div class="flex-1 overflow-y-auto">
          <CroutonBookingsList
            :bookings="filteredBookings"
            :loading="loading"
            :error="error"
            :has-active-filters="hasActiveFilters"
            :highlighted-date="hoveredDate"
          />
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
