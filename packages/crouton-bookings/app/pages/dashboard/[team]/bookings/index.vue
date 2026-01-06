<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: 'auth',
})

// Fetch all data
const { bookings, settings, locations, loading, error } = useBookingsList()

// Calendar selection
const selectedDate = ref<Date | null>(null)

// Filter state
const filterState = ref({
  statuses: [] as string[],
  locations: [] as string[],
})

// Check if any filters are active
const hasActiveFilters = computed(() => {
  return (
    selectedDate.value !== null
    || filterState.value.statuses.length > 0
    || filterState.value.locations.length > 0
  )
})

// Apply filters to bookings
const filteredBookings = computed(() => {
  let result = bookings.value

  // Filter by date
  if (selectedDate.value) {
    const filterDate = selectedDate.value
    result = result.filter((booking) => {
      const bookingDate = new Date(booking.date)
      return (
        bookingDate.getFullYear() === filterDate.getFullYear()
        && bookingDate.getMonth() === filterDate.getMonth()
        && bookingDate.getDate() === filterDate.getDate()
      )
    })
  }

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

// Clear date filter
function clearDateFilter() {
  selectedDate.value = null
}

// Compute available statuses/locations based on date-filtered bookings
// (for disabling filter buttons that would return no results)
const dateFilteredBookings = computed(() => {
  if (!selectedDate.value) return bookings.value

  const filterDate = selectedDate.value
  return bookings.value.filter((booking) => {
    const bookingDate = new Date(booking.date)
    return (
      bookingDate.getFullYear() === filterDate.getFullYear()
      && bookingDate.getMonth() === filterDate.getMonth()
      && bookingDate.getDate() === filterDate.getDate()
    )
  })
})

const availableStatuses = computed(() => {
  return [...new Set(dateFilteredBookings.value.map(b => b.status))]
})

const availableLocations = computed(() => {
  return [...new Set(dateFilteredBookings.value.map(b => b.location))]
})
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
          v-model="selectedDate"
          :bookings="bookings"
          :locations="locations"
        />

        <!-- Selected date indicator -->
        <div v-if="selectedDate" class="flex items-center justify-between bg-primary/10 rounded-lg px-3 py-2">
          <span class="text-sm">
            Showing bookings for {{ selectedDate.toLocaleDateString() }}
          </span>
          <UButton
            variant="ghost"
            color="primary"
            size="xs"
            icon="i-lucide-x"
            @click="clearDateFilter"
          >
            Clear
          </UButton>
        </div>

        <!-- Filters section -->
        <CroutonBookingsFilters
          v-model="filterState"
          :settings="settings"
          :locations="locations"
          :available-statuses="selectedDate ? availableStatuses : undefined"
          :available-locations="selectedDate ? availableLocations : undefined"
        />

        <!-- List section -->
        <div class="flex-1 overflow-y-auto">
          <CroutonBookingsList
            :bookings="filteredBookings"
            :loading="loading"
            :error="error"
            :has-active-filters="hasActiveFilters"
          />
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
