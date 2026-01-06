import type { Booking } from '../types/booking'

/**
 * Composable for managing booking filters
 * Provides reactive filter state and filter functions
 */
export function useBookingFilters() {
  // Filter state
  const selectedDate = ref<Date | null>(null)
  const selectedStatuses = ref<string[]>([]) // empty = all
  const selectedLocations = ref<string[]>([]) // empty = all

  // Check if any filters are active
  const hasActiveFilters = computed(() => {
    return (
      selectedDate.value !== null
      || selectedStatuses.value.length > 0
      || selectedLocations.value.length > 0
    )
  })

  /**
   * Check if a booking matches the selected date
   */
  function matchesDate(booking: Booking): boolean {
    if (!selectedDate.value) return true

    const bookingDate = new Date(booking.date)
    const filterDate = selectedDate.value

    return (
      bookingDate.getFullYear() === filterDate.getFullYear()
      && bookingDate.getMonth() === filterDate.getMonth()
      && bookingDate.getDate() === filterDate.getDate()
    )
  }

  /**
   * Check if a booking matches selected statuses
   */
  function matchesStatus(booking: Booking): boolean {
    if (selectedStatuses.value.length === 0) return true
    return selectedStatuses.value.includes(booking.status)
  }

  /**
   * Check if a booking matches selected locations
   */
  function matchesLocation(booking: Booking): boolean {
    if (selectedLocations.value.length === 0) return true
    return selectedLocations.value.includes(booking.location)
  }

  /**
   * Filter bookings based on current filter state
   */
  function filterBookings(bookings: Booking[]): Booking[] {
    return bookings.filter((booking) => {
      return matchesDate(booking) && matchesStatus(booking) && matchesLocation(booking)
    })
  }

  /**
   * Clear all filters
   */
  function clearFilters() {
    selectedDate.value = null
    selectedStatuses.value = []
    selectedLocations.value = []
  }

  /**
   * Toggle a status in the filter
   */
  function toggleStatus(statusId: string) {
    const index = selectedStatuses.value.indexOf(statusId)
    if (index === -1) {
      selectedStatuses.value.push(statusId)
    }
    else {
      selectedStatuses.value.splice(index, 1)
    }
  }

  /**
   * Toggle a location in the filter
   */
  function toggleLocation(locationId: string) {
    const index = selectedLocations.value.indexOf(locationId)
    if (index === -1) {
      selectedLocations.value.push(locationId)
    }
    else {
      selectedLocations.value.splice(index, 1)
    }
  }

  /**
   * Set the selected date
   */
  function setDate(date: Date | null) {
    selectedDate.value = date
  }

  return {
    // State
    selectedDate,
    selectedStatuses,
    selectedLocations,
    hasActiveFilters,

    // Filter functions
    filterBookings,
    matchesDate,
    matchesStatus,
    matchesLocation,

    // Actions
    clearFilters,
    toggleStatus,
    toggleLocation,
    setDate,
  }
}
